/** 按日累计有效学习次数，日历页月历热力图用。先写本地，再同步云端，换机仍在。 */

const cloud = require('./cloud')

const STORAGE_KEY = 'learn_heat'
const QUEUE_KEY = 'heat_retry_queue'
const KEEP_MONTHS = 12
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

let flushing = false

/** YYYY-MM-DD */
function dateKey(d) {
  const date = d || new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 读本地热力 */
function load() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object') {
      return raw
    }
  } catch (error) {
    // ignore
  }
  return { days: {} }
}

/** 丢掉一年前的格子 */
function prune(days) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - KEEP_MONTHS)
  const minKey = dateKey(cutoff)
  Object.keys(days).forEach((key) => {
    if (key < minKey) delete days[key]
  })
}

/** 写入本地 */
function save(store) {
  try {
    wx.setStorageSync(STORAGE_KEY, store)
  } catch (error) {
    // ignore
  }
}

/** 待同步日期队列 */
function loadQueue() {
  try {
    const list = wx.getStorageSync(QUEUE_KEY)
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

/** 写待同步队列 */
function saveQueue(list) {
  try {
    wx.setStorageSync(QUEUE_KEY, list)
  } catch (error) {
    // ignore
  }
}

/** 某日入队（同日只保留最新累计） */
function enqueue(day, count) {
  const list = loadQueue().filter((row) => row.day !== day)
  list.push({ day, count })
  saveQueue(list)
}

/** 次数 → 0～4 档 */
function levelOf(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

/** 本机与云端按日取较大值 */
function mergeDays(localDays, cloudDays) {
  const merged = Object.assign({}, localDays || {})
  Object.keys(cloudDays || {}).forEach((day) => {
    if (!DAY_RE.test(day)) return
    merged[day] = Math.max(merged[day] || 0, Number(cloudDays[day]) || 0)
  })
  prune(merged)
  return merged
}

/** 把某日累计推到云端；失败入队 */
async function pushDay(day, count, { fromQueue } = {}) {
  const { ok } = await cloud.call('bumpHeat', { day, count })
  if (!ok && !fromQueue) enqueue(day, count)
  return ok
}

/** 冲刷热力重试队列 */
async function flushRetryQueue() {
  if (flushing) return
  const pending = loadQueue()
  if (!pending.length) return
  flushing = true
  try {
    const remain = []
    for (let i = 0; i < pending.length; i += 1) {
      const item = pending[i]
      const ok = await pushDay(item.day, item.count, { fromQueue: true })
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

/**
 * 合并云端热力。登录档案带回 heatDays 时调用；只增不减。
 * 本机更高的日期会再推上去。
 */
function applyCloudDays(heatDays) {
  if (!heatDays || typeof heatDays !== 'object') return
  const local = load()
  const merged = mergeDays(local.days, heatDays)
  save({ days: merged })
  Object.keys(merged).forEach((day) => {
    if ((heatDays[day] || 0) < merged[day]) {
      enqueue(day, merged[day])
    }
  })
}

/** 当天有效学习 +1，并后台同步云端 */
function bump() {
  const store = load()
  const key = dateKey()
  store.days[key] = (store.days[key] || 0) + 1
  prune(store.days)
  save(store)
  void pushDay(key, store.days[key]).then(() => {
    if (!flushing && loadQueue().length) return flushRetryQueue()
    return undefined
  })
}

/** 云通畅后冲刷本地队列。档案合并走 applyCloudDays。 */
async function syncFromCloud() {
  await flushRetryQueue()
}

/** 家长重置进度时清本地热力 */
function clearLocal() {
  save({ days: {} })
  saveQueue([])
}

/** 月份 1–12 → 中文数字 */
const MONTH_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

/**
 * 本月热力：周一起、周日止，空位补齐。
 * @returns {{ title: string, weekdays: string[], cells: object[] }}
 */
function monthBoard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const pad = (first.getDay() + 6) % 7
  const days = load().days
  const today = dateKey(now)
  const cells = []
  for (let i = 0; i < pad; i += 1) {
    cells.push({ key: `p${i}`, empty: true, level: 0, today: false })
  }
  const monthStr = String(month + 1).padStart(2, '0')
  for (let day = 1; day <= lastDay; day += 1) {
    const key = `${year}-${monthStr}-${String(day).padStart(2, '0')}`
    const count = days[key] || 0
    cells.push({
      key,
      empty: false,
      level: levelOf(count),
      today: key === today,
    })
  }
  return {
    title: `${MONTH_CN[month]}月学习`,
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    cells,
  }
}

module.exports = {
  bump,
  monthBoard,
  dateKey,
  levelOf,
  applyCloudDays,
  syncFromCloud,
  clearLocal,
}
