const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/** 云函数入口 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const moduleName = event.module
  const itemId = event.itemId
  if (!moduleName || !itemId) return { ok: false, error: 'invalid_params' }

  const col = db.collection('progress')
  const found = await col
    .where({ _openid: OPENID, module: moduleName, itemId })
    .limit(1)
    .get()

  if (found.data[0]) {
    await col.doc(found.data[0]._id).update({
      data: { done: true, updatedAt: Date.now() },
    })
  } else {
    // 云函数的 add 不会自动注入 _openid，必须显式写入，否则后续按 _openid 查不到
    await col.add({
      data: {
        _openid: OPENID,
        module: moduleName,
        itemId,
        done: true,
        updatedAt: Date.now(),
      },
    })
  }
  return { ok: true }
}
