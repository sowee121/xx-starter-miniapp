const VOLUME_KEY = 'audio_volume'

let ctx = null
let queue = []
let playing = false
let optionReady = false
let playToken = 0
let endedCallback = null
let errorCallback = null

function getVolume() {
  const v = wx.getStorageSync(VOLUME_KEY)
  if (v === 0 || v === '0') return 0
  if (v === 0.5 || v === '0.5') return 0.5
  return 1
}

/** 真机（尤其 iOS）需全局设置；实例上的 obeyMuteSwitch 自基础库 2.3.0 起无效。 */
function ensureAudioOption() {
  if (optionReady || typeof wx.setInnerAudioOption !== 'function') return
  optionReady = true
  wx.setInnerAudioOption({
    obeyMuteSwitch: false,
    mixWithOther: true,
  })
}

/**
 * 代码包内路径（/subpkg/...）走 readFile，不做百分号编码：
 * 编码后的文件名会被当成字面量去查，非 ASCII 素材必然 not found。
 * 素材文件名一律 ASCII slug，这里只给网络地址留编码。
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

function ensureCtx() {
  if (ctx) return ctx
  ensureAudioOption()
  ctx = wx.createInnerAudioContext()
  // 旧基础库兜底；新版本以 setInnerAudioOption 为准
  try {
    ctx.obeyMuteSwitch = false
  } catch (error) {
    // ignore
  }
  ctx.onEnded(() => {
    const callback = endedCallback
    endedCallback = null
    errorCallback = null
    playing = false
    if (callback) callback()
    playNext()
  })
  ctx.onStop(() => {
    // stop 后勿立刻认为可播下一条，由 play()/playNext 自己推进
  })
  ctx.onError((err) => {
    console.warn('[audio]', err)
    const callback = errorCallback
    endedCallback = null
    errorCallback = null
    playing = false
    if (callback) callback(err)
    playNext()
  })
  return ctx
}

/**
 * 真机上 stop 后立刻改 src 再 play 常会静音失败；
 * 换源时先 stop，再短延迟设 src 并 play。
 */
function startSrc(src, options = {}) {
  const audio = ensureCtx()
  const next = normalizeSrc(src)
  const onEnded = options.onEnded
  const onError = options.onError
  if (!next) {
    playing = false
    if (typeof onError === 'function') onError({ errMsg: 'empty src' })
    playNext()
    return
  }

  const token = ++playToken
  endedCallback = typeof onEnded === 'function' ? () => {
    if (token === playToken) onEnded()
  } : null
  errorCallback = typeof onError === 'function' ? (err) => {
    if (token === playToken) onError(err)
  } : null
  playing = true
  audio.volume = getVolume()

  const doPlay = () => {
    if (token !== playToken) return
    audio.src = next
    audio.play()
  }

  try {
    audio.stop()
  } catch (error) {
    // ignore
  }

  // 开发者工具几乎即时；真机需要一点间隔
  setTimeout(doPlay, 30)
}

function playNext() {
  if (playing || !queue.length) return
  const src = queue.shift()
  if (!src) {
    playNext()
    return
  }
  startSrc(src)
}

/** 立即打断并播放一条；options.onError 用于页面兜底提示 */
function play(src, options = {}) {
  if (!src) {
    if (typeof options.onError === 'function') options.onError({ errMsg: 'empty src' })
    return
  }
  queue = []
  startSrc(src, options)
}

/** 串行追加播放（如 star → great） */
function playSequence(srcs) {
  const list = (srcs || []).filter(Boolean)
  if (!list.length) return
  queue = queue.concat(list)
  if (!playing) playNext()
}

function stop() {
  queue = []
  playing = false
  playToken += 1
  endedCallback = null
  errorCallback = null
  if (ctx) ctx.stop()
}

function destroy() {
  stop()
  if (ctx) {
    ctx.destroy()
    ctx = null
  }
}

module.exports = {
  play,
  playSequence,
  stop,
  destroy,
  getVolume,
  VOLUME_KEY,
  ensureAudioOption,
}
