const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { poemIcon } = require('../../../content/mascots')
const { playPreview, playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')

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
    this._visitStarAwarded = false
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
    const detail = e.detail || {}
    const index = Number(
      Object.prototype.hasOwnProperty.call(detail, 'index')
        ? detail.index
        : e.currentTarget.dataset.index
    )
    const line = this.data.poem && this.data.poem.lines[index]
    if (!line) return
    this.setData({ activeIndex: index })
    playPreview(this, line.audio)
  },

  onFullRead() {
    const poem = this.data.poem
    if (!poem) return
    this.setData({ activeIndex: -1 })
    playPrimaryAndAward(this, {
      src: poem.fullAudio,
      taskId: 'poem',
      unitKey: poem.id,
      reason: 'poem_done',
      ref: poem.id,
    })
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
