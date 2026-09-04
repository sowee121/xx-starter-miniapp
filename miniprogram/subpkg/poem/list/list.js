const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const { poemIcon } = require('../../../content/mascots')
const { goTo } = require('../../../utils/page')

Page({
  data: {
    stars: 0,
    poems: [],
  },

  onLoad() {
    this.setData({
      poems: poems.map((p) => ({
        ...p,
        icon: p.icon || poemIcon(p.id, p.cover),
      })),
    })
  },

  onShow() {
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  /** 打开详情 */
  onOpen(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id
    if (!id) return
    goTo(`/subpkg/poem/detail/detail?id=${encodeURIComponent(id)}`)
  },
})
