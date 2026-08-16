const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const { poemIcon } = require('../../../content/mascots')

const TONES = ['sky', 'lilac', 'butter', 'matcha', 'peach', 'mint']

Page({
  data: {
    stars: 0,
    poems: [],
  },

  onLoad() {
    this.setData({
      poems: poems.map((p, index) => ({
        ...p,
        icon: p.icon || poemIcon(p.id, p.cover),
        tone: TONES[index % TONES.length],
      })),
    })
  },

  onShow() {
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/subpkg/poem/detail/detail?id=${id}` })
  },
})
