const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { poemIcon } = require('../../../content/mascots')
const { trackDaily } = require('../../../utils/daily-tasks')
const feedback = require('../../../utils/feedback')
const { INLINE } = require('../../../content/feedback-copy')

Page({
  data: {
    stars: 0,
    poem: null,
    poemTitle: '古诗',
    poemAuthor: '',
    activeIndex: -1,
    softNote: '',
    feedback: { show: false, closing: false },
  },

  onLoad(query) {
    const raw = poems.find((p) => p.id === query.id) || poems[0] || null
    if (!raw) return
    const poem = {
      ...raw,
      icon: raw.icon || poemIcon(raw.id, raw.cover),
    }
    this.setData({
      poem,
      poemTitle: poem.title || '古诗',
      poemAuthor: poem.author || '',
    })
  },

  onShow() {
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  onLineTap(e) {
    const index = Number(e.detail && e.detail.index)
    const line = this.data.poem && this.data.poem.lines[index]
    if (!line) return
    this.setData({ activeIndex: index })
    if (line.audio) {
      audioUtil.play(line.audio, { onError: feedback.audioFallback(this) })
    } else {
      feedback.showInline(this, INLINE.audioUnavailable, 'fail')
    }
  },

  onFullRead() {
    const poem = this.data.poem
    if (!poem) return
    this.setData({ activeIndex: -1 })
    if (!poem.fullAudio) {
      feedback.showInline(this, INLINE.audioUnavailable, 'fail')
      return
    }
    audioUtil.play(poem.fullAudio, {
      onEnded: async () => {
        const result = await trackDaily('poem', poem.id)
        this.setData({ stars: starsUtil.getLocalStars() })
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
