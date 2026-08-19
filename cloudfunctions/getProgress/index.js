const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 拉取当前用户学习进度。
 * event.module 可选，传入则只返回该模块。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const moduleName = event && event.module
  const col = db.collection('progress')
  const where = moduleName
    ? { _openid: OPENID, module: moduleName, done: true }
    : { _openid: OPENID, done: true }

  const items = []
  let skip = 0
  const MAX = 500
  while (items.length < MAX) {
    const batch = await col.where(where).skip(skip).limit(100).get()
    if (!batch.data.length) break
    for (const doc of batch.data) {
      items.push({
        module: doc.module,
        itemId: doc.itemId,
        done: !!doc.done,
      })
    }
    if (batch.data.length < 100) break
    skip += 100
  }

  return { ok: true, items }
}
