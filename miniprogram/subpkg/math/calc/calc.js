const stars = require('../../../utils/stars')
const {
  randomCalcQuestion,
  beginFeedback,
  stopFeedbackTimer,
  advanceQuestion,
} = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: {
    stars: 0,
    question: null,
    dogImage: mediaUrl('/subpkg/math/static/dog.png'),
    retry: false,
    praise: false,
    locked: false,
  },

  onLoad() {
    this.applyQuestion()
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  onUnload() {
    stopFeedbackTimer(this)
  },

  applyQuestion() {
    const prev = this.data.question
    const avoidKey = prev ? `${prev.a}${prev.op}${prev.b}` : null
    this.setData({
      question: randomCalcQuestion(null, avoidKey),
      retry: false,
      praise: false,
      locked: false,
    })
  },

  choose(e) {
    if (this.data.locked || !this.data.question) return
    const value = Number(e.currentTarget.dataset.value)
    const correct = value === this.data.question.answer
    beginFeedback(this, correct)
    if (correct) {
      const qid = this.data.question.id
      Promise.all([
        stars.addStars({ delta: 1, reason: 'math', ref: qid }),
        trackDaily('math', `correct:${qid}`),
      ]).then(() => {
        this.setData({ stars: stars.getLocalStars() })
      })
    }
  },

  next() {
    advanceQuestion(this)
  },
})
