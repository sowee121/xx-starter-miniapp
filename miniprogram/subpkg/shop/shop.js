const stickers = require('./content/stickers')
const starsUtil = require('../../utils/stars')
const feedback = require('../../utils/feedback')
const feedbackBehavior = feedback.feedbackBehavior
const { LAYERS } = require('../../content/feedback')

/** 回顶滚动总时长（ms）；与 easeScrollTop 的缓动曲线配套，太快会显得生硬 */
const SCROLL_MS = 560

/** 缓出滚回顶部，避免原生 200ms 一顿到底 */
function easeScrollTop(page) {
  if (typeof wx.createSelectorQuery !== 'function' || typeof wx.pageScrollTo !== 'function') {
    return
  }
  wx.createSelectorQuery()
    .selectViewport()
    .scrollOffset()
    .exec((res) => {
      const start = (res && res[0] && res[0].scrollTop) || 0
      if (start <= 4) return
      const t0 = Date.now()
      const tick = () => {
        if (!page || page._destroyed) return
        const p = Math.min(1, (Date.now() - t0) / SCROLL_MS)
        const eased = 1 - (1 - p) * (1 - p) * (1 - p)
        wx.pageScrollTo({
          scrollTop: Math.round(start * (1 - eased)),
          duration: 0,
        })
        if (p < 1) {
          page._scrollTimer = setTimeout(tick, 16)
        }
      }
      if (page._scrollTimer) clearTimeout(page._scrollTimer)
      tick()
    })
}

Page({
  behaviors: [feedbackBehavior],

  data: {
    stars: 0,
    mine: [],
    shop: [],
    exchanging: false,
  },

  onShow() {
    this.paint()
    this.refresh()
  },

  /** 按本地星星拆成「我的」和货架 */
  paint() {
    const stars = starsUtil.getLocalStars()
    const owned = starsUtil.getOwnedStickers()
    const catalog = stickers.map((sticker) => ({
      ...sticker,
      owned: owned.includes(sticker.id),
      affordable: stars >= sticker.cost,
    }))
    this.setData({
      stars,
      mine: catalog.filter((item) => item.owned),
      shop: catalog.filter((item) => !item.owned),
    })
  },

  /** 同步云端后再重绘 */
  async refresh() {
    try {
      await starsUtil.ensureSession()
    } catch (error) {
      // 离线仍用本地星星画界面
    }
    this.paint()
  },

  /** 兑换贴纸（卡片抛出 exchange 事件，detail.id 为贴纸 id） */
  async onExchange(event) {
    if (this.data.exchanging) return
    const id = event.detail && event.detail.id
    const sticker = this.data.shop.find((item) => item.id === id)
    if (!sticker || !sticker.affordable) return

    this.setData({ exchanging: true })
    try {
      const result = await starsUtil.exchangeReward(id)
      if (!result || !result.ok) {
        feedback.showLayer(this, LAYERS.exchangeFailed)
        await this.refresh()
        return
      }
      await this.refresh()
      wx.nextTick(() => {
        easeScrollTop(this)
      })
      feedback.showLayer(this, LAYERS.exchangeSuccess)
    } catch (error) {
      feedback.showLayer(this, LAYERS.exchangeFailed)
    } finally {
      this.setData({ exchanging: false })
    }
  },

  onUnload() {
    this._destroyed = true
    if (this._scrollTimer) {
      clearTimeout(this._scrollTimer)
      this._scrollTimer = null
    }
  },
})
