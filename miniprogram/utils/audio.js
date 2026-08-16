const VOLUME_KEY = 'audio_volume'

let ctx = null
let queue = []
let playing = false
let optionReady = false
let playToken = 0

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

/** 本地路径含中文（如识字「入.mp3」）时，iOS 真机必须编码。 */
function normalizeSrc(src) {
  if (!src) return ''
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
    playing = false
    playNext()
  })
  ctx.onStop(() => {
    // stop 后勿立刻认为可播下一条，由 play()/playNext 自己推进
  })
  ctx.onError((err) => {
    console.warn('[audio]', err)
    playing = false
    playNext()
  })
  return ctx
}

/**
 * 真机上 stop 后立刻改 src 再 play 常会静音失败；
 * 换源时先 stop，再短延迟设 src 并 play。
 */
function startSrc(src) {
  const audio = ensureCtx()
  const next = normalizeSrc(src)
  if (!next) {
    playing = false
    playNext()
    return
  }

  const token = ++playToken
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

/** 立即打断并播放一条 */
function play(src) {
  if (!src) return
  queue = []
  startSrc(src)
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
