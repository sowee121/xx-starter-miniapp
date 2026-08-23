const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const { poemIcon } = require('../../../content/mascots')

Page({
  data: {
    stars: 0,
    poems: [],
  },

  onLoad() {
    this.setData({
      poems: poems.map((p) => ({
        ...p,
        icon: p.icon || poemIcon(p.id, p.cover),
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
