const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const { poemIcon } = require('../../../content/mascots')
const {
  playPreview,
  toggleLongPlay,
  attachLongPlay,
  detachLongPlay,
} = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/navbar')

function mapPoem(raw) {
  if (!raw) return null
  return {
    ...raw,
    icon: raw.icon || poemIcon(raw.id, raw.cover),
    tone: raw.tone || 'peach',
  }
}

function fullAward(poem) {
  if (!poem) return null
  return {
    taskId: 'poem',
    unitKey: poem.id,
    reason: 'poem_done',
    ref: poem.id,
  }
}

Page({
  data: {
    stars: 0,
    poem: null,
    poemTitle: '古诗',
    poemAuthor: '',
    activeIndex: -1,
    softNote: '',
    nav: stepNavState(0, 0),
    feedback: { show: false, closing: false },
    fullAward: null,
    longPlaying: false,
  },

  onLoad(query) {
    const index = Math.max(0, poems.findIndex((p) => p.id === query.id))
    this.applyPoem(index >= 0 ? index : 0)
  },

  onShow() {
    attachLongPlay(this)
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  applyPoem(index) {
    const raw = poems[index]
    if (!raw) return
    const poem = mapPoem(raw)
    this._visitStarAwarded = false
    this.setData({
      poem,
      poemTitle: poem.title || '古诗',
      poemAuthor: poem.author || '',
      activeIndex: -1,
      softNote: '',
      fullAward: fullAward(poem),
      longPlaying: false,
      nav: stepNavState(index, poems.length),
    })
  },

  goPrev() {
    if (!this.data.nav.hasPrev) return
    this.applyPoem(this.data.nav.index - 1)
  },

  goNext() {
    if (!this.data.nav.hasNext) return
    this.applyPoem(this.data.nav.index + 1)
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

  onFullPlay() {
    const poem = this.data.poem
    if (!poem) return
    this.setData({ activeIndex: -1 })
    toggleLongPlay(this, { src: poem.fullAudio, award: this.data.fullAward })
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onHide() {
    detachLongPlay(this)
  },

  onUnload() {
    detachLongPlay(this)
  },
})
