const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const { poemIcon } = require('../../../content/mascots')
const {
  playPreview,
  toggleLongPlay,
  attachLongPlay,
  detachLongPlay,
  playAfterRender,
  markPageReady,
} = require('../../../utils/read-award')
const audioUtil = require('../../../utils/audio')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/navbar')
const { queryValue } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

/** 补全古诗封面 */
function mapPoem(raw) {
  if (!raw) return null
  return {
    ...raw,
    icon: raw.icon || poemIcon(raw.id, raw.cover),
    tone: raw.tone || 'peach',
  }
}

/** 整首诗奖励参数 */
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
    playingSrc: '',
  },

  onLoad(query) {
    const id = queryValue(query, 'id')
    const found = poems.findIndex((p) => p.id === id)
    this.applyPoem(found >= 0 ? found : 0, true)
  },

  onShow() {
    attachLongPlay(this)
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  onReady() {
    markPageReady(this)
  },

  /** 渲染当前古诗 */
  applyPoem(index, autoPlay) {
    audioUtil.stop()
    const raw = poems[index]
    if (!raw) return
    const poem = mapPoem(raw)
    this._visitStarAwarded = false
    this.setData(
      {
        poem,
        poemTitle: poem.title || '古诗',
        poemAuthor: poem.author || '',
        activeIndex: -1,
        softNote: '',
        fullAward: fullAward(poem),
        longPlaying: false,
        playingSrc: '',
        nav: stepNavState(index, poems.length),
      },
      () => {
        if (autoPlay) playAfterRender(this, () => this.onFullPlay())
      },
    )
  },

  /** 上一题 */
  goPrev() {
    if (!this.data.nav.hasPrev) return
    this.applyPoem(this.data.nav.index - 1, true)
  },

  /** 下一题 */
  goNext() {
    if (!this.data.nav.hasNext) return
    this.applyPoem(this.data.nav.index + 1, true)
  },

  /** 点读一行诗 */
  onLineTap: tap(function (e) {
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
  }),

  /** 播放整首诗 */
  onFullPlay: tap(function () {
    const poem = this.data.poem
    if (!poem) return
    this.setData({ activeIndex: -1 })
    toggleLongPlay(this, { src: poem.fullAudio, award: this.data.fullAward })
  }),

  /** 关闭表扬层 */
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
