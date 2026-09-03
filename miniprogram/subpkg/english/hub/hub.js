const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { goTo } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

Page({
  data: {
    stars: 0,
    entries: [
      {
        image: mediaUrl('/subpkg/english/static/english-letter-a.png'),
        title: '字母表',
        sub: 'A ~ Z',
        tone: 'sky',
        to: 'alphabet',
      },
      {
        image: mediaUrl('/subpkg/english/static/english-fruit-apple.png'),
        title: '单词',
        sub: '听一听，说一说',
        tone: 'rose',
        to: 'words',
      },
    ],
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  /** 打开下一页 */
  open: tap(function (e) {
    const to = e.detail && e.detail.to
    if (to === 'alphabet') {
      goTo('/subpkg/english-abc/list/list')
      return
    }
    goTo('/subpkg/english/list/list')
  }),
})
