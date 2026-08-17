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

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (error) {
    // 已存在则忽略
  }
}

async function ensureUser(openid) {
  await ensureCollection('users')
  const users = db.collection('users')
  const found = await users.where({ _openid: openid }).limit(1).get()
  if (found.data[0]) return found.data[0]
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    updatedAt: Date.now(),
  }
  const added = await users.add({ data: doc })
  return { ...doc, _id: added._id, _openid: openid }
}

async function readStars(openid, fallback) {
  const users = await db.collection('users').where({ _openid: openid }).limit(1).get()
  const stars = users.data[0] && users.data[0].stars
  return typeof stars === 'number' ? stars : fallback
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

  await ensureCollection('star_logs')
  const user = await ensureUser(OPENID)

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
    return {
      ok: true,
      duplicated: true,
      stars: await readStars(OPENID, user.stars || 0),
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

  return {
    ok: true,
    duplicated: false,
    stars: await readStars(OPENID, (user.stars || 0) + delta),
  }
}
