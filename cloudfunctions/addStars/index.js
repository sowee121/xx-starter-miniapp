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

/** 客户端 makeClientId 为 `${Date.now()}-xxxx`，13 位毫秒时间戳。 */
function clientIssuedAt(clientId) {
  const n = Number(String(clientId || '').split('-')[0])
  return Number.isFinite(n) && n > 1e11 ? n : 0
}

async function getOrCreateUser(openid) {
  const col = db.collection('users')
  const found = await col.where({ _openid: openid }).limit(1).get()
  if (found.data[0]) return found.data[0]
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await col.add({ data: doc })
  return { ...doc, _id: added._id }
}

async function readStars(openid, fallback) {
  const after = await db.collection('users').where({ _openid: openid }).limit(1).get()
  return (after.data[0] && after.data[0].stars) || fallback || 0
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const delta = Number(event.delta) || 0
  const reason = event.reason
  const ref = event.ref || ''
  const clientId = event.clientId

  if (!clientId || !REASONS.has(reason) || delta <= 0 || delta > 5) {
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
