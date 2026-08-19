const content = require('../content/math')
const stars = require('../../../utils/stars')
const { randomCountQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback-copy')
const { clearAdvanceTimer, handleCorrect } = require('../quiz-flow')

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
    feedback: { show: false, closing: false },
  },

  onLoad() {
    this.applyQuestion()
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  applyQuestion() {
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
      feedback.showInline(this, INLINE.answerWrong, 'fail')
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
