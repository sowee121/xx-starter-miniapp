const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')

function trailId(letter) {
  return letter === 'ü' ? 'umlaut-u' : letter
}

function buildTrail(currentLetter) {
  return vowels.map((v) => ({
    id: trailId(v.letter),
    letter: v.letter,
    current: v.letter === currentLetter,
  }))
}

function resolveItem(id) {
  const key = id === 'umlaut-u' ? 'ü' : (id || 'a')
  return vowels.find((x) => x.letter === key) || vowels[0]
}

Page({
  data: {
    stars: 0,
    item: null,
    trail: [],
    buddyIcon: mediaUrl('/subpkg/pinyin/static/buddy-duckling.png'),
    softNote: '',
    feedback: { show: false, closing: false },
  },

  onLoad(q) {
    this.applyItem(resolveItem(q.id))
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  applyItem(item) {
    this._visitStarAwarded = false
    this.setData({
      item: {
        ...item,
        image: mediaUrl(`/subpkg/pinyin/static/${item.asset}.png`),
      },
      trail: buildTrail(item.letter),
    })
  },

  onTrailTap(e) {
    const id = e.currentTarget.dataset.id
    const next = resolveItem(id)
    if (!next || (this.data.item && next.letter === this.data.item.letter)) return
    audioUtil.stop()
    this.applyItem(next)
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
