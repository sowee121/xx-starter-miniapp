const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const REASONS = new Set([
  'answer_ok',
  'poem_done',
  'char_done',
  'word_done',
  'letter_done',
  'pinyin_done',
  'game_clear',
  'task_done',
  'daily_task',
  'math',
  'sport_done',
  'calendar_done',
])

/** 单次加星上限：拼音每日任务最多 6 个韵母，奖励 = 数量。 */
const MAX_DELTA = 6

/**
 * 客户端 makeClientId 为 `${Date.now()}-xxxx`。
 * 每日任务用 `daily-{发起时间戳}-{日期}-{taskId}`，携带真实发起时刻：
 * 清星标记 starsResetAt 只作废「清零前发出的在途请求」，清零后新完成的
 * 打卡/任务奖励照常发放（旧格式 daily-YYYY-MM-DD-taskId 取当天 0 点，
 * 会把清零当天的新奖励误吞，已弃用，仅对在途旧请求兜底过期判定）。
 */
function clientIssuedAt(clientId) {
  const s = String(clientId || '')
  const n = Number(s.split('-')[0])
  if (Number.isFinite(n) && n > 1e11) return n
  const dailyTime = /^daily-(\d{13})-/.exec(s)
  if (dailyTime) return Number(dailyTime[1])
  const m = /^daily-(\d{4}-\d{2}-\d{2})(?:-|$)/.exec(s)
  if (!m) return 0
  const t = Date.parse(`${m[1]}T00:00:00`)
  return Number.isFinite(t) ? t : 0
}

/**
 * 读取或创建用户。
 * 幂等：同 openid 若存在多条（并发「先查后插」竞态会产生），
 * 保留第一条并删除其余，避免积分/热力各写一条、getProfile 读到残留旧值。
 */
async function getOrCreateUser(openid) {
  const col = db.collection('users')
  const found = await col.where({ _openid: openid }).limit(10).get()
  const user = found.data[0]
  if (user) {
    if (found.data.length > 1) {
      const staleIds = found.data.slice(1).map((item) => item._id)
      await col.where({ _id: _.in(staleIds) }).remove()
    }
    return user
  }
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    heatDays: {},
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await col.add({ data: doc })
  return { ...doc, _id: added._id }
}

/** 读取用户星星 */
async function readStars(openid, fallback) {
  const after = await db.collection('users').where({ _openid: openid }).limit(1).get()
  return (after.data[0] && after.data[0].stars) || fallback || 0
}

/** 云函数入口 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const delta = Number(event.delta) || 0
  const reason = event.reason
  const ref = event.ref || ''
  const clientId = event.clientId

  if (!clientId || !REASONS.has(reason) || delta <= 0 || delta > MAX_DELTA) {
    return { ok: false, error: 'invalid_params' }
  }

  const user = await getOrCreateUser(OPENID)
  const resetAt = Number(user.starsResetAt) || 0
  const issuedAt = clientIssuedAt(clientId)
  if (resetAt && issuedAt && issuedAt < resetAt) {
    return {
      ok: true,
      duplicated: true,
      stale: true,
      stars: user.stars || 0,
    }
  }

  try {
    await db.collection('star_logs').add({
      data: {
        _id: clientId,
        _openid: OPENID,
        delta,
        reason,
        ref,
        credited: false,
        createdAt: Date.now(),
      },
    })
  } catch (error) {
    // 已有流水：下面认领 credited，避免「流水在、余额没加上」被当成重复丢掉
  }

  const claim = await db.collection('star_logs').where({
    _id: clientId,
    _openid: OPENID,
    credited: false,
  }).update({
    data: { credited: true },
  })
  const claimed = !!(claim.stats && claim.stats.updated)

  if (claimed) {
    await db.collection('users').doc(user._id).update({
      data: {
        stars: _.inc(delta),
        updatedAt: Date.now(),
      },
    })
  }

  return {
    ok: true,
    duplicated: !claimed,
    stars: await readStars(OPENID, (user.stars || 0) + (claimed ? delta : 0)),
  }
}
