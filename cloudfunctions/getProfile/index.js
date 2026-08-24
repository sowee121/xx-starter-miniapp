const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/** 确保 users 集合 */
async function ensureUsers() {
  try {
    await db.createCollection('users')
  } catch (error) {
    // 已存在则忽略
  }
}

/** 读取或创建用户 */
async function getOrCreateUser(openid) {
  const users = db.collection('users')
  const found = await users.where({ _openid: openid }).limit(1).get()
  if (found.data[0]) return found.data[0]
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await users.add({ data: doc })
  return { ...doc, _id: added._id }
}

/** 云函数入口 */
exports.main = async () => {
  await ensureUsers()
  const { OPENID } = cloud.getWXContext()
  const profile = await getOrCreateUser(OPENID)
  const now = new Date()
  const serverDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return {
    ok: true,
    profile,
    serverDate,
    weekday: now.getDay(),
    todayTasks: [],
  }
}
