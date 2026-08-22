const stars = require('../../../utils/stars')
const { randomCalcQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback')
const { clearAdvanceTimer, handleCorrect } = require('../quiz-flow')

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
    dogImage: mediaUrl('/subpkg/math/static/dog.png'),
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
      this._history.push(this.data.question)
    }
    const prev = this.data.question
    const avoidKey = prev ? `${prev.a}${prev.op}${prev.b}` : null
    this.setData({
      question: randomCalcQuestion(null, avoidKey),
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
    const question = this._history.pop()
    this._step = Math.max(1, this._step - 1)
    this.setData({
      question,
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
