const starsUtil = require('../../utils/stars')
const { getModule } = require('../../content/modules')
const { HOME_ASSETS } = require('../../content/mascots')

Page({
  data: {
    stars: 0,
    title: '这个板块',
    mascot: HOME_ASSETS.penguin,
  },

  onLoad(query) {
    const mod = getModule(query.module)
    this.setData({
      title: (mod && mod.title) || decodeURIComponent(query.title || '这个板块'),
    })
  },

  onShow() {
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  onGoHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },
})
