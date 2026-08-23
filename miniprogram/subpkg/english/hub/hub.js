const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

Page({
  data: {
    stars: 0,
    abcImage: mediaUrl('/subpkg/english/static/english-letter-a.png'),
    wordImage: mediaUrl('/subpkg/english/static/english-fruit-apple.png'),
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  open(e) {
    const to = e.currentTarget.dataset.to
    if (to === 'alphabet') {
      wx.navigateTo({ url: '/subpkg/english-abc/list/list' })
      return
    }
    wx.navigateTo({ url: '/subpkg/english/list/list' })
  },
})
