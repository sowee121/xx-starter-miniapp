const { vowels } = require('../content/pinyin')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const { playPrimaryAndAward, playAfterRender, markPageReady } = require('../../../utils/read-award')
const { feedbackBehavior } = require('../../../utils/feedback')
const { queryValue } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

/** 拼音石子径 id */
function trailId(letter) {
  return letter === 'ü' ? 'umlaut-u' : letter
}

/** 拼音石子径数据 */
function buildTrail(currentLetter) {
  return vowels.map((v) => ({
    id: trailId(v.letter),
    letter: v.letter,
    current: v.letter === currentLetter,
  }))
}

/** 按 id 取韵母 */
function resolveItem(id) {
  const key = id === 'umlaut-u' ? 'ü' : id || 'a'
  return vowels.find((x) => x.letter === key) || vowels[0]
}

Page({
  behaviors: [feedbackBehavior],

  data: {
    stars: 0,
    item: null,
    trail: [],
    buddyIcon: mediaUrl('/subpkg/pinyin/static/buddy-duckling.png'),
    playingSrc: '',
  },

  onLoad(q) {
    this._visitStarAwarded = false
    this.applyItem(resolveItem(queryValue(q, 'id', 'a')), true)
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  onReady() {
    markPageReady(this)
  },

  /** 渲染当前条目 */
  applyItem(item, autoPlay) {
    if (!item || !item.asset) return
    this.setData(
      {
        item: {
          ...item,
          image: mediaUrl(`/subpkg/pinyin/static/${item.asset}.png`),
        },
        trail: buildTrail(item.letter),
      },
      () => {
        if (autoPlay) playAfterRender(this, () => this.play())
      },
    )
  },

  /** 点拼音石子 */
  onTrailTap: tap(function (e) {
    const id = e.detail.id
    const next = resolveItem(id)
    if (!next) return
    if (this.data.item && next.letter === this.data.item.letter) {
      this.play()
      return
    }
    audioUtil.stop()
    this.applyItem(next, true)
  }),

  /** 立即播放一段音频 */
  play: tap(function () {
    const item = this.data.item
    if (!item) return
    playPrimaryAndAward(this, {
      src: item.audio,
      taskId: 'pinyin',
      unitKey: item.letter,
      reason: 'pinyin_done',
      ref: item.letter,
    })
  }),

  onUnload() {
    audioUtil.stop()
  },
})
