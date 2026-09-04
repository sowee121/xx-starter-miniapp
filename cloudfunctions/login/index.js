const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 建档时确保存在的集合；login 是首个入口，顺带兜住未跑过 initDb 的环境 */
const COLLECTIONS = ['users', 'star_logs', 'progress', 'task_logs', 'reward_logs', 'daily_tasks']

/** 确保云库集合存在 */
async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
    } catch (error) {
      // 已存在则忽略
    }
  }
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

/** 云函数入口 */
exports.main = async () => {
  await ensureCollections()
  const { OPENID } = cloud.getWXContext()
  const profile = await getOrCreateUser(OPENID)
  const now = new Date()
  const serverDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return {
    ok: true,
    profile,
    serverDate,
    weekday: now.getDay(),
  }
}
