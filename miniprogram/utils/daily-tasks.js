const STORAGE_KEY = 'daily_tasks'
const SCHEMA = 10
// 静态引入：动态 require 失败会被 catch 吞掉，导致学习热力漏记且无痕迹
const activity = require('./activity')
// 每日任务「云端为准 + 本地缓存」：模板需与 cloudfunctions/dailyTasks/index.js 的 TEMPLATES 保持同步
const cloud = require('./cloud')

/**
 * 六模块各一条；数量每天随机（生成后写入本地，当日不变）。
 * 古诗 1～2；汉字/算术/英语 1～5；拼音 1～6（六个单韵母）；日历固定 1。
 * 英语：字母名点读与单词点读都计入同一条（字母歌不计）。
 * 星星：古诗 = 数量 + 1；其余学习任务 = 数量；日历 = 1。
 */
const TEMPLATES = [
  {
    id: 'poem',
    min: 1,
    max: 2,
    url: '/subpkg/poem/poem/poem',
    titleOf: (n) => `读 ${n} 首古诗`,
    rewardOf: (n) => n + 1,
  },
  {
    id: 'hanzi',
    min: 1,
    max: 5,
    url: '/subpkg/hanzi/list/list',
    titleOf: (n) => `认 ${n} 个汉字`,
    rewardOf: (n) => n,
  },
  {
    id: 'math',
    min: 1,
    max: 5,
    url: '/subpkg/math/hub/hub',
    titleOf: (n) => `做 ${n} 道算术题`,
    rewardOf: (n) => n,
  },
  {
    id: 'english',
    min: 1,
    max: 5,
    url: '/subpkg/english/hub/hub',
    titleOf: (n) => `学 ${n} 个英语`,
    rewardOf: (n) => n,
  },
  {
    id: 'pinyin',
    min: 1,
    max: 6,
    url: '/subpkg/pinyin/list/list',
    titleOf: (n) => `读 ${n} 个拼音`,
    rewardOf: (n) => n,
  },
  {
    id: 'calendar',
    min: 1,
    max: 1,
    url: '/subpkg/calendar/index',
    titleOf: () => '日历打卡',
    rewardOf: () => 1,
  },
]

/** 闭区间随机整数 */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** 今日日期串（与 activity.dateKey 同一实现，避免两处日期格式各自漂移） */
function getToday() {
  return activity.dateKey()
}

/** 生成当日任务 */
function generateTasks() {
  return TEMPLATES.map((tpl) => {
    const target = randInt(tpl.min, tpl.max)
    return {
      id: tpl.id,
      target,
      reward: tpl.rewardOf(target),
      url: tpl.url,
      title: tpl.titleOf(target),
    }
  })
}

/** 空的一日任务记录 */
function emptyDay(date) {
  return {
    schema: SCHEMA,
    date,
    tasks: generateTasks(),
    progress: {},
    done: {},
    awarded: {},
  }
}

/** 内存缓存，避免同一帧内多次读 storage（onShow / getProgress / trackDaily 反复触发） */
let memCache = null

/** 读取今日任务记录：内存优先，回落 storage（返回原始值，可能为 null）。 */
function readToday() {
  if (memCache) return memCache
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object') memCache = raw
  } catch (error) {
    // ignore
  }
  return memCache
}

/** 保存今日任务（内存 + storage） */
function saveToday(data) {
  memCache = data
  try {
    wx.setStorageSync(STORAGE_KEY, data)
  } catch (error) {
    // 无本地存储时仍可在本次会话使用内存态（调用方持有引用）。
  }
}

/** 确保当天任务存在；换日或 schema 变更则清空进度。节流：同一帧重复调用只读一次 storage。 */
function ensureToday() {
  if (memCache) {
    const date = getToday()
    if (
      memCache.date === date
      && memCache.schema === SCHEMA
      && Array.isArray(memCache.tasks)
      && memCache.tasks.length === TEMPLATES.length
    ) {
      return memCache
    }
  }
  // 缓存未命中或已过期：从 storage 读
  const date = getToday()
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (
      raw
      && raw.date === date
      && raw.schema === SCHEMA
      && Array.isArray(raw.tasks)
      && raw.tasks.length === TEMPLATES.length
    ) {
      memCache = raw
      return raw
    }
  } catch (error) {
    // ignore
  }
  const day = emptyDay(date)
  saveToday(day)
  return day
}

/** 今日任务列表 */
function getTasks() {
  return ensureToday().tasks
}

/** 今日任务进度 */
function getProgress() {
  const day = ensureToday()
  return day.tasks.filter((task) => day.done[task.id]).length
}

/** 自由学习：任务页始终跳转到模块入口。 */
function nextUrl(taskId) {
  const day = ensureToday()
  const task = day.tasks.find((item) => item.id === taskId)
  return task ? task.url : ''
}

/** 今日任务列表 */
function taskList() {
  const day = ensureToday()
  return day.tasks.map((task) => {
    const units = day.progress[task.id] || []
    const current = Math.min(units.length, task.target)
    return {
      ...task,
      done: !!day.done[task.id],
      current,
      showProgress: task.target === 1 ? true : !day.done[task.id],
      openUrl: nextUrl(task.id),
    }
  })
}

/**
 * 上报一次有效学习（点读或答对）。
 * @param {string} taskId
 * @param {string} unitKey 唯一内容，如诗 id / 汉字 / letter:A / 单词 / 拼音 / math-correct / open
 * @returns {{ ok: boolean, completed: boolean, reward: number, current: number, target: number, firstAward: boolean, taskId: string, taskTitle: string }}
 */
function reportUnit(taskId, unitKey) {
  const day = ensureToday()
  const task = day.tasks.find((item) => item.id === taskId)
  if (!task || !unitKey) {
    return { ok: false, completed: false, reward: 0, current: 0, target: 0, firstAward: false, taskId: taskId || '', taskTitle: '' }
  }

  if (!day.progress[taskId]) day.progress[taskId] = []
  const units = day.progress[taskId]
  const isNew = !units.includes(unitKey)
  if (isNew) units.push(unitKey)

  let firstAward = false
  if (units.length >= task.target && !day.done[taskId]) {
    day.done[taskId] = true
  }
  if (day.done[taskId] && !day.awarded[taskId]) {
    day.awarded[taskId] = true
    firstAward = true
  }

  saveToday(day)
  if (isNew) {
    try {
      activity.bump()
    } catch (error) {
      // 热力写入失败不应影响学习任务落库
      console.warn('[daily-tasks] 热力写入失败', error)
    }
  }
  return {
    ok: true,
    completed: !!day.done[taskId],
    reward: task.reward,
    current: Math.min(units.length, task.target),
    target: task.target,
    firstAward,
    taskId,
    taskTitle: task.title,
  }
}

/**
 * 终身进度只登记有固定内容项的模块（古诗 / 识字 / 英语 / 拼音）。
 * 算术题目是每次随机生成的一次性 id，登记进去只会无上限堆记录、
 * 还会把有意义的进度挤出 getProgress 的返回条数；日历只记当天日期。
 */
function dailyItemId(taskId, unitKey) {
  if (taskId === 'math') return ''
  if (taskId === 'calendar') return getToday()
  return unitKey
}

/** 云端进度 / 打卡后台进行；发星立即走 addStars（本地先加，不挡反馈）。 */
function persistDailyCloud(taskId, unitKey, result) {
  const starsUtil = require('./stars')
  const progress = require('./progress')
  const itemId = dailyItemId(taskId, unitKey)

  if (result.firstAward && result.reward) {
    const date = getToday()
    // 挂到 result 上：星以云函数确认为准，调用方（如日历打卡）可在确认后刷新页面数字。
    // clientId 携带真实发起时刻：清星标记 starsResetAt 只作废「清零前发出的在途请求」，
    // 若沿用 daily-日期 形式（issuedAt=当天 0 点），清零当天新完成的打卡/任务奖励
    // 会被误判为清零前在途而整批吞掉（实测「任务完成没加星」的根因）。
    // 延迟到微任务再发起：让调用方在当前同步代码里先发出的「本单学习星 +1」请求先到云端，
    // 保证请求顺序 = 业务顺序（先答对加星，后任务达成发奖励星）。
    result.awardPromise = Promise.resolve().then(() =>
      starsUtil.addStars({
        delta: result.reward,
        reason: 'daily_task',
        ref: `${date}:${taskId}`,
        clientId: `daily-${Date.now()}-${date}-${taskId}`,
      })
    )
  }

  Promise.resolve()
    .then(async () => {
      if (itemId) {
        try {
          await progress.markDone(taskId, itemId)
        } catch (error) {
          // ignore
        }
      }
      if (!result.firstAward) return
      try {
        await starsUtil.checkinTask(taskId)
      } catch (error) {
        // ignore
      }
    })
    .catch(() => {
      // 云失败已由 markDone / addStars 本地兜底
    })
}

/**
 * 上报每日任务进度；若首次完成该任务则发星。
 * 本地进度同步返回，云端写入后台进行，避免答题反馈被冷启动拖住。
 * 放在 daily-tasks（主包首页已引用），避免单独 utils 只被分包使用触发主包未使用 JS 告警。
 */
function trackDaily(taskId, unitKey) {
  const result = reportUnit(taskId, unitKey)
  const task = getTasks().find((item) => item.id === taskId)
  result.taskTitle = task ? task.title : ''
  persistDailyCloud(taskId, unitKey, result)
  scheduleCloudSync()
  return result
}

/* ---------- 云端同步（云端为准 + 本地缓存） ---------- */

/** 上传防抖间隔：合并连续答题上报，避免每答一题一次云写 */
const SYNC_DEBOUNCE_MS = 300
let syncTimer = null

/** 整体上传当天文档（last-write-wins；云失败静默，学习流程不受影响） */
async function pushToCloud() {
  const day = readToday()
  if (!day || day.date !== getToday() || !Array.isArray(day.tasks)) return
  try {
    await cloud.call('dailyTasks', { action: 'sync', date: day.date, day })
  } catch (error) {
    // ignore：下次上报 / 页面进入时会再同步
  }
}

/** 防抖触发上传 */
function scheduleCloudSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    pushToCloud()
  }, SYNC_DEBOUNCE_MS)
}

/** 合并云端与本地进度：tasks 以云端为准，进度只增不减 */
function mergeCloudDay(cloudDay) {
  const local = readToday()
  if (
    !local
    || local.date !== cloudDay.date
    || !Array.isArray(local.tasks)
    || local.tasks.length !== TEMPLATES.length
  ) {
    return { ...cloudDay }
  }
  const progress = {}
  for (const tpl of TEMPLATES) {
    const a = (cloudDay.progress && cloudDay.progress[tpl.id]) || []
    const b = (local.progress && local.progress[tpl.id]) || []
    progress[tpl.id] = Array.from(new Set([...a, ...b]))
  }
  return {
    ...cloudDay,
    progress,
    done: { ...(cloudDay.done || {}), ...(local.done || {}) },
    awarded: { ...(cloudDay.awarded || {}), ...(local.awarded || {}) },
  }
}

/**
 * 从云端同步当天任务：本地有当天文档则携带作为 seed（云端缺失时直接入库，避免双随机漂移），
 * 成功后以云端为准合并本地增量并覆盖缓存；失败静默回落本地。
 * @returns {Promise<boolean>} 是否同步成功
 */
async function syncFromCloud() {
  const date = getToday()
  const local = readToday()
  const seed = local && local.date === date ? { tasks: local.tasks } : null
  const { ok, data } = await cloud.call('dailyTasks', { action: 'get', date, seed })
  if (!ok || !data || !data.day) return false
  const cloudDay = data.day
  if (cloudDay.date !== date || !Array.isArray(cloudDay.tasks) || cloudDay.tasks.length !== TEMPLATES.length) {
    return false
  }
  const merged = mergeCloudDay(cloudDay)
  merged.schema = SCHEMA
  saveToday(merged)
  // 合并结果回传云端，保证两端一致（本地增量不丢失）
  if (seed) {
    pushToCloud()
  }
  return true
}

/**
 * 家长区重置每日任务：清本地缓存 + 云端当天文档，
 * 下次打开重新随机生成（已发星星保留，不动星流水）。
 */
async function resetDailyTasks() {
  memCache = null
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (error) {
    // ignore
  }
  const { ok } = await cloud.call('dailyTasks', { action: 'reset', date: getToday() })
  return { ok }
}

module.exports = {
  getToday,
  readToday,
  getProgress,
  taskList,
  nextUrl,
  trackDaily,
  syncFromCloud,
  resetDailyTasks,
}

require('./read-award')
