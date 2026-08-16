const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: { stars: 0, item: null },

  onLoad(q) {
    const key = q.id === 'umlaut-u' ? 'ü' : (q.id || 'a')
    const item = vowels.find((x) => x.letter === key) || vowels[0]
    this.setData({
      item: {
        ...item,
        image: mediaUrl(`/subpkg/pinyin/static/${item.asset}.png`),
      },
    })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  async play() {
    const item = this.data.item
    if (!item) return
    if (item.audio) {
      audioUtil.play(item.audio)
    } else {
      wx.showToast({ title: '语音准备中', icon: 'none' })
    }
    if (item.letter) {
      await trackDaily('pinyin', item.letter)
      this.setData({ stars: stars.getLocalStars() })
    }
  },

  onUnload() {
    audioUtil.stop()
  },
})
