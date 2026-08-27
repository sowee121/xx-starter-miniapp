const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const KEEP_MONTHS = 12

/** 丢掉一年前的格子 */
function prune(days) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - KEEP_MONTHS)
  const month = String(cutoff.getMonth() + 1).padStart(2, '0')
  const day = String(cutoff.getDate()).padStart(2, '0')
  const minKey = `${cutoff.getFullYear()}-${month}-${day}`
  Object.keys(days).forEach((key) => {
    if (key < minKey) delete days[key]
  })
}

/** 读取或创建用户 */
async function getOrCreateUser(openid) {
  const col = db.collection('users')
  const found = await col.where({ _openid: openid }).limit(1).get()
  if (found.data[0]) return found.data[0]
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    heatDays: {},
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await col.add({ data: doc })
  return { ...doc, _id: added._id }
}

/** 用本机累计覆盖云端同日（只增不减），换机后格子还在。 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const day = event && event.day
  const count = Number(event && event.count)
  if (!DAY_RE.test(day) || !Number.isFinite(count) || count < 0 || count > 99) {
    return { ok: false, error: 'invalid_params' }
  }

  const user = await getOrCreateUser(OPENID)
  const heatDays = Object.assign({}, user.heatDays || {})
  heatDays[day] = Math.max(heatDays[day] || 0, Math.floor(count))
  prune(heatDays)
  await db.collection('users').doc(user._id).update({
    data: { heatDays, updatedAt: Date.now() },
  })
  return { ok: true, heatDays }
}
