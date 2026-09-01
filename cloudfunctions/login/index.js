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
