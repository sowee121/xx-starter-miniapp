const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const taskId = event.taskId
  if (!taskId) return { ok: false, error: 'invalid_params' }

  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const col = db.collection('task_logs')
  const found = await col.where({ _openid: OPENID, date }).limit(1).get()
  const doc = found.data[0]
  const tasks = (doc && doc.tasks) || []
  if (tasks.some((t) => t.taskId === taskId && t.completed)) {
    return { ok: true, duplicated: true }
  }

  tasks.push({ taskId, completed: true })
  if (doc) {
    await col.doc(doc._id).update({
      data: { tasks, updatedAt: Date.now() },
    })
  } else {
    // 云函数的 add 不会自动注入 _openid，漏写会导致每次打卡都新建一条
    await col.add({
      data: { _openid: OPENID, date, tasks, starsEarned: 0, updatedAt: Date.now() },
    })
  }
  return { ok: true, duplicated: false, date }
}
