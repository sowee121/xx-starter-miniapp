const { categories } = require('../content/english')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback-copy')

Page({
  data: {
    stars: 0,
    item: null,
    softNote: '',
    feedback: { show: false, closing: false },
  },

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

  play(e) {
    const item = this.data.item
    if (!item) return
    const kind = (e.currentTarget && e.currentTarget.dataset.kind) || 'word'

    if (kind === 'sentence') {
      const src = item.sentenceAudio
      if (src) {
        audioUtil.play(src, { onError: feedback.audioFallback(this) })
      } else {
        feedback.showInline(this, INLINE.audioUnavailable, 'fail')
      }
      return
    }

    if (!item.audio) {
      feedback.showInline(this, INLINE.audioUnavailable, 'fail')
      return
    }
    audioUtil.play(item.audio, {
      onEnded: async () => {
        const result = await trackDaily('english', item.word)
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
