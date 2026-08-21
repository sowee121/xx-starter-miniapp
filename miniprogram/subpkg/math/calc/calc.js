const stars = require('../../../utils/stars')
const { randomCalcQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback')
const { clearAdvanceTimer, handleCorrect } = require('../quiz-flow')

Page({
  data: {
    stars: 0,
    question: null,
    dogImage: mediaUrl('/subpkg/math/static/dog.png'),
    pickedValue: null,
    pickedCorrect: false,
    softNote: '',
    feedback: { show: false, closing: false },
  },

  onLoad() {
    this.applyQuestion()
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  applyQuestion() {
    const prev = this.data.question
    const avoidKey = prev ? `${prev.a}${prev.op}${prev.b}` : null
    this.setData({
      question: randomCalcQuestion(null, avoidKey),
      pickedValue: null,
      pickedCorrect: false,
      softNote: '',
    })
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
    clearAdvanceTimer(this)
    this._busy = false
    feedback.hideLayer(this)
    feedback.clearInline(this)
    this.applyQuestion()
  },

  onUnload() {
    clearAdvanceTimer(this)
  },
})
