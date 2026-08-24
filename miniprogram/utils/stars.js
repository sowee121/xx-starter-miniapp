const cloud = require('./cloud')
const retryQueue = require('./retry-queue')

/** 云端权威值的本地快照（不含未同步增量）。 */
const STORAGE_KEY = 'local_stars'
const OWNED_KEY = 'owned_stickers'
const RESET_AT_KEY = 'stars_reset_at'

/** 冲刷中禁止递归再触发 flush（addStars 成功路径会尝试冲刷）。 */
let flushing = false
/** App.onLaunch 内 getApp() 不可用，用模块标志代替 globalData._cloudReady。 */
let cloudReady = false
/** 进行中的建档/同步，避免 onLaunch 与首页 onShow 并行打两遍 login/getProfile。 */
let sessionPromise = null
/** 已乐观计入展示值、但尚未入队也未被云端确认的在途增量。 */
let inflightDelta = 0

/** 安全取 App 实例 */
function getAppSafe() {
  try {
    return typeof getApp === 'function' ? getApp() : null
  } catch (error) {
    return null
  }
}

/** 确保档案口袋存在 */
function ensureProfileBag(app) {
  if (!app || !app.globalData) return null
  if (!app.globalData.profile) {
    app.globalData.profile = { stars: 0, stickers: [], badges: [] }
  }
  return app.globalData.profile
}

/** 生成客户端请求 id */
function makeClientId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}-${rand}`
}

/** 云端快照：内存优先，回落到本地存储。 */
function getBaselineStars() {
  const app = getAppSafe()
  const profile = (app && app.globalData && app.globalData.profile) || {}
  if (typeof profile.stars === 'number') return profile.stars
  try {
    const stars = wx.getStorageSync(STORAGE_KEY)
    return typeof stars === 'number' ? stars : 0
  } catch (error) {
    return 0
  }
}

/** 写入星星快照 */
function setBaselineStars(stars) {
  const profile = ensureProfileBag(getAppSafe())
  if (profile) profile.stars = stars
  try {
    wx.setStorageSync(STORAGE_KEY, stars)
  } catch (error) {
    // 存储空间不可用时仍保留本次会话中的积分。
  }
}

/** 待云端确认的增量：在途请求 + 重试队列。 */
function pendingDelta() {
  let queued = 0
  try {
    queued = retryQueue.totalDelta()
  } catch (error) {
    queued = 0
  }
  return inflightDelta + queued
}

/**
 * 展示用星星 = 云端快照 + 待确认增量。
 * 不用「只取较大值」，否则兑换扣星、其他设备的变化永远同步不回来。
 */
function getLocalStars() {
  const total = getBaselineStars() + pendingDelta()
  return total > 0 ? total : 0
}

/** 直接落定总数（家长区清零等）；会丢弃尚未同步的增量。 */
function setLocalStars(stars) {
  inflightDelta = 0
  retryQueue.clear()
  setBaselineStars(stars)
}

/** 已兑换贴纸 */
function getOwnedStickers() {
  const app = getAppSafe()
  const profile = (app && app.globalData && app.globalData.profile) || {}
  if (Array.isArray(profile.stickers)) {
    return profile.stickers.slice()
  }
  try {
    const value = wx.getStorageSync(OWNED_KEY)
    return Array.isArray(value) ? value : []
  } catch (error) {
    return []
  }
}

/** 写入已兑贴纸 */
function setOwnedStickers(stickers) {
  const profile = ensureProfileBag(getAppSafe())
  if (profile) profile.stickers = stickers.slice()
  try {
    wx.setStorageSync(OWNED_KEY, stickers)
  } catch (error) {
    // ignore
  }
}

/** 家长在其他设备清空积分后，丢掉本机过期重试队列，避免旧星复活。 */
function applyStarsResetAt(resetAt) {
  const next = Number(resetAt) || 0
  if (!next) return
  let prev = 0
  try {
    prev = Number(wx.getStorageSync(RESET_AT_KEY)) || 0
  } catch (error) {
    prev = 0
  }
  if (next <= prev) return
  inflightDelta = 0
  retryQueue.clear()
  try {
    wx.setStorageSync(RESET_AT_KEY, next)
  } catch (error) {
    // ignore
  }
}

/** 应用云端档案 */
function applyProfile(profile) {
  if (!profile || typeof profile !== 'object') return
  applyStarsResetAt(profile.starsResetAt)
  // 云端值直接作为快照；本地未同步的星由 pendingDelta 叠加，不会被抹掉
  const next = Object.assign({}, profile)
  const app = getAppSafe()
  if (app && app.globalData) {
    app.globalData.profile = next
  }
  if (typeof next.stars === 'number') {
    try {
      wx.setStorageSync(STORAGE_KEY, next.stars)
    } catch (error) {
      // ignore
    }
  }
  if (Array.isArray(next.stickers)) {
    try {
      wx.setStorageSync(OWNED_KEY, next.stickers)
    } catch (error) {
      // ignore
    }
  }
}

/**
 * 云通畅后：冲刷本地队列并拉进度。login 已带回 profile 时不再重复 getProfile。
 */
async function syncFromCloud({ skipProfile } = {}) {
  await flushRetryQueue()
  try {
    await require('./progress').syncFromCloud()
  } catch (error) {
    // 进度同步失败不挡积分
  }
  if (skipProfile) return getLocalStars()
  return refreshProfile()
}

/** 拉取并应用档案 */
async function refreshProfile() {
  const { ok, data } = await cloud.call('getProfile')
  if (!ok || !data) return getLocalStars()
  applyProfile(data.profile || data)
  return getLocalStars()
}

/**
 * 建档并同步。并发调用（onLaunch 与首页 onShow）合并为一轮，避免重复打云函数；
 * 每轮结束即释放，后续 onShow 仍能重新同步云端。
 * @param {WechatMiniprogram.App.Instance<any>} [appInstance] onLaunch 内请传 this，因 getApp() 尚不可用
 */
function ensureSession(appInstance) {
  if (sessionPromise) return sessionPromise
  sessionPromise = runEnsureSession(appInstance).finally(() => {
    sessionPromise = null
  })
  return sessionPromise
}

/** 执行建档同步 */
async function runEnsureSession(appInstance) {
  try {
    let appliedLoginProfile = false
    if (!cloudReady) {
      const { ok, data } = await cloud.call('login')
      if (!ok) return getLocalStars()
      cloudReady = true
      const app = appInstance || getAppSafe()
      if (app && app.globalData) {
        app.globalData._cloudReady = true
      }
      if (data && data.profile) applyStarsResetAt(data.profile.starsResetAt)
      if (retryQueue.size() === 0 && data) {
        applyProfile(data.profile || data)
        appliedLoginProfile = true
      }
    }
    return await syncFromCloud({ skipProfile: appliedLoginProfile && retryQueue.size() === 0 })
  } catch (error) {
    return getLocalStars()
  }
}

/**
 * 点读详情：同一次进入页面只发 1 星。onLoad 会重置锁；算术答对不走这里。
 * @returns {boolean} 本次是否真正发星
 */
function awardVisitStar(page, opts) {
  if (!page || page._visitStarAwarded) return false
  page._visitStarAwarded = true
  void addStars(opts)
  return true
}

/**
 * @param {{ delta: number, reason: string, ref?: string, clientId?: string, fromQueue?: boolean }} opts
 */
async function addStars({ delta, reason, ref, clientId, fromQueue }) {
  const id = clientId || makeClientId()
  const amount = Number(delta) || 0
  const payload = { delta: amount, reason, ref, clientId: id }
  // 队列项已计入 pendingDelta，重复叠加会让展示值虚高
  const optimistic = !fromQueue && amount > 0
  if (optimistic) inflightDelta += amount

  const { ok, data } = await cloud.call('addStars', payload)

  if (!ok) {
    if (optimistic) {
      // 在途增量交接给队列，展示值不变
      inflightDelta -= amount
      retryQueue.enqueue(payload)
    }
    return { ok: false, stars: getLocalStars(), clientId: id, local: true }
  }

  if (optimistic) inflightDelta -= amount
  if (typeof data.stars === 'number') {
    setBaselineStars(data.stars)
  } else if (amount > 0 && !data.duplicated) {
    setBaselineStars(getBaselineStars() + amount)
  }
  // 任意一次加星成功，顺带冲刷积压（幂等靠 clientId）
  if (!fromQueue && !flushing && retryQueue.size() > 0) {
    await flushRetryQueue()
  }
  return { ok: true, stars: getLocalStars(), clientId: id, duplicated: !!data.duplicated }
}

/** 兑换贴纸 */
async function exchangeReward(rewardId) {
  const { ok, data, error } = await cloud.call('exchangeReward', { rewardId })
  if (!ok) {
    return { ok: false, error: (data && data.error) || error || 'exchange_failed' }
  }
  if (typeof data.stars === 'number') {
    setBaselineStars(data.stars)
  }
  const owned = getOwnedStickers()
  if (!owned.includes(rewardId)) {
    setOwnedStickers(owned.concat(rewardId))
  }
  if (!flushing && retryQueue.size() > 0) {
    await flushRetryQueue()
  }
  return { ok: true, stars: getLocalStars() }
}

/** 家长区清空积分：本地与云端一起清，否则下次 getProfile 又把星星拉回来。 */
async function clearAllStars() {
  setLocalStars(0)
  const { ok, data } = await cloud.call('resetProfile', { scope: 'stars' })
  if (ok && data) applyStarsResetAt(data.starsResetAt)
  return { ok }
}

/** 家长区清空贴纸：本地与云端一起清，积分不动。 */
async function clearAllStickers() {
  setOwnedStickers([])
  const { ok } = await cloud.call('resetProfile', { scope: 'stickers' })
  return { ok }
}

/** 记一条每日任务 */
async function checkinTask(taskId) {
  const result = await cloud.call('checkinTask', { taskId })
  if (result.ok && !flushing && retryQueue.size() > 0) {
    await flushRetryQueue()
  }
  return result
}

/** 冲刷重试队列 */
async function flushRetryQueue() {
  if (flushing) return
  const pending = retryQueue.peekAll()
  if (!pending.length) return
  flushing = true
  try {
    for (const item of pending) {
      const { ok } = await addStars({ ...item, fromQueue: true })
      if (ok) {
        retryQueue.removeByClientId(item.clientId)
      } else {
        // 云仍不可用，保留队列，下次通畅再同步
        break
      }
    }
  } finally {
    flushing = false
  }
}

module.exports = {
  makeClientId,
  getLocalStars,
  setLocalStars,
  getOwnedStickers,
  setOwnedStickers,
  refreshProfile,
  syncFromCloud,
  ensureSession,
  awardVisitStar,
  addStars,
  exchangeReward,
  checkinTask,
  clearAllStars,
  clearAllStickers,
  flushRetryQueue,
}
