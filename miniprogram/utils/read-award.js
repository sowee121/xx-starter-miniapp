const audioUtil = require('./audio')
const stars = require('./stars')
const feedback = require('./feedback')
const { INLINE } = require('../content/feedback')

/**
 * 副音轨：组词 / 句子 / 逐句。只播放，不计任务、不加星。
 */
function playPreview(page, src) {
  if (!src) {
    feedback.showInline(page, INLINE.audioUnavailable)
    return
  }
  audioUtil.play(src, { onError: feedback.audioFallback(page) })
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
  audioUtil.play(src, {
    onEnded: () => {
      const { trackDaily } = require('./daily-tasks')
      const result = trackDaily(taskId, unitKey)
      stars.awardVisitStar(page, { delta: 1, reason, ref })
      if (page && typeof page.setData === 'function') {
        page.setData({ stars: stars.getLocalStars() })
      }
      feedback.showTaskAward(page, result)
    },
    onError: feedback.audioFallback(page),
  })
}

module.exports = {
  playPreview,
  playPrimaryAndAward,
}
