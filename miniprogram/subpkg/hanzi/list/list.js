const { categories } = require('../content/hanzi')
const { toneOf } = require('../content/tones')
const stars = require('../../../utils/stars')
const { goTo } = require('../../../utils/page')

Page({
  data: {
    stars: 0,
    categories: [],
  },

  onLoad() {
    this.setData({
      categories: categories.map((c) => ({
        ...c,
        tone: toneOf(c.id),
      })),
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  /** 打开下一页 */
  open(e) {
    const ds = (e.currentTarget && e.currentTarget.dataset) || {}
    if (!ds.char) return
    goTo(`/subpkg/hanzi/detail/detail?char=${encodeURIComponent(ds.char)}&cat=${ds.cat || ''}`)
  },
})
