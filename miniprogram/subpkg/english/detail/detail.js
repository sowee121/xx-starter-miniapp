const { categories } = require('../content/english')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: { stars: 0, item: null },

  onLoad(q) {
    const item = [].concat(...categories.map((x) => x.items)).find((x) => x.word === q.word)
      || categories[0].items[0]
    this.setData({
      item: {
        ...item,
        image: mediaUrl(`/subpkg/english/static/${item.image}.png`),
      },
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  async play(e) {
    const item = this.data.item
    if (!item) return
    const kind = (e.currentTarget && e.currentTarget.dataset.kind) || 'word'
    const src = kind === 'sentence' ? item.sentenceAudio : item.audio
    if (src) {
      audioUtil.play(src)
    } else {
      wx.showToast({ title: '语音准备中', icon: 'none' })
    }
    if (item.word) {
      await trackDaily('english', item.word)
      this.setData({ stars: stars.getLocalStars() })
    }
  },

  onUnload() {
    audioUtil.stop()
  },
})
