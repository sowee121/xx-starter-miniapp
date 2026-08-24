const STORAGE_KEY = 'star_retry_queue'
/** 长期离线时避免无限增长（队列总额会计入界面展示值）。 */
const MAX_SIZE = 200

/** 内存缓存，避免同一帧反复 load/save storage */
let memCache = null

/** 读出队列 */
function load() {
  if (memCache) return memCache
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    memCache = Array.isArray(list) ? list : []
  } catch (e) {
    memCache = []
  }
  return memCache
}

/** 写回队列 */
function save(list) {
  memCache = list
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

/** 查看全部待发 */
function peekAll() {
  return load()
}

/** 按 id 移除（单个） */
function removeByClientId(clientId) {
  save(load().filter((item) => item.clientId !== clientId))
}

/** 批量移除（flush 用：一次 load → filter → save，避免逐项写 storage） */
function removeBatch(clientIds) {
  if (!Array.isArray(clientIds) || !clientIds.length) return
  const ids = new Set(clientIds)
  save(load().filter((item) => !ids.has(item.clientId)))
}

/** 队列长度 */
function size() {
  return load().length
}

/** 待同步总增量：驱动界面展示值，云端确认后由队列出栈自然回落。 */
function totalDelta() {
  return load().reduce((sum, item) => sum + (Number(item.delta) || 0), 0)
}

/** 清空队列 */
function clear() {
  save([])
}

module.exports = {
  enqueue,
  peekAll,
  removeByClientId,
  removeBatch,
  size,
  totalDelta,
  clear,
}
