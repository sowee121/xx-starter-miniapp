const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { goTo } = require('../../../utils/page')

Page({
  data: {
    stars: 0,
    abcImage: mediaUrl('/subpkg/english/static/english-letter-a.png'),
    wordImage: mediaUrl('/subpkg/english/static/list/english-fruit-apple.png'),
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  /** 打开下一页 */
  open(e) {
    const to = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.to
    if (to === 'alphabet') {
      goTo('/subpkg/english-abc/list/list')
      return
    }
    goTo('/subpkg/english/list/list')
  },
})
