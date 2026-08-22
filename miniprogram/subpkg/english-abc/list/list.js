const { letters } = require('../content/alphabet')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

Page({
  data: {
    stars: 0,
    items: [],
  },

  onLoad() {
    this.setData({
      items: letters.map((x) => ({
        ...x,
        image: mediaUrl(`/subpkg/english-abc/static/${x.image}.png`),
        id: x.letter,
      })),
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  open(e) {
    const letter = e.currentTarget.dataset.letter
    wx.navigateTo({
      url: `/subpkg/english-abc/detail/detail?letter=${letter || ''}`,
    })
  },
})
