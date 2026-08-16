const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    await col.add({
      data: {
        module: moduleName,
        itemId,
        done: true,
        updatedAt: Date.now(),
      },
    })
  }
  return { ok: true }
}
