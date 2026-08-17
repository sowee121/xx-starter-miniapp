const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function ensureUsers() {
  try {
    await db.createCollection('users')
  } catch (error) {
    // 已存在则忽略
  }
}

exports.main = async () => {
  await ensureUsers()
  const { OPENID } = cloud.getWXContext()
  const found = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
  const profile = found.data[0] || { stars: 0, stickers: [], badges: [] }
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
