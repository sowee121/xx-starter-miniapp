const cloud = require('./cloud')
const retryQueue = require('./retry-queue')

const STORAGE_KEY = 'local_stars'

function makeClientId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}-${rand}`
}

function readStoredStars() {
  try {
    const stars = wx.getStorageSync(STORAGE_KEY)
    return typeof stars === 'number' ? stars : 0
  } catch (error) {
    return 0
  }
}

/**
 * 云端未建档时 addStars 会返回 0；不能用它覆盖本地已加的星。
 * duplicated 时不再本地累加，但仍取 local 与 remote 的较大值。
 */
function pickStars(local, remote, { added = 0, duplicated = false } = {}) {
  const before = typeof local === 'number' ? local : 0
  const optimistic = before + (duplicated ? 0 : added)
  const cloudValue = typeof remote === 'number' ? remote : optimistic
  return Math.max(optimistic, cloudValue)
}

function getLocalStars() {
  const app = getApp()
  const profile = (app && app.globalData && app.globalData.profile) || {}
  const memory = typeof profile.stars === 'number' ? profile.stars : 0
  return Math.max(memory, readStoredStars())
}

function setLocalStars(stars) {
  const app = getApp()
  if (app && app.globalData) {
    if (!app.globalData.profile) {
      app.globalData.profile = { stars: 0, stickers: [], badges: [] }
    }
    app.globalData.profile.stars = stars
  }
  try {
    wx.setStorageSync(STORAGE_KEY, stars)
  } catch (error) {
    // 存储空间不可用时仍保留本次会话中的积分。
  }
}

async function refreshProfile() {
  const { ok, data } = await cloud.call('getProfile')
  if (!ok || !data) return getLocalStars()
  const profile = data.profile || data
  const remote = profile && typeof profile.stars === 'number' ? profile.stars : 0
  const next = Math.max(getLocalStars(), remote)
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.profile = Object.assign({}, profile, { stars: next })
  }
  setLocalStars(next)
  return next
}

async function addStars({ delta, reason, ref, clientId, retry }) {
  const id = clientId || makeClientId()
  const payload = { delta, reason, ref, clientId: id }
  const before = getLocalStars()
  const { ok, data } = await cloud.call('addStars', payload)
  if (!ok) {
    if (!retry) {
      const stars = pickStars(before, null, { added: delta })
      setLocalStars(stars)
      retryQueue.enqueue(payload)
      return { ok: false, stars, clientId: id, local: true }
    }
    return { ok: false, stars: before, clientId: id, local: true }
  }
  const stars = pickStars(before, data && data.stars, {
    added: delta,
    duplicated: !!(data && data.duplicated),
  })
  setLocalStars(stars)
  return { ok: true, stars, clientId: id, duplicated: !!(data && data.duplicated) }
}

async function flushRetryQueue() {
  const pending = retryQueue.peekAll()
  for (const item of pending) {
    const { ok } = await addStars({ ...item, retry: true })
    if (ok) retryQueue.removeByClientId(item.clientId)
  }
}

async function bootstrap() {
  await refreshProfile()
  await flushRetryQueue()
}

module.exports = {
  makeClientId,
  pickStars,
  getLocalStars,
  setLocalStars,
  refreshProfile,
  addStars,
  flushRetryQueue,
  bootstrap,
}
