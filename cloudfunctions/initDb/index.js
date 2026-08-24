const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const COLLECTIONS = ['users', 'star_logs', 'progress', 'task_logs', 'reward_logs']

/** 确保集合存在 */
async function ensureCollection(name) {
  try {
    await db.createCollection(name)
    return { name, status: 'created' }
  } catch (error) {
    const msg = (error && (error.errMsg || error.message)) || String(error)
    // 已存在视为成功
    if (/already exist|exist|RESOURCE_EXIST|CollectionExist/i.test(msg)) {
      return { name, status: 'exists' }
    }
    return { name, status: 'error', error: msg }
  }
}

/** 云函数入口 */
exports.main = async () => {
  const results = []
  for (const name of COLLECTIONS) {
    results.push(await ensureCollection(name))
  }
  const failed = results.filter((item) => item.status === 'error')
  return {
    ok: failed.length === 0,
    results,
  }
}
