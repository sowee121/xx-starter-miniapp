const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 确保 users 集合 */
async function ensureUsers() {
  try {
    await db.createCollection('users')
  } catch (error) {
    // 已存在则忽略
  }
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
