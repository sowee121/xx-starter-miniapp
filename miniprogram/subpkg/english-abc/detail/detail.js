const { letters } = require('../content/alphabet')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPrimaryAndAward, playAfterRender, markPageReady } = require('../../../utils/read-award')
const { feedbackBehavior } = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/navbar')
const { queryValue } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

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
  behaviors: [feedbackBehavior],

  data: {
    stars: 0,
    item: null,
    nav: stepNavState(0, 0),
    playingSrc: '',
  },

  onLoad(q) {
    this.applyItem(findIndex(queryValue(q, 'letter')), true)
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  onReady() {
    markPageReady(this)
  },

  /** 渲染当前条目 */
  applyItem(index, autoPlay) {
    const raw = letters[index]
    if (!raw) return
    this._visitStarAwarded = false
    audioUtil.stop()
    this.setData(
      {
        item: mapItem(raw),
        barText: '',
        nav: stepNavState(index, letters.length),
      },
      () => {
        if (autoPlay) playAfterRender(this, () => this.play())
      },
    )
  },

  /** 上一题 */
  goPrev() {
    if (!this.data.nav.hasPrev) return
    this.applyItem(this.data.nav.index - 1, true)
  },

  /** 下一题 */
  goNext() {
    if (!this.data.nav.hasNext) return
    this.applyItem(this.data.nav.index + 1, true)
  },

  /** 立即播放一段音频 */
  play: tap(function () {
    const item = this.data.item
    if (!item) return
    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'english',
      unitKey: `letter:${item.letter}`,
      reason: 'letter_done',
      ref: item.letter,
    })
  }),

  onUnload() {
    audioUtil.stop()
  },
})
