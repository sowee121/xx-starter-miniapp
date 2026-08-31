const cloud = require('./cloud')
// 静态引入 activity：动态 require 一旦失败会被 catch 静默吞掉，
// 表现为「清除学习记录后热力图毫无反应」，且线上不留任何痕迹。
const activity = require('./activity')

const STORAGE_KEY = 'learning_progress'
const QUEUE_KEY = 'progress_retry_queue'
/**
 * 防御上限：长期离线时避免队列无限堆积挤占存储。
 * 按 module::itemId 去重，正常使用远不会触发；裁剪会丢「已学未同步」记录，故取值比星星队列宽。
 */
const MAX_SIZE = 500

let flushing = false

/** 读本地进度表 */
function loadMap() {
  try {
    const value = wx.getStorageSync(STORAGE_KEY)
    return value && typeof value === 'object' ? value : {}
  } catch (error) {
    return {}
  }
}

/** 写本地进度表 */
function saveMap(map) {
  try {
    wx.setStorageSync(STORAGE_KEY, map)
  } catch (error) {
    // ignore
  }
}

/** 读进度重试队列 */
function loadQueue() {
  try {
    const list = wx.getStorageSync(QUEUE_KEY)
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

/** 写进度重试队列 */
function saveQueue(list) {
  try {
    wx.setStorageSync(QUEUE_KEY, list)
  } catch (error) {
    // ignore
  }
}

/** 进度队列键 */
function queueKey(moduleName, itemId) {
  return `${moduleName}::${itemId}`
}

/** 入队待同步请求；超上限时裁剪最旧的（保留最近学习项优先同步） */
function enqueue(moduleName, itemId) {
  const key = queueKey(moduleName, itemId)
  const list = loadQueue().filter((row) => queueKey(row.module, row.itemId) !== key)
  list.push({ module: moduleName, itemId })
  saveQueue(list.length > MAX_SIZE ? list.slice(list.length - MAX_SIZE) : list)
}

/** 本地标记已学 */
function markLocal(moduleName, itemId) {
  if (!moduleName || !itemId) return
  const map = loadMap()
  if (!map[moduleName]) map[moduleName] = {}
  map[moduleName][itemId] = true
  saveMap(map)
}

/** 合并云端进度 */
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

/** 冲刷重试队列 */
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
  // 本地热力无条件先清：不能等云端结果，否则云不通就永远清不掉
  try {
    activity.clearLocal()
  } catch (error) {
    console.warn('[progress] 清除本地热力失败', error)
  }
  const { ok, data } = await cloud.call('resetProfile', { scope: 'progress' })
  // 云端复位成功：同步复位标记，之后档案拉取/旧 bump 写入都按复位后处理
  if (ok && data && data.heatResetAt) {
    try {
      activity.applyHeatResetAt(data.heatResetAt)
    } catch (error) {
      console.warn('[progress] 同步热力复位标记失败', error)
    }
  }
  return { ok }
}

/** 从云端拉进度 */
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
