const { poem, life } = require('../content/hanzi')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
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
    const char = decodeURIComponent(q.char || '入')
    const item = poem.concat(life).find((x) => x.char === char) || poem[0]
    this.setData({ item })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  play(e) {
    const item = this.data.item
    if (!item) return

    const kind = (e.currentTarget && e.currentTarget.dataset.kind) || 'char'
    if (kind === 'word') {
      const idx = Number(e.currentTarget.dataset.index)
      const src = (item.wordAudios && item.wordAudios[idx]) || ''
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
        const result = await trackDaily('hanzi', item.char)
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
