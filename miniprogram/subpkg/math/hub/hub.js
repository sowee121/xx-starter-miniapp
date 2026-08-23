const content = require('../content/math')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

Page({
  data: {
    stars: 0,
    fruitImage: mediaUrl(`/subpkg/math/static/${content.fruitImage}.png`),
    calcImage: mediaUrl(`/subpkg/math/static/${content.calcImage}.png`),
  },
  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },
  open(e) {
    const to = e.currentTarget.dataset.to
    wx.navigateTo({ url: `/subpkg/math/${to}/${to}` })
  },
})
