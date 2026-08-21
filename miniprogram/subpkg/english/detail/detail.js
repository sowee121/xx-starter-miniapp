const { categories } = require('../content/english')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
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
    const item = [].concat(...categories.map((x) => x.items)).find((x) => x.word === q.word)
      || categories[0].items[0]
    this._visitStarAwarded = false
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
