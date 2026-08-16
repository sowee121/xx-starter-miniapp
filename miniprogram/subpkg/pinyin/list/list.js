const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

Page({
  data: { stars: 0, items: [] },
  onLoad() {
    this.setData({
      items: vowels.map((x) => ({
        ...x,
        image: mediaUrl(`/subpkg/pinyin/static/${x.asset}.png`),
        id: x.letter === 'ü' ? 'umlaut-u' : x.letter,
      })),
    })
  },
  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },
  open(e) {
    wx.navigateTo({ url: `/subpkg/pinyin/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
})
