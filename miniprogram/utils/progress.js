const cloud = require('./cloud')

const STORAGE_KEY = 'learning_progress'
const QUEUE_KEY = 'progress_retry_queue'

let flushing = false

function loadMap() {
  try {
    const value = wx.getStorageSync(STORAGE_KEY)
    return value && typeof value === 'object' ? value : {}
  } catch (error) {
    return {}
  }
}

function saveMap(map) {
  try {
    wx.setStorageSync(STORAGE_KEY, map)
  } catch (error) {
    // ignore
  }
}

function loadQueue() {
  try {
    const list = wx.getStorageSync(QUEUE_KEY)
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

function saveQueue(list) {
  try {
    wx.setStorageSync(QUEUE_KEY, list)
  } catch (error) {
    // ignore
  }
}

function queueKey(moduleName, itemId) {
  return `${moduleName}::${itemId}`
}

function enqueue(moduleName, itemId) {
  const key = queueKey(moduleName, itemId)
  const list = loadQueue().filter((row) => queueKey(row.module, row.itemId) !== key)
  list.push({ module: moduleName, itemId })
  saveQueue(list)
}

function markLocal(moduleName, itemId) {
  if (!moduleName || !itemId) return
  const map = loadMap()
  if (!map[moduleName]) map[moduleName] = {}
  map[moduleName][itemId] = true
  saveMap(map)
}

function mergeCloudItems(items) {
  if (!Array.isArray(items) || !items.length) return
  const map = loadMap()
  for (const item of items) {
    if (!item || !item.module || !item.itemId) continue
    if (!map[item.module]) map[item.module] = {}
    map[item.module][item.itemId] = true
  }
  saveMap(map)
}

/**
 * 标记学完一项：先本地，再云；失败入队，下次云通畅冲刷。
 */
async function markDone(moduleName, itemId, { fromQueue } = {}) {
  if (!moduleName || !itemId) {
    return { ok: false, error: 'invalid_params' }
  }
  markLocal(moduleName, itemId)
  const { ok } = await cloud.call('completeProgress', {
    module: moduleName,
    itemId: String(itemId),
  })
  if (!ok) {
    if (!fromQueue) enqueue(moduleName, String(itemId))
    return { ok: false, local: true }
  }
  if (!fromQueue && !flushing && loadQueue().length) {
    await flushRetryQueue()
  }
  return { ok: true }
}

async function flushRetryQueue() {
  if (flushing) return
  const pending = loadQueue()
  if (!pending.length) return
  flushing = true
  try {
    const remain = []
    for (let i = 0; i < pending.length; i += 1) {
      const item = pending[i]
      const { ok } = await markDone(item.module, item.itemId, { fromQueue: true })
      if (!ok) {
        remain.push(...pending.slice(i))
        break
      }
    }
    saveQueue(remain)
  } finally {
    flushing = false
  }
}

/** 家长区重置学习进度：本地与云端一起清，否则下次同步又被拉回来。 */
async function clearAll() {
  saveMap({})
  saveQueue([])
  const { ok } = await cloud.call('resetProfile', { scope: 'progress' })
  return { ok }
}

async function pullFromCloud(moduleName) {
  const payload = moduleName ? { module: moduleName } : {}
  const { ok, data } = await cloud.call('getProgress', payload)
  if (!ok || !data) return false
  mergeCloudItems(data.items || [])
  return true
}

/** 云通畅：冲刷本地进度队列，再拉取云端合并。 */
async function syncFromCloud() {
  await flushRetryQueue()
  await pullFromCloud()
}

module.exports = {
  markDone,
  syncFromCloud,
  clearAll,
}
