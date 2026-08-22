const { categories } = require('../content/hanzi')
const stars = require('../../../utils/stars')

const TONE_MAP = {
  number: 'peach',
  color: 'cream',
  animal: 'butter',
  family: 'rose',
  body: 'matcha',
  nature: 'lilac',
  place: 'sky',
  transport: 'peach',
}

Page({
  data: {
    stars: 0,
    categories: [],
  },

  onLoad() {
    this.setData({
      categories: categories.map((c) => ({
        ...c,
        tone: TONE_MAP[c.id] || 'cream',
      })),
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  open(e) {
    const { char, cat } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/subpkg/hanzi/detail/detail?char=${encodeURIComponent(char)}&cat=${cat}`,
    })
  },
})
