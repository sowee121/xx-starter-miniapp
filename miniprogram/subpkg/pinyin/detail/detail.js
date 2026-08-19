const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback-copy')
Page({
  data: { stars: 0, item: null, softNote: '', feedback: { show: false, closing: false } },

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
    if (!item.audio) {
      feedback.showInline(this, INLINE.audioUnavailable, 'fail')
      return
    }
    audioUtil.play(item.audio, {
      onEnded: async () => {
        const result = await trackDaily('pinyin', item.letter)
        this.setData({ stars: stars.getLocalStars() })
        feedback.showTaskAward(this, result)
      },
      onError: feedback.audioFallback(this),
    })
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
