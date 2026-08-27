const { categories } = require('../content/hanzi')
const { toneOf } = require('../content/tones')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { playPreview, playPrimaryAndAward } = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/navbar')
const { queryValue } = require('../../../utils/page')

/** 按字或分类定位词库 */
function findCategory(char, catId) {
  if (catId) {
    const hit = categories.find((c) => c.id === catId)
    if (hit && hit.items.some((x) => x.char === char)) return hit
  }
  return categories.find((c) => c.items.some((x) => x.char === char)) || categories[0] || null
}

Page({
  data: {
    stars: 0,
    item: null,
    tone: 'cream',
    softNote: '',
    nav: stepNavState(0, 0),
    feedback: { show: false, closing: false },
    playingSrc: '',
  },

  onLoad(q) {
    const char = queryValue(q, 'char', '一')
    const cat = findCategory(char, queryValue(q, 'cat'))
    if (!cat) return
    this._catId = cat.id
    this._items = cat.items || []
    let index = this._items.findIndex((x) => x.char === char)
    if (index < 0) index = 0
    this.applyItem(index)
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  /** 渲染当前条目 */
  applyItem(index) {
    const items = this._items || []
    const item = items[index]
    if (!item) return
    this._visitStarAwarded = false
    audioUtil.stop()
    this.setData({
      item,
      tone: toneOf(this._catId),
      softNote: '',
      nav: stepNavState(index, items.length),
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

  /** 关闭表扬层 */
  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    audioUtil.stop()
  },
})
