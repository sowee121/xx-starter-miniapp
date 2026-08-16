const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

Page({
  data: {
    stars: 0,
    poemImage: mediaUrl('/subpkg/hanzi/static/hanzi-hub-poem.png'),
    lifeImage: mediaUrl('/subpkg/hanzi/static/hanzi-hub-life.png'),
  },
  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },
  open(e) {
    wx.navigateTo({ url: `/subpkg/hanzi/list/list?lib=${e.currentTarget.dataset.lib}` })
  },
})
