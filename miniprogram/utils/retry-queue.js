const STORAGE_KEY = 'star_retry_queue'
/** 长期离线时避免无限增长（队列总额会计入界面展示值）。 */
const MAX_SIZE = 200

function load() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
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

/** 按 clientId 去重写入，避免冲刷失败时重复入队。 */
function enqueue(item) {
  if (!item || !item.clientId) return
  const list = load().filter((row) => row.clientId !== item.clientId)
  list.push({
    delta: item.delta,
    reason: item.reason,
    ref: item.ref || '',
    clientId: item.clientId,
  })
  save(list.length > MAX_SIZE ? list.slice(list.length - MAX_SIZE) : list)
}

function peekAll() {
  return load()
}

function removeByClientId(clientId) {
  save(load().filter((item) => item.clientId !== clientId))
}

function size() {
  return load().length
}

/** 待同步总增量：驱动界面展示值，云端确认后由队列出栈自然回落。 */
function totalDelta() {
  return load().reduce((sum, item) => sum + (Number(item.delta) || 0), 0)
}

function clear() {
  save([])
}

module.exports = {
  enqueue,
  peekAll,
  removeByClientId,
  size,
  totalDelta,
  clear,
}
