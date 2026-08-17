const content = require('../content/math')
const stars = require('../../../utils/stars')
const {
  randomCountQuestion,
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
    count: 0,
    cols: 1,
    items: [],
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
    const avoid = this.data.question && this.data.question.answer
    const question = randomCountQuestion(content.fruitPool, avoid)
    const src = mediaUrl(`/subpkg/math/static/${question.fruit}.png`)
    this.setData({
      question,
      count: question.answer,
      cols: question.cols,
      items: Array.from({ length: question.answer }, () => src),
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
