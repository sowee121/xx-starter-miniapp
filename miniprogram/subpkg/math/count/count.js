const content = require('../content/math')
const stars = require('../../../utils/stars')
const { randomCountQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback')
const { clearAdvanceTimer, handleCorrect } = require('../quiz-flow')

function snapshotCount(page) {
  return {
    question: page.data.question,
    count: page.data.count,
    cols: page.data.cols,
    items: page.data.items,
  }
}

function navState(step, hasPrev) {
  return {
    label: String(step),
    hasPrev: !!hasPrev,
    hasNext: true,
    total: 2,
  }
}

Page({
  data: {
    stars: 0,
    question: null,
    count: 0,
    cols: 1,
    items: [],
    pickedValue: null,
    pickedCorrect: false,
    softNote: '',
    nav: navState(1, false),
    feedback: { show: false, closing: false },
  },

  onLoad() {
    this._history = []
    this._step = 1
    this.applyQuestion({ pushHistory: false })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  applyQuestion({ pushHistory } = { pushHistory: true }) {
    if (pushHistory && this.data.question) {
      this._history.push(snapshotCount(this))
    }
    const avoid = this.data.question && this.data.question.answer
    const question = randomCountQuestion(content.fruitPool, avoid)
    const src = mediaUrl(`/subpkg/math/static/${question.fruit}.png`)
    this.setData({
      question,
      count: question.answer,
      cols: question.cols,
      items: Array.from({ length: question.answer }, () => src),
      pickedValue: null,
      pickedCorrect: false,
      softNote: '',
      nav: navState(this._step, this._history.length > 0),
    })
  },

  goPrev() {
    if (!this._history.length) return
    clearAdvanceTimer(this)
    this._busy = false
    feedback.hideLayer(this)
    feedback.clearInline(this)
    const prev = this._history.pop()
    this._step = Math.max(1, this._step - 1)
    this.setData({
      ...prev,
      pickedValue: null,
      pickedCorrect: false,
      softNote: '',
      nav: navState(this._step, this._history.length > 0),
    })
  },

  goNext() {
    clearAdvanceTimer(this)
    this._busy = false
    feedback.hideLayer(this)
    feedback.clearInline(this)
    this._step += 1
    this.applyQuestion({ pushHistory: true })
  },

  choose(e) {
    if (this._busy || !this.data.question) return
    const value = Number(e.currentTarget.dataset.value)
    const correct = value === this.data.question.answer
    this.setData({
      pickedValue: value,
      pickedCorrect: correct,
    })
    if (!correct) {
      feedback.showInline(this, INLINE.answerWrong)
      return
    }
    this._busy = true
    handleCorrect(this, {
      reason: 'math',
      ref: this.data.question.id,
      taskId: 'math',
    })
  },

  next() {
    this.goNext()
  },

  onUnload() {
    clearAdvanceTimer(this)
  },
})
