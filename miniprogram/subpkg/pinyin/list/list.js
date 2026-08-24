const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { goTo } = require('../../../utils/page')

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
  /** 打开下一页 */
  open(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id
    if (!id) return
    goTo(`/subpkg/pinyin/detail/detail?id=${encodeURIComponent(id)}`)
  },
})
