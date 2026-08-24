const content = require('../content/math')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { goTo } = require('../../../utils/page')

Page({
  data: {
    stars: 0,
    fruitImage: mediaUrl(`/subpkg/math/static/${content.fruitImage}.png`),
    calcImage: mediaUrl(`/subpkg/math/static/${content.calcImage}.png`),
  },
  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },
  /** 打开下一页 */
  open(e) {
    const to = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.to
    if (to !== 'count' && to !== 'calc') return
    goTo(`/subpkg/math/${to}/${to}`)
  },
})
