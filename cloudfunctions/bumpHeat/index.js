const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 日期键格式校验，挡住非 YYYY-MM-DD 的脏数据 */
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
/** 热力保留窗口（月），与小程序端 utils/activity.js 的 KEEP_MONTHS 必须一致 */
const KEEP_MONTHS = 12

/** 丢掉一年前的格子 */
function prune(days) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - KEEP_MONTHS)
  const month = String(cutoff.getMonth() + 1).padStart(2, '0')
  const day = String(cutoff.getDate()).padStart(2, '0')
  const minKey = `${cutoff.getFullYear()}-${month}-${day}`
  Object.keys(days).forEach((key) => {
    if (key < minKey) delete days[key]
  })
}

/** 读取或创建用户（幂等：同 openid 多条则保留首条、删其余） */
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

/** 用本机累计覆盖云端同日（只增不减），换机后格子还在。 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const day = event && event.day
  const count = Number(event && event.count)
  const since = Number(event && event.since) || 0
  if (!DAY_RE.test(day) || !Number.isFinite(count) || count < 0 || count > 99) {
    return { ok: false, error: 'invalid_params' }
  }

  const user = await getOrCreateUser(OPENID)
  // 家长复位热区后，复位前发起的旧写入直接丢弃，防止旧热力复活
  const resetAt = Number(user.heatResetAt) || 0
  if (since < resetAt) {
    return { ok: true, heatDays: Object.assign({}, user.heatDays || {}), stale: true }
  }
  const heatDays = Object.assign({}, user.heatDays || {})
  heatDays[day] = Math.max(heatDays[day] || 0, Math.floor(count))
  prune(heatDays)
  // 用 where + _.set 覆盖同 openid 的全部文档：
  // 竞态下短暂存在多条时，doc(user._id) 只更新一条，另一条会残留旧热力。
  await db
    .collection('users')
    .where({ _openid: OPENID })
    .update({
      data: { heatDays: _.set(heatDays), updatedAt: Date.now() },
    })
  return { ok: true, heatDays }
}
