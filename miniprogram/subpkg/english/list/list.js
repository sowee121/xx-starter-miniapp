const { categories } = require('../content/english')
const { toneOf } = require('../content/tones')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')

/** 媒体分包：body/transport→english-extra；number/food/nature→english-more */
const MEDIA_PKG = {
  body: 'english-extra',
  transport: 'english-extra',
  number: 'english-more',
  food: 'english-more',
  nature: 'english-more',
}

function imageUrl(catId, image) {
  const pkg = MEDIA_PKG[catId] || 'english'
  return mediaUrl(`/subpkg/${pkg}/static/${image}.png`)
}

function loadMediaPackages() {
  if (typeof wx.loadSubpackage !== 'function') return
  ;['english-extra', 'english-more'].forEach((name) => {
    wx.loadSubpackage({ name }).catch(() => {})
  })
}

Page({
  data: {
    stars: 0,
    categories: [],
  },

  onLoad() {
    loadMediaPackages()
    this.setData({
      categories: categories.map((c) => ({
        ...c,
        tone: toneOf(c.id),
        items: c.items.map((x) => ({
          ...x,
          image: imageUrl(c.id, x.image),
        })),
      })),
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  open(e) {
    const { word, cat } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/subpkg/english/detail/detail?word=${word}&cat=${cat || ''}`,
    })
  },
})
