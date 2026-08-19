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

async function getOrCreateUser(openid) {
  const col = db.collection('users')
  const found = await col.where({ _openid: openid }).limit(1).get()
  if (found.data[0]) return found.data[0]
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await col.add({ data: doc })
  return { ...doc, _id: added._id }
}

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
    const user = await getOrCreateUser(OPENID)
    return {
      ok: true,
      duplicated: true,
      stars: (user.stars || 0),
    }
  }

  const user = await getOrCreateUser(OPENID)
  await db.collection('users').doc(user._id).update({
    data: {
      stars: _.inc(delta),
      updatedAt: Date.now(),
    },
  })

  const after = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
  return {
    ok: true,
    duplicated: false,
    stars: (after.data[0] && after.data[0].stars) || (user.stars || 0) + delta,
  }
}
