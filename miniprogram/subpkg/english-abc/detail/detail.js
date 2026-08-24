const { letters } = require('../content/alphabet')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/navbar')
const { queryValue } = require('../../../utils/page')

/** 补全条目展示字段 */
function mapItem(item) {
  return {
    ...item,
    image: mediaUrl(`/subpkg/english-abc/static/${item.image}.png`),
  }
}

/** 按字母定位下标 */
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
    this.applyItem(findIndex(queryValue(q, 'letter')))
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  /** 渲染当前条目 */
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

  /** 上一题 */
  goPrev() {
    if (!this.data.nav.hasPrev) return
    this.applyItem(this.data.nav.index - 1)
  },

  /** 下一题 */
  goNext() {
    if (!this.data.nav.hasNext) return
    this.applyItem(this.data.nav.index + 1)
  },

  /** 立即播放一段音频 */
  play() {
    const item = this.data.item
    if (!item) return
    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'english',
      unitKey: `letter:${item.letter}`,
      reason: 'letter_done',
      ref: item.letter,
    })
  },

  /** 关闭表扬层 */
  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
