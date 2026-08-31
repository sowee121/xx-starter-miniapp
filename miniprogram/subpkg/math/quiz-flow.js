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
  // 去乐观：星星数字以云函数确认的权威值为准，确认后再刷新顶栏；
  // 即时反馈由下方的对错飘字与提示音承担，避免「先加后减」的观感。
  void stars.addStars({ delta: 1, reason, ref }).then(() => refreshStars(page))
  // 任务奖励星与学习星并发：trackDaily 内部同步发起奖励请求、本行后发起 +1，
  // 若 +1 先确认而奖励星后确认，只挂一个刷新会漏掉奖励星数字，故两者都刷新。
  if (result.awardPromise) {
    result.awardPromise.then(() => refreshStars(page)).catch(() => {})
  }
  if (result.firstAward) {
    feedback.showTaskAward(page, result)
    // 这里照常展示，弹窗关闭后 goNext 会清软提示
    feedback.showInline(page, INLINE.answerCorrect)
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
