const { categories } = require('../content/english')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPreview, playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/trail-nav')

const MEDIA_PKG = {
  body: 'english-extra',
  transport: 'english-extra',
  number: 'english-more',
  food: 'english-more',
  nature: 'english-more',
}

function mapItem(item, catId) {
  const pkg = MEDIA_PKG[catId] || 'english'
  return {
    ...item,
    image: mediaUrl(`/subpkg/${pkg}/static/${item.image}.png`),
  }
}

function findCategory(word, catId) {
  if (catId) {
    const byId = categories.find((c) => c.id === catId)
    if (byId && byId.items.some((x) => x.word === word)) return byId
  }
  return categories.find((c) => c.items.some((x) => x.word === word)) || categories[0]
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
    if (typeof wx.loadSubpackage === 'function') {
      ;['english-extra', 'english-more'].forEach((name) => {
        wx.loadSubpackage({ name }).catch(() => {})
      })
    }
    const word = q.word || (categories[0] && categories[0].items[0] && categories[0].items[0].word)
    const cat = findCategory(word, q.cat)
    this._catId = cat.id
    this._items = cat.items
    let index = this._items.findIndex((x) => x.word === word)
    if (index < 0) index = 0
    this.applyItem(index)
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  applyItem(index) {
    const raw = this._items[index]
    if (!raw) return
    this._visitStarAwarded = false
    audioUtil.stop()
    this.setData({
      item: mapItem(raw, this._catId),
      softNote: '',
      nav: stepNavState(index, this._items.length),
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

  play(e) {
    const item = this.data.item
    if (!item) return
    const kind = (e.currentTarget && e.currentTarget.dataset.kind) || 'word'

    if (kind === 'sentence') {
      playPreview(this, item.sentenceAudio)
      return
    }

    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'english',
      unitKey: item.word,
      reason: 'word_done',
      ref: item.word,
    })
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
