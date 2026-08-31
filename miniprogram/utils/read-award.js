const audioUtil = require('./audio')
const stars = require('./stars')
const feedback = require('./feedback')
const { INLINE } = require('../content/feedback')

let boundPage = null

/** 当前页播放钮收回三角 */
function clearPlayingUi() {
  const page = boundPage
  if (!page || typeof page.setData !== 'function') return
  const patch = {}
  if (page.data && page.data.playingSrc) patch.playingSrc = ''
  if (page.data && page.data.longPlaying) patch.longPlaying = false
  if (Object.keys(patch).length) page.setData(patch)
}

audioUtil.watchStop(clearPlayingUi)

/** 绑定当前页，便于全局 stop 收回播放钮 */
function bindPage(page) {
  boundPage = page
}

/** 写入正在播放的音频路径 */
function setPlayingSrc(page, src) {
  if (!page || typeof page.setData !== 'function') return
  const next = src || ''
  const patch = { playingSrc: next }
  if (page.data && Object.prototype.hasOwnProperty.call(page.data, 'longPlaying')) {
    patch.longPlaying = !!next
  }
  page.setData(patch)
}

/** 防连点：同一拍 play 又 stop */
function armGate(page) {
  if (!page) return false
  if (page._playGate) return true
  page._playGate = true
  setTimeout(() => {
    page._playGate = false
  }, 160)
  return false
}

/** 绑定当前页为播放 UI 宿主 */
function attachLongPlay(page) {
  bindPage(page)
}

/** 解绑并停止 */
function detachLongPlay(page) {
  if (page) bindPage(page)
  audioUtil.stop()
  if (boundPage === page) boundPage = null
}

/** 记每日任务并加星 */
function awardPrimary(page, { taskId, unitKey, reason, ref }) {
  const { trackDaily } = require('./daily-tasks')
  const result = trackDaily(taskId, unitKey)
  // 去乐观：星星数字以云函数确认的权威值为准，确认后再刷新；
  // 即时反馈由 showTaskAward 弹窗与提示音承担，避免「先加后减」的观感。
  stars.awardVisitStar(page, { delta: 1, reason, ref }).then(() => {
    if (page && typeof page.setData === 'function') {
      page.setData({ stars: stars.getLocalStars() })
    }
  })
  // 任务奖励星与学习星并发：奖励星确认后同样刷新，
  // 避免 +1 先确认、奖励星后确认时顶栏停留旧值、看起来「没加星」。
  if (result.awardPromise) {
    result.awardPromise
      .then(() => {
        if (page && typeof page.setData === 'function') {
          page.setData({ stars: stars.getLocalStars() })
        }
      })
      .catch(() => {})
  }
  feedback.showTaskAward(page, result)
}

/**
 * 所有播放位共用：播放中再点同一段即停止并恢复三角。
 * award 仅自然播完才发；中途停止不加星。
 */
function togglePlay(page, { src, award } = {}) {
  if (armGate(page)) return
  bindPage(page)
  if (audioUtil.isPlayingSrc(src)) {
    audioUtil.stop()
    return
  }
  if (!src) {
    feedback.showInline(page, INLINE.audioUnavailable)
    return
  }
  setPlayingSrc(page, src)
  audioUtil.play(src, {
    onEnded: () => {
      if (page.data && page.data.playingSrc === src) setPlayingSrc(page, '')
      if (award) awardPrimary(page, award)
    },
    onError: (err) => {
      if (page.data && page.data.playingSrc === src) setPlayingSrc(page, '')
      feedback.audioFallback(page)(err)
    },
  })
}

/** 强制开播（不切换停止），用于音量试听等。 */
function playClip(page, src) {
  bindPage(page)
  if (!src) return
  setPlayingSrc(page, src)
  audioUtil.play(src, {
    onEnded: () => {
      if (page.data && page.data.playingSrc === src) setPlayingSrc(page, '')
    },
    onError: () => {
      if (page.data && page.data.playingSrc === src) setPlayingSrc(page, '')
    },
  })
}

/** 副音轨：组词 / 句子 / 逐句。只播放，不计任务、不加星。 */
function playPreview(page, src) {
  togglePlay(page, { src })
}

/** 主点读：自然播完后记每日任务、本页最多加 1 星。 */
function playPrimaryAndAward(page, { src, taskId, unitKey, reason, ref }) {
  togglePlay(page, { src, award: { taskId, unitKey, reason, ref } })
}

/** 整首诗 / 字母歌，逻辑与其它播放位相同。 */
function toggleLongPlay(page, { src, award } = {}) {
  togglePlay(page, { src, award })
}

module.exports = {
  playPreview,
  playClip,
  playPrimaryAndAward,
  togglePlay,
  toggleLongPlay,
  attachLongPlay,
  detachLongPlay,
}
