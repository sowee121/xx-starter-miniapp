const { categories } = require('../content/english-words')
const { toneOf, listImageUrl, detailPageUrl, mediaOwner } = require('../lib/english-media')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { loadThenGo } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

/** 列表词图地址 */
function imageUrl(catId, image) {
  return listImageUrl(mediaUrl, catId, image)
}

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

  /** 打开下一页 */
  open: tap(function (e) {
    const ds = (e.currentTarget && e.currentTarget.dataset) || {}
    const word = ds.word
    const cat = ds.cat
    const url = detailPageUrl(word, cat)
    if (!url) return
    loadThenGo(mediaOwner(cat), url)
  }),
})
