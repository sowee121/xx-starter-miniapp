const feedback = require('../../utils/feedback')
const stars = require('../../utils/stars')
const { trackDaily } = require('../../utils/daily-tasks')
const { INLINE } = require('../../content/feedback')

/** 答对后固定停留，再自动切下一题（对齐提示音约 2s） */
const ADVANCE_DELAY = 2000

/** 取消自动切题定时器 */
function clearAdvanceTimer(page) {
  if (!page || !page._advanceTimer) return
  clearTimeout(page._advanceTimer)
  page._advanceTimer = null
}

/** 答对后延迟切题 */
function scheduleAdvance(page, onAdvance) {
  clearAdvanceTimer(page)
  page._advanceTimer = setTimeout(() => {
    page._advanceTimer = null
    feedback.clearInline(page)
    if (typeof onAdvance === 'function') onAdvance()
  }, ADVANCE_DELAY)
}

/** 刷新顶栏星星 */
function refreshStars(page) {
  if (!page || typeof page.setData !== 'function') return
  page.setData({ stars: stars.getLocalStars() })
}

/**
 * 先出对错反馈，加星与进度写云放到后台，避免冷启动拖住「答对啦」。
 */
function handleCorrect(page, { reason, ref, taskId }) {
  const result = trackDaily(taskId, `correct:${ref}`)
  void stars.addStars({ delta: 1, reason, ref }).then(() => refreshStars(page))
  refreshStars(page)
  if (result.firstAward) {
    feedback.showTaskAward(page, result)
    return
  }
  feedback.showInline(page, INLINE.answerCorrect)
  scheduleAdvance(page, () => {
    page._busy = false
    if (typeof page.clearPick === 'function') page.clearPick()
    page.applyQuestion()
  })
}

module.exports = {
  ADVANCE_DELAY,
  clearAdvanceTimer,
  scheduleAdvance,
  handleCorrect,
}
