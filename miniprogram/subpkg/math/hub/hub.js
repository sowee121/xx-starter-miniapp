const content = require('../content/math')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { goTo } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

Page({
  data: {
    stars: 0,
    entries: [
      {
        image: mediaUrl(`/subpkg/math/static/${content.fruitImage}.png`),
        title: '数一数',
        sub: '1 到 10',
        tone: 'rose',
        to: 'count',
      },
      {
        image: mediaUrl(`/subpkg/math/static/${content.calcImage}.png`),
        title: '算一算',
        sub: '1 到 10',
        tone: 'sand',
        to: 'calc',
      },
    ],
  },
  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },
  /** 打开下一页 */
  open: tap(function (e) {
    const to = e.detail && e.detail.to
    if (to !== 'count' && to !== 'calc') return
    goTo(`/subpkg/math/${to}/${to}`)
  }),
})
