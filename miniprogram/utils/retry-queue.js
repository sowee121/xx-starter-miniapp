const STORAGE_KEY = 'star_retry_queue'

function load() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || []
  } catch (e) {
    return []
  }
}

function save(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list)
  } catch (e) {
    console.warn('[retry-queue] save failed', e)
  }
}

function enqueue(item) {
  const list = load()
  list.push(item)
  save(list)
}

function peekAll() {
  return load()
}

function removeByClientId(clientId) {
  save(load().filter((item) => item.clientId !== clientId))
}

module.exports = {
  enqueue,
  peekAll,
  removeByClientId,
}
