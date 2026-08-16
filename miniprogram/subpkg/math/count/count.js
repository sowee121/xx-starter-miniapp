const content = require('../content/math')
const stars = require('../../../utils/stars')
const { randomCountQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: {
    stars: 0,
    question: null,
    count: 0,
    cols: 1,
    items: [],
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
    const avoid = this.data.question && this.data.question.answer
    const question = randomCountQuestion(content.fruitPool, avoid)
    const src = mediaUrl(`/subpkg/math/static/${question.fruit}.png`)
    this.setData({
      question,
      count: question.answer,
      cols: question.cols,
      items: Array.from({ length: question.answer }, () => src),
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
