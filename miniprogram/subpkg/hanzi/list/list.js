const { poem, life } = require('../content/hanzi')
const stars = require('../../../utils/stars')

Page({
  data: {
    stars: 0,
    title: '古诗里的字',
    tone: 'sky',
    items: [],
  },

  onLoad(q) {
    const lib = q.lib === 'life' ? 'life' : 'poem'
    this.setData({
      title: lib === 'life' ? '生活里的字' : '古诗里的字',
      tone: lib === 'life' ? 'peach' : 'sky',
      items: lib === 'life' ? life : poem,
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  open(e) {
    wx.navigateTo({
      url: `/subpkg/hanzi/detail/detail?char=${encodeURIComponent(e.currentTarget.dataset.char)}`,
    })
  },
})
