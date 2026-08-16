const cloud = require('./cloud')
const retryQueue = require('./retry-queue')

const STORAGE_KEY = 'local_stars'

function makeClientId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}-${rand}`
}

function getLocalStars() {
  const app = getApp()
  const profile = (app && app.globalData && app.globalData.profile) || {}
  if (typeof profile.stars === 'number') return profile.stars
  try {
    const stars = wx.getStorageSync(STORAGE_KEY)
    return typeof stars === 'number' ? stars : 0
  } catch (error) {
    return 0
  }
}

function setLocalStars(stars) {
  const app = getApp()
  if (!app.globalData.profile) {
    app.globalData.profile = { stars: 0, stickers: [], badges: [] }
  }
  app.globalData.profile.stars = stars
  try {
    wx.setStorageSync(STORAGE_KEY, stars)
  } catch (error) {
    // 存储空间不可用时仍保留本次会话中的积分。
  }
}

async function refreshProfile() {
  const { ok, data } = await cloud.call('getProfile')
  if (!ok || !data) return getLocalStars()
  const app = getApp()
  app.globalData.profile = data.profile || data
  return getLocalStars()
}

async function addStars({ delta, reason, ref, clientId }) {
  const id = clientId || makeClientId()
  const payload = { delta, reason, ref, clientId: id }
  const { ok, data } = await cloud.call('addStars', payload)
  if (!ok) {
    setLocalStars(getLocalStars() + delta)
    retryQueue.enqueue(payload)
    return { ok: false, stars: getLocalStars(), clientId: id, local: true }
  }
  if (typeof data.stars === 'number') {
    setLocalStars(data.stars)
  } else {
    setLocalStars(getLocalStars() + delta)
  }
  return { ok: true, stars: getLocalStars(), clientId: id, duplicated: !!data.duplicated }
}

async function flushRetryQueue() {
  const pending = retryQueue.peekAll()
  for (const item of pending) {
    const { ok } = await addStars(item)
    if (ok) retryQueue.removeByClientId(item.clientId)
  }
}

module.exports = {
  makeClientId,
  getLocalStars,
  setLocalStars,
  refreshProfile,
  addStars,
  flushRetryQueue,
}
