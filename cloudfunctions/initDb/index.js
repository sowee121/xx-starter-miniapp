const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 业务集合清单；initDb 负责按需创建，缺一个会导致对应功能静默失败 */
const COLLECTIONS = ['users', 'star_logs', 'progress', 'task_logs', 'reward_logs', 'daily_tasks']

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

/** 清空集合全部文档（保留集合结构）。会删除所有用户数据，仅开发期清脏数据用。 */
async function emptyCollection(name) {
  const col = db.collection(name)
  let removed = 0
  for (;;) {
    const res = await col
      .where({ _id: _.exists(true) })
      .limit(1000)
      .remove()
    removed += (res.stats && res.stats.removed) || 0
    if (!res.stats || res.stats.removed < 1000) break
  }
  return { name, removed }
}

/** 云函数入口 */
exports.main = async (event) => {
  // mode=reset：清空上述集合的全部文档，用于清掉「同 openid 多文档」等脏数据
  if (event && event.mode === 'reset') {
    const results = []
    for (const name of COLLECTIONS) {
      results.push(await emptyCollection(name))
    }
    return { ok: true, mode: 'reset', results }
  }
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
