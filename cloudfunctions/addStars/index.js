const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const REASONS = new Set([
  'answer_ok',
  'poem_done',
  'char_done',
  'word_done',
  'game_clear',
  'task_done',
  'daily_task',
  'math',
  'sport_done',
  'calendar_done',
])

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const delta = Number(event.delta) || 0
  const reason = event.reason
  const ref = event.ref || ''
  const clientId = event.clientId

  if (!clientId || !REASONS.has(reason) || delta <= 0 || delta > 5) {
    return { ok: false, error: 'invalid_params' }
  }

  try {
    await db.collection('star_logs').add({
      data: {
        _id: clientId,
        _openid: OPENID,
        delta,
        reason,
        ref,
        createdAt: Date.now(),
      },
    })
  } catch (e) {
    const users = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
    return {
      ok: true,
      duplicated: true,
      stars: (users.data[0] && users.data[0].stars) || 0,
    }
  }

  await db
    .collection('users')
    .where({ _openid: OPENID })
    .update({
      data: {
        stars: _.inc(delta),
        updatedAt: Date.now(),
      },
    })

  const users = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
  return {
    ok: true,
    duplicated: false,
    stars: (users.data[0] && users.data[0].stars) || 0,
  }
}
