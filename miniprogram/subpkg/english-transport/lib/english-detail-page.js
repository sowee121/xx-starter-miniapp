const { categories } = require('../content/english-words')
const {
  toneOf,
  detailImageUrl,
  detailPageUrl,
  mediaOwner,
  wordOwner,
  catIdOfPackage,
} = require('./english-media')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { mediaUrl } = require('../../../config/media')
const {
  playPreview,
  playPrimaryAndAward,
  playAfterRender,
  markPageReady,
} = require('../../../utils/read-award')
const feedback = require('../../../utils/feedback')
const { stepNavState } = require('../../../utils/navbar')
const { queryValue, goTo } = require('../../../utils/page')
const { tap } = require('../../../utils/tap-guard')

/** 补全条目展示字段 */
function mapItem(item, catId) {
  return {
    ...item,
    image: detailImageUrl(mediaUrl, catId, item.image),
  }
}

/** 按字或分类定位词库 */
function findCategory(word, catId) {
  if (catId) {
    const byId = categories.find((c) => c.id === catId)
    if (byId && byId.items.some((x) => x.word === word)) return byId
  }
  return categories.find((c) => c.items.some((x) => x.word === word)) || null
}

/** 生成英语详情 Page */
function createEnglishDetailPage(pkg) {
  if (!pkg) {
    throw new Error('createEnglishDetailPage(pkg) 必须传入当前分包名')
  }
  return {
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
      const fallback = categories[0] && categories[0].items[0] && categories[0].items[0].word
      const word = queryValue(q, 'word', fallback)
      const catId = queryValue(q, 'cat')
      if (!word) return
      const owner = wordOwner(word, catId)
      if (owner && owner !== pkg) {
        const destCat = (catId && mediaOwner(catId) && catId) || catIdOfPackage(owner)
        const url = detailPageUrl(word, destCat)
        if (url) goTo(url, { mode: 'redirect' })
        return
      }
      const cat = findCategory(word, catId)
      if (!cat) return
      const dest = mediaOwner(cat.id)
      if (dest !== pkg) {
        const url = detailPageUrl(word, cat.id)
        if (url) goTo(url, { mode: 'redirect' })
        return
      }
      this._catId = cat.id
      this._items = cat.items || []
      let index = this._items.findIndex((x) => x.word === word)
      if (index < 0) index = 0
      this.applyItem(index, true)
    },

    onShow() {
      this.setData({ stars: stars.getLocalStars() })
    },

    onReady() {
      markPageReady(this)
    },

    /** 渲染当前条目 */
    applyItem(index, autoPlay) {
      const items = this._items || []
      const raw = items[index]
      if (!raw) return
      this._visitStarAwarded = false
      audioUtil.stop()
      this.setData(
        {
          item: mapItem(raw, this._catId),
          tone: toneOf(this._catId),
          softNote: '',
          nav: stepNavState(index, items.length),
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
    play: tap(function (e) {
      const item = this.data.item
      if (!item) return
      const kind = (e && e.currentTarget && e.currentTarget.dataset.kind) || 'word'
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
    }),

    /** 关闭表扬层 */
    closePraise() {
      feedback.hideLayer(this)
    },

    onUnload() {
      audioUtil.stop()
    },
  }
}

module.exports = { createEnglishDetailPage }
