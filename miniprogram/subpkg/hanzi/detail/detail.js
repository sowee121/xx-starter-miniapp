const { poem, life } = require('../content/hanzi')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { playPreview, playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')

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
    this._visitStarAwarded = false
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
      playPreview(this, (item.wordAudios && item.wordAudios[idx]) || '')
      return
    }

    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'hanzi',
      unitKey: item.char,
      reason: 'char_done',
      ref: item.char,
    })
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
