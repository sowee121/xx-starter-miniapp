const audioUtil = require('./audio')
const stars = require('./stars')
const feedback = require('./feedback')
const { INLINE } = require('../content/feedback')

function clearLongPlaying(page) {
  if (!page) return
  page._longPlayGate = false
  if (page.data && page.data.longPlaying && typeof page.setData === 'function') {
    page.setData({ longPlaying: false })
  }
}

/** 停掉整首/字母歌并把按钮收回播放三角。进页、离开、回首页、后台打断都走这里。 */
function resetLongPlay(page) {
  audioUtil.stop()
  clearLongPlaying(page)
}

function attachLongPlay(page) {
  if (!page || page._unwatchStop) return
  page._unwatchStop = audioUtil.watchStop(() => {
    clearLongPlaying(page)
  })
}

function detachLongPlay(page) {
  if (page && page._unwatchStop) {
    page._unwatchStop()
    page._unwatchStop = null
  }
  resetLongPlay(page)
}

/**
 * 副音轨：组词 / 句子 / 逐句。只播放，不计任务、不加星。
 * 会打断整首/字母歌，并把圆形播放钮恢复为播放态。
 */
function playPreview(page, src) {
  if (!src) {
    feedback.showInline(page, INLINE.audioUnavailable)
    return
  }
  audioUtil.stop()
  audioUtil.play(src, { onError: feedback.audioFallback(page) })
}

function awardPrimary(page, { taskId, unitKey, reason, ref }) {
  const { trackDaily } = require('./daily-tasks')
  const result = trackDaily(taskId, unitKey)
  stars.awardVisitStar(page, { delta: 1, reason, ref })
  if (page && typeof page.setData === 'function') {
    page.setData({ stars: stars.getLocalStars() })
  }
  feedback.showTaskAward(page, result)
}

/**
 * 主点读：音频自然播完后记每日任务、本页最多加 1 星、刷新星栏。
 * 不阻塞播放；副音轨不要走这里。
 */
function playPrimaryAndAward(page, { src, taskId, unitKey, reason, ref }) {
  if (!src) {
    feedback.showInline(page, INLINE.audioUnavailable)
    return
  }
  audioUtil.stop()
  audioUtil.play(src, {
    onEnded: () => awardPrimary(page, { taskId, unitKey, reason, ref }),
    onError: feedback.audioFallback(page),
  })
}

/**
 * 整首诗 / 字母歌：播放中再点即停止并恢复三角；自然结束也恢复。
 * 中途停止不加星、不计任务。award 有值时仅自然播完才发奖。
 *
 * 自定义组件 bind:tap 与内部 tap 有时会同一拍触发两次：
 * 第一次 play、第二次立刻 stop，听起来像「点击没反应」。
 */
function toggleLongPlay(page, { src, award } = {}) {
  if (page && page._longPlayGate) return
  if (page) {
    page._longPlayGate = true
    setTimeout(() => {
      page._longPlayGate = false
    }, 160)
  }

  const alreadyOn = (page && page.data && page.data.longPlaying) || audioUtil.isPlayingSrc(src)
  if (alreadyOn) {
    audioUtil.stop()
    clearLongPlaying(page)
    return
  }
  if (!src) {
    feedback.showInline(page, INLINE.audioUnavailable)
    return
  }
  if (page && typeof page.setData === 'function') {
    page.setData({ longPlaying: true })
  }
  audioUtil.play(src, {
    onEnded: () => {
      clearLongPlaying(page)
      if (award) awardPrimary(page, award)
    },
    onError: (err) => {
      clearLongPlaying(page)
      feedback.audioFallback(page)(err)
    },
  })
}

module.exports = {
  playPreview,
  playPrimaryAndAward,
  toggleLongPlay,
  attachLongPlay,
  detachLongPlay,
}
