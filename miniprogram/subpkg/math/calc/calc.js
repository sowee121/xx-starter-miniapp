const stars = require('../../../utils/stars')
const { randomCalcQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: {
    stars: 0,
    question: null,
    dogImage: mediaUrl('/subpkg/math/static/dog.png'),
    retry: false,
    praise: false,
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
      retry: false,
    })
  },

  async choose(e) {
    const value = Number(e.currentTarget.dataset.value)
    if (value !== this.data.question.answer) {
      this.setData({ retry: true })
      return
    }
    await stars.addStars({ delta: 1, reason: 'math', ref: this.data.question.id })
    await trackDaily('math', `correct:${this.data.question.id}`)
    this.setData({
      stars: stars.getLocalStars(),
      retry: false,
      praise: true,
    })
  },

  next() {
    this.setData({ praise: false, retry: false })
    this.applyQuestion()
  },
})
