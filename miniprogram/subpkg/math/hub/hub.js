const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

Page({
  data: {
    stars: 0,
    countImage: mediaUrl('/subpkg/math/static/apple-english.png'),
    calcImage: mediaUrl('/subpkg/math/static/dog.png'),
  },
  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },
  open(e) {
    const to = e.currentTarget.dataset.to
    wx.navigateTo({ url: `/subpkg/math/${to}/${to}` })
  },
})
