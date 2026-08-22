const { letters } = require('../content/alphabet')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/trail-nav')

function mapItem(item) {
  return {
    ...item,
    image: mediaUrl(`/subpkg/english-abc/static/${item.image}.png`),
  }
}

function findIndex(letter) {
  const key = (letter || '').toUpperCase()
  const index = letters.findIndex((x) => x.letter === key)
  return index < 0 ? 0 : index
}

Page({
  data: {
    stars: 0,
    item: null,
    softNote: '',
    nav: stepNavState(0, 0),
    feedback: { show: false, closing: false },
  },

  onLoad(q) {
    this.applyItem(findIndex(q.letter))
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  applyItem(index) {
    const raw = letters[index]
    if (!raw) return
    this._visitStarAwarded = false
    audioUtil.stop()
    this.setData({
      item: mapItem(raw),
      softNote: '',
      nav: stepNavState(index, letters.length),
    })
  },

  goPrev() {
    if (!this.data.nav.hasPrev) return
    this.applyItem(this.data.nav.index - 1)
  },

  goNext() {
    if (!this.data.nav.hasNext) return
    this.applyItem(this.data.nav.index + 1)
  },

  play() {
    const item = this.data.item
    if (!item) return
    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'english',
      unitKey: item.letter,
      reason: 'letter_done',
      ref: item.letter,
    })
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
