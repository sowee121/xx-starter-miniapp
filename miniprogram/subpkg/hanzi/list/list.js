const { categories } = require('../content/hanzi')
const { toneOf } = require('../content/tones')
const stars = require('../../../utils/stars')

Page({
  data: {
    stars: 0,
    categories: [],
  },

  onLoad() {
    this.setData({
      categories: categories.map((c) => ({
        ...c,
        tone: toneOf(c.id),
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
