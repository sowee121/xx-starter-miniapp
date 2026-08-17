const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const COLLECTIONS = ['users', 'star_logs', 'progress', 'task_logs', 'reward_logs']

async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
    } catch (error) {
      // 已存在则忽略
    }
  }
}

exports.main = async () => {
  await ensureCollections()
  const { OPENID } = cloud.getWXContext()
  const users = db.collection('users')
  const found = await users.where({ _openid: OPENID }).limit(1).get()
  let profile = found.data[0]
  if (!profile) {
    const doc = {
      stars: 0,
      stickers: [],
      badges: [],
      updatedAt: Date.now(),
    }
    await users.add({ data: doc })
    profile = { ...doc, _openid: OPENID }
  }
  const now = new Date()
  const serverDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return {
    ok: true,
    profile,
    serverDate,
    weekday: now.getDay(),
  }
}
