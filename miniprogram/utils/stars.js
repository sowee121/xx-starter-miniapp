const cloud = require('./cloud')
const retryQueue = require('./retry-queue')
const activity = require('./activity')

/** 云端权威值的本地快照（只存云端已确认的余额）。 */
const STORAGE_KEY = 'local_stars'
/** 已兑换贴纸 id 列表的本地快照（云端为准，本地仅缓存） */
const OWNED_KEY = 'owned_stickers'
/** 上次清零时间戳；本地据此丢弃复位前迟到的加星响应 */
const RESET_AT_KEY = 'stars_reset_at'
/** 本地版本号：清零/扣星/复位时递增，用于丢弃迟到的旧加星响应，防止把低值顶回。 */
const EPOCH_KEY = 'star_epoch'

/** 冲刷中禁止递归再触发 flush（addStars 成功路径会尝试冲刷）。 */
let flushing = false
/** App.onLaunch 内 getApp() 不可用，用模块标志代替 globalData._cloudReady。 */
let cloudReady = false
/** 进行中的建档/同步，避免 onLaunch 与首页 onShow 并行打两遍 login/getProfile。 */
let sessionPromise = null

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

/**
 * 单调采纳云端星星：只把 baseline 往上抬，不用更小的云端值回退。
 *
 * 展示值唯一来源是云端确认的余额：getProfile 与 addStars 并发、或多笔加星
 * 交错返回时，后到者可能携带更早落库的旧值，直接 setBaselineStars 会把已确认
 * 的星星抹掉，界面表现为「星星突然被扣掉」。这里只取较大值，保证任何时刻只增不减。
 *
 * 仅用于「加星 / 拉档案」语义（applyProfile、addStars 成功路径）。
 * 兑换扣星、家长区清零必须继续用 setBaselineStars（覆盖 + epoch 递增），
 * 否则星星永远扣不掉。
 *
 * @param {number} cloudStars 云端返回的星星总数
 * @returns {number} 采纳后的 baseline（保证 >= 采纳前的 baseline）
 */
function adoptCloudBaseline(cloudStars) {
  const baseline = getBaselineStars()
  const next = Number(cloudStars)
  // 云端没给合法数字时保持现状，不动本地
  if (!Number.isFinite(next)) return baseline
  if (next <= baseline) return baseline
  setBaselineStars(next)
  return next
}

/** 读取本地版本号 */
function getEpoch() {
  try {
    const value = wx.getStorageSync(EPOCH_KEY)
    return typeof value === 'number' ? value : 0
  } catch (error) {
    return 0
  }
}

/** 递增版本号：清零/扣星/复位后，之前发出的加星响应一律作废。 */
function bumpEpoch() {
  const next = getEpoch() + 1
  try {
    wx.setStorageSync(EPOCH_KEY, next)
  } catch (error) {
    // ignore
  }
  return next
}

/**
 * 展示用星星 = 云端权威快照。
 *
 * 不再叠加在途/队列增量：发起加星时不乐观计数，展示值只在云函数确认的那一刻
 * 变化，且经 adoptCloudBaseline 单调采纳后任何时刻只增不减——「星星先加后减」
 * 在机制上被杜绝（并发响应的旧值、清零/扣星后的旧响应都不会把展示值拉低）。
 */
function getLocalStars() {
  const total = getBaselineStars()
  return total > 0 ? total : 0
}

/**
 * 直接落定总数（家长区清零等）。
 *
 * 清零必须走覆盖而非单调采纳：清零后总数本就该降到 0，单调采纳会把这次下降
 * 挡回去，星星永远清不掉。同时递增 epoch，使清零前发出的旧加星响应全部作废，
 * 避免旧响应把 0 顶回去。
 */
function setLocalStars(stars) {
  retryQueue.clear()
  setBaselineStars(stars)
  bumpEpoch()
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

/**
 * 家长在其他设备清空积分后，丢掉本机过期重试队列并归零快照，避免旧星复活。
 *
 * 归零 + epoch 递增是「只增不减」唯一的例外出口：
 * 若被单调保护挡住，本机旧星会在下次拉档案时复活；
 * 若不递增 epoch，清零前发出的旧加星响应会把 0 顶回去。
 */
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
  retryQueue.clear()
  setBaselineStars(0)
  bumpEpoch()
  try {
    wx.setStorageSync(RESET_AT_KEY, next)
  } catch (error) {
    // ignore
  }
}

/** 应用云端档案 */
function applyProfile(profile) {
  if (!profile || typeof profile !== 'object') return
  // 复位标记必须先于单调采纳处理：它会清掉本地重试队列、归零快照并递增 epoch，
  // 否则家长在其他设备清零后，复位前的旧星会借着「只增不减」复活。
  applyStarsResetAt(profile.starsResetAt)
  // 云端值直接作为快照；展示值以云端确认为准，单调采纳保证不回退
  const next = Object.assign({}, profile)
  if (typeof next.stars === 'number') {
    // 单调采纳：getProfile 常与加星并发，带回的可能是加星落库前的旧快照，
    // 直接写入会让界面星星突然回退（「明明加成功了却被扣掉」）。
    // 必须在下面把 next 挂到 globalData 之前算——一旦先替换 profile，
    // getBaselineStars 读到的就是云端旧值本身，采纳形同虚设。
    next.stars = adoptCloudBaseline(next.stars)
  }
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
  // 热力档案：按复位代际整份采纳或丢弃，
  // 避免复位前读取的旧快照把已清除的热力重新合并回来
  try {
    activity.applyCloudDays(next.heatDays, next.heatResetAt)
  } catch (error) {
    // 热力合并失败不应影响积分同步
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
  try {
    await activity.syncFromCloud()
  } catch (error) {
    // 热力同步失败不挡积分
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
 * 返回本次 addStars 的 promise，调用方可在云确认后刷新展示。
 * @returns {Promise<{ ok: boolean }>}
 */
function awardVisitStar(page, opts) {
  if (!page || page._visitStarAwarded) return Promise.resolve({ ok: false })
  page._visitStarAwarded = true
  return addStars(opts)
}

/**
 * 加星：以云函数确认的权威余额为准。
 *
 * - 发起时不乐观计数，展示值保持当前云端快照；
 * - 成功：单调采纳云端余额（只增不减）；
 * - 失败：入重试队列后台补账（不计入展示值，恢复后补账也只会让数字向上跳变）；
 * - 期间发生清零/扣星/复位（epoch 变化）：响应整笔作废，防止旧值把低值顶回。
 *
 * @param {{ delta: number, reason: string, ref?: string, clientId?: string, fromQueue?: boolean }} opts
 */
async function addStars({ delta, reason, ref, clientId, fromQueue }) {
  const id = clientId || makeClientId()
  const amount = Number(delta) || 0
  const payload = { delta: amount, reason, ref, clientId: id }
  const epochAtIssue = getEpoch()

  const { ok, data } = await cloud.call('addStars', payload)

  // 期间清零/扣星过：迟到的旧响应可能携带旧的高余额，会把扣掉的值顶回，整笔作废
  if (getEpoch() !== epochAtIssue) {
    return { ok: true, stars: getLocalStars(), clientId: id, stale: true }
  }

  if (!ok) {
    // 参数错误再入队会永久堵住后续加星
    if (!(data && data.error === 'invalid_params')) {
      retryQueue.enqueue(payload)
    }
    return { ok: false, stars: getLocalStars(), clientId: id, local: true }
  }

  if (typeof data.stars === 'number') {
    // 云端权威余额：单调采纳，只增不减
    adoptCloudBaseline(data.stars)
  } else if (amount > 0 && !data.duplicated) {
    // 云端未返回余额时按本次增量本地累加；同样走采纳，保持只增不减
    adoptCloudBaseline(getBaselineStars() + amount)
  }
  // 任意一次加星成功，顺带冲刷积压（幂等靠 clientId）
  if (!fromQueue && !flushing && retryQueue.size() > 0) {
    await flushRetryQueue()
  }
  return { ok: true, stars: getLocalStars(), clientId: id, duplicated: !!data.duplicated }
}

/**
 * 兑换贴纸：扣星必须走覆盖（云余额必然小于本地，禁止单调采纳），
 * 同时递增 epoch，使兑换前发出的旧加星响应作废，防止把扣掉的值顶回。
 */
async function exchangeReward(rewardId) {
  const { ok, data, error } = await cloud.call('exchangeReward', { rewardId })
  if (!ok) {
    return { ok: false, error: (data && data.error) || error || 'exchange_failed' }
  }
  if (typeof data.stars === 'number') {
    setBaselineStars(data.stars)
    bumpEpoch()
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

/** 冲刷重试队列（批量移除，避免逐项 load/save storage） */
async function flushRetryQueue() {
  if (flushing) return
  const pending = retryQueue.peekAll()
  if (!pending.length) return
  flushing = true
  try {
    const done = []
    for (const item of pending) {
      const { ok } = await addStars({ ...item, fromQueue: true })
      if (ok) {
        done.push(item.clientId)
      } else {
        // 云仍不可用，保留队列，下次通畅再同步
        break
      }
    }
    if (done.length) retryQueue.removeBatch(done)
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
