const { categories } = require('../content/english')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

const TONE_MAP = {
  fruit: 'rose',
  animal: 'butter',
  color: 'sky',
  body: 'matcha',
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
        items: c.items.map((x) => ({
          ...x,
          image: mediaUrl(`/subpkg/english/static/${x.image}.png`),
        })),
      })),
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  open(e) {
    wx.navigateTo({
      url: `/subpkg/english/detail/detail?word=${e.currentTarget.dataset.word}`,
    })
  },
})
