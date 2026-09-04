const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 业务集合清单；initDb 负责按需创建，缺一个会导致对应功能静默失败 */
const COLLECTIONS = ['users', 'star_logs', 'progress', 'task_logs', 'reward_logs', 'daily_tasks']

/** 全局元信息集合：存 initDb reset 写入的重置纪元（见 dailyTasks 的 readResetAt） */
const META_COLLECTION = 'app_meta'

/** 可执行建集合/清空操作的管理员 openid 白名单（代码即配置，随部署生效）。
 *  首次部署后，用自己的微信在模拟器/真机登录，调 { mode: 'whoami' } 拿到 openid，
 *  填入此数组后再重新部署即完成 owner 锁定；
 *  非白名单调用一律返回 forbidden，不执行任何建表/清空。
 *  'test-openid' 是本地单测 mock 身份（scripts/test_cloudfunctions.js），勿删。 */
const OWNER_OPENIDS = ['test-openid', 'o44J63f8CangaDFy9akylyNFKVTU']

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
  const { OPENID } = cloud.getWXContext()
  // whoami 仅回显调用者自己的 openid（本小程序内唯一标识），无任何副作用，
  // 用于引导开发者把自身 openid 填入 OWNER_OPENIDS 完成 owner 锁定
  if (event && event.mode === 'whoami') {
    return { ok: true, openid: OPENID || '' }
  }
  // 建集合/清空破坏面大，只放行白名单内开发者；未匹配（含未取到身份）一律拒绝
  if (!OWNER_OPENIDS.includes(OPENID)) {
    return { ok: false, error: 'forbidden' }
  }
  // mode=reset：清空上述集合的全部文档，用于清掉「同 openid 多文档」等脏数据；
  // 随后写全局重置纪元，客户端每日任务检测到本地早于纪元即整份作废，防清库后本地回写复活
  if (event && event.mode === 'reset') {
    const results = []
    for (const name of COLLECTIONS) {
      results.push(await emptyCollection(name))
    }
    await ensureCollection(META_COLLECTION)
    await db
      .collection(META_COLLECTION)
      .doc('reset')
      .set({ data: { resetAt: Date.now() } })
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
