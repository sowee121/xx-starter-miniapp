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

/** 多条同 openid 文档（并发「先查后插」残留）：把分散字段并入首条后再删除。
 *  stars 相加——每笔 delta 由 star_logs 的 clientId 幂等只 cred 一次，档间余额不重叠；
 *  stickers/badges 并集去重；heatDays 逐日取最大；starsResetAt/heatResetAt/updatedAt 取最新。
 *  返回合并后的主档，调用方后续读写都应以它为准。 */
async function mergeStaleUsers(col, primary, stale) {
  let stars = Number(primary.stars) || 0
  const stickers = [...(primary.stickers || [])]
  const badges = [...(primary.badges || [])]
  const heatDays = { ...(primary.heatDays || {}) }
  let starsResetAt = Number(primary.starsResetAt) || 0
  let heatResetAt = Number(primary.heatResetAt) || 0
  let updatedAt = Number(primary.updatedAt) || 0
  for (const item of stale) {
    stars += Number(item.stars) || 0
    for (const s of item.stickers || []) {
      if (!stickers.includes(s)) stickers.push(s)
    }
    for (const b of item.badges || []) {
      if (!badges.includes(b)) badges.push(b)
    }
    for (const key of Object.keys(item.heatDays || {})) {
      heatDays[key] = Math.max(heatDays[key] || 0, Number(item.heatDays[key]) || 0)
    }
    starsResetAt = Math.max(starsResetAt, Number(item.starsResetAt) || 0)
    heatResetAt = Math.max(heatResetAt, Number(item.heatResetAt) || 0)
    updatedAt = Math.max(updatedAt, Number(item.updatedAt) || 0)
  }
  // heatDays / resetAt 用 _.set 整包覆盖，避免空对象被云端 update 忽略导致残留
  const patch = { stars, stickers, badges, heatDays: _.set(heatDays), updatedAt }
  if (starsResetAt) patch.starsResetAt = _.set(starsResetAt)
  if (heatResetAt) patch.heatResetAt = _.set(heatResetAt)
  await col.doc(primary._id).update({ data: patch })
  await col.where({ _id: _.in(stale.map((item) => item._id)) }).remove()
  return { ...primary, stars, stickers, badges, heatDays, starsResetAt, heatResetAt, updatedAt }
}

/** 读取或创建用户（幂等：同 openid 多条则先合并字段再删多余档） */
async function getOrCreateUser(openid) {
  const col = db.collection('users')
  const found = await col.where({ _openid: openid }).limit(10).get()
  const user = found.data[0]
  if (user) {
    if (found.data.length > 1) {
      return mergeStaleUsers(col, user, found.data.slice(1))
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
