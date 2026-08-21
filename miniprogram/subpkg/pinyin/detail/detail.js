const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')

Page({
  data: { stars: 0, item: null, softNote: '', feedback: { show: false, closing: false } },

  onLoad(q) {
    const key = q.id === 'umlaut-u' ? 'ü' : (q.id || 'a')
    const item = vowels.find((x) => x.letter === key) || vowels[0]
    this._visitStarAwarded = false
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

  play() {
    const item = this.data.item
    if (!item) return
    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'pinyin',
      unitKey: item.letter,
      reason: 'pinyin_done',
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
