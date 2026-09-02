/** 音量本地存储键；家长页滑杆调完写回这里，下次启动沿用 */
const VOLUME_KEY = 'audio_volume'

/** 全局唯一的 InnerAudioContext；单例复用，避免多实例互相抢焦点 */
let ctx = null
/** 是否正在播放；换源时据此决定要不要先 stop */
let playing = false
/** 当前播放源；stop 后不可立刻改 src，需延迟推进 */
let currentSrc = ''
/** 全局 setInnerAudioOption 是否已下发；重复调用在 iOS 会打断当前播放 */
let optionReady = false
/** 每次起播自增；回调里比对令牌以丢弃上一次播放的迟到事件 */
let playToken = 0
/** 当前播放的 onEnded 回调，播完或出错后清空 */
let endedCallback = null
/** 当前播放的 onError 回调，播完或出错后清空 */
let errorCallback = null
/** stop() 在部分机型会误发 onEnded；新一次 play 真正开始前忽略 ended */
let endedArmed = false
/** 本次 play 已真正响起；之后的 onError 视为误报 */
let playAlive = false
/** 同一次 src 遇到误报 onError 时只重试一次 */
let retriedPlay = false
/** 误报 onError 后延迟判活的定时器句柄 */
let errorRetryTimer = null
/** App 生命周期与音频打断监听是否已绑定，避免重复注册 */
let lifeBound = false
/** 亮屏锁当前是否持有，防止重复调用 setKeepScreenOn */
let keepScreen = false
/** 页面注册的「已停止」通知函数；仅导出的 stop() 会触发，换源时的 ctx.stop 不会 */
const stopWatchers = []

/** 读取本地音量 */
function getVolume() {
  const v = wx.getStorageSync(VOLUME_KEY)
  if (v === 0 || v === '0') return 0
  if (v === 0.5 || v === '0.5') return 0.5
  return 1
}

/** 清掉误报重试定时器 */
function clearErrorRetry() {
  if (errorRetryTimer) {
    clearTimeout(errorRetryTimer)
    errorRetryTimer = null
  }
}

/** 清空原生音频 src */
function dropNativeSrc() {
  if (!ctx) return
  try {
    ctx.src = ''
  } catch (error) {
    // ignore
  }
}

/** 通知页面停止播放 */
function notifyStopWatchers() {
  stopWatchers.slice().forEach((fn) => {
    try {
      fn()
    } catch (error) {
      // ignore
    }
  })
}

/** 页面用来把「停止方块」收回播放三角；仅导出的 stop() 会通知，换源时的 ctx.stop 不会。 */
function watchStop(fn) {
  if (typeof fn !== 'function') return () => {}
  stopWatchers.push(fn)
  return () => {
    const index = stopWatchers.indexOf(fn)
    if (index >= 0) stopWatchers.splice(index, 1)
  }
}

/** 任意音频播放中保持亮屏，避免自动熄屏掐声 */
function startKeepScreen() {
  if (keepScreen) return
  keepScreen = true
  try {
    wx.setKeepScreenOn({ keepScreenOn: true })
  } catch (error) {
    // ignore
  }
}

/** 停播后恢复系统自动熄屏 */
function stopKeepScreen() {
  if (!keepScreen) return
  keepScreen = false
  try {
    wx.setKeepScreenOn({ keepScreenOn: false })
  } catch (error) {
    // ignore
  }
}

/** 微信切后台、关掉小程序、来电等打断时停掉音频。 */
function bindAppLifecycle() {
  if (lifeBound) return
  lifeBound = true
  if (typeof wx.onAppHide === 'function') {
    wx.onAppHide(() => {
      destroy()
    })
  }
  if (typeof wx.onAudioInterruptionBegin === 'function') {
    wx.onAudioInterruptionBegin(() => {
      stop()
    })
  }
}

/** 写入全局音频选项 */
function applyAudioOption() {
  if (optionReady || typeof wx.setInnerAudioOption !== 'function') return
  optionReady = true
  wx.setInnerAudioOption({
    obeyMuteSwitch: false,
    mixWithOther: true,
  })
}

/** 真机（尤其 iOS）需全局设置；实例上的 obeyMuteSwitch 自基础库 2.3.0 起无效。 */
function ensureAudioOption() {
  bindAppLifecycle()
  applyAudioOption()
  ensureCtx()
}

/**
 * 代码包内路径（/subpkg/...）走本地文件，不做百分号编码：
 * 编码后的文件名会被当成字面量去查，非 ASCII 素材必然 not found。
 */
function normalizeSrc(src) {
  if (!src) return ''
  if (!/^https?:/i.test(src)) return src
  try {
    return encodeURI(src)
  } catch (error) {
    return src
  }
}

/** 懒创建音频上下文 */
function ensureCtx() {
  if (ctx) return ctx
  bindAppLifecycle()
  applyAudioOption()
  ctx = wx.createInnerAudioContext()
  try {
    ctx.obeyMuteSwitch = false
  } catch (error) {
    // ignore
  }
  ctx.onPlay(() => {
    playAlive = true
  })
  ctx.onEnded(() => {
    if (!endedArmed) return
    endedArmed = false
    playAlive = false
    retriedPlay = false
    const callback = endedCallback
    endedCallback = null
    errorCallback = null
    playing = false
    currentSrc = ''
    dropNativeSrc()
    stopKeepScreen()
    if (callback) callback()
  })
  ctx.onStop(() => {
    // stop 后不要立刻改 src；换源由 play() 自己延迟推进
  })
  ctx.onError((err) => {
    // 首次进页 / 分包音频刚就绪：微信常先 onError 再出声
    if (playAlive) return
    const token = playToken
    const callback = errorCallback
    if (ctx && currentSrc && !retriedPlay) {
      retriedPlay = true
      try {
        ctx.play()
      } catch (error) {
        // ignore
      }
      clearErrorRetry()
      errorRetryTimer = setTimeout(() => {
        errorRetryTimer = null
        if (token !== playToken || playAlive) return
        finishError(err, callback)
      }, 480)
      return
    }
    finishError(err, callback)
  })
  return ctx
}

/** 播放失败收尾 */
function finishError(err, callback) {
  console.warn('[audio]', err)
  clearErrorRetry()
  endedArmed = false
  playAlive = false
  retriedPlay = false
  endedCallback = null
  errorCallback = null
  playing = false
  currentSrc = ''
  dropNativeSrc()
  stopKeepScreen()
  if (callback) callback(err)
}

/**
 * 真机上 stop 后立刻改 src 再 play 常会静音失败；
 * 换源时先 stop，再短延迟设 src 并 play。首次播放不要空 stop，以免误报 onError。
 */
function startSrc(src, options = {}) {
  const audio = ensureCtx()
  const next = normalizeSrc(src)
  const onEnded = options.onEnded
  const onError = options.onError
  if (!next) {
    playing = false
    currentSrc = ''
    if (typeof onError === 'function') onError({ errMsg: 'empty src' })
    return
  }

  const needStop = playing || !!currentSrc
  const token = ++playToken
  endedArmed = false
  playAlive = false
  retriedPlay = false
  endedCallback = null
  errorCallback = null
  clearErrorRetry()
  audio.volume = getVolume()
  startKeepScreen()

  /** 真正开始播放 */
  const doPlay = () => {
    if (token !== playToken) return
    endedCallback =
      typeof onEnded === 'function'
        ? () => {
            if (token === playToken) onEnded()
          }
        : null
    errorCallback =
      typeof onError === 'function'
        ? (err) => {
            if (token === playToken) onError(err)
          }
        : null
    playing = true
    currentSrc = next
    endedArmed = true
    audio.src = next
    audio.play()
  }

  if (needStop) {
    try {
      audio.stop()
    } catch (error) {
      // ignore
    }
    setTimeout(doPlay, 30)
    return
  }
  doPlay()
}

/** 立即打断并播放一条；options.onError 用于页面兜底提示 */
function play(src, options = {}) {
  if (!src) {
    if (typeof options.onError === 'function') options.onError({ errMsg: 'empty src' })
    return
  }
  startSrc(src, options)
}

/** 停止当前音频 */
function stop() {
  const hadPlayback = playing || !!currentSrc
  playing = false
  currentSrc = ''
  playToken += 1
  endedArmed = false
  playAlive = false
  retriedPlay = false
  endedCallback = null
  errorCallback = null
  clearErrorRetry()
  stopKeepScreen()
  // 空闲时 stop 会在部分机型误报 onError，详情页第一次点播放就会闪「语音准备中」
  if (ctx && hadPlayback) {
    try {
      ctx.stop()
    } catch (error) {
      // ignore
    }
    dropNativeSrc()
  }
  notifyStopWatchers()
}

/** 是否正在播这段 */
function isPlayingSrc(src) {
  if (!playing || !currentSrc || !src) return false
  return currentSrc === normalizeSrc(src)
}

/** 销毁音频上下文 */
function destroy() {
  stop()
  if (!ctx) return
  try {
    if (typeof ctx.offPlay === 'function') ctx.offPlay()
    if (typeof ctx.offEnded === 'function') ctx.offEnded()
    if (typeof ctx.offStop === 'function') ctx.offStop()
    if (typeof ctx.offError === 'function') ctx.offError()
    ctx.destroy()
  } catch (error) {
    // ignore
  }
  ctx = null
}

module.exports = {
  play,
  stop,
  destroy,
  isPlayingSrc,
  getVolume,
  VOLUME_KEY,
  ensureAudioOption,
  bindAppLifecycle,
  watchStop,
}
