const stickers = require('./content/stickers')
const starsUtil = require('../../utils/stars')
const feedback = require('../../utils/feedback')
const { LAYERS } = require('../../content/feedback')

Page({
  data: {
    stars: 0,
    stickers: [],
    exchanging: false,
    feedback: { show: false, closing: false },
  },

  onShow() {
    this.paint()
    this.refresh()
  },

  /** 按本地星星重绘商城 */
  paint() {
    const stars = starsUtil.getLocalStars()
    const owned = starsUtil.getOwnedStickers()
    this.setData({
      stars,
      stickers: stickers.map((sticker) => ({
        ...sticker,
        owned: owned.includes(sticker.id),
        affordable: stars >= sticker.cost,
      })),
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

  /** 兑换贴纸 */
  async onExchange(event) {
    if (this.data.exchanging) return
    const id = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id
    const sticker = this.data.stickers.find((item) => item.id === id)
    if (!sticker || sticker.owned || !sticker.affordable) return

    this.setData({ exchanging: true })
    try {
      const result = await starsUtil.exchangeReward(id)
      if (!result || !result.ok) {
        feedback.showLayer(this, LAYERS.exchangeFailed)
        await this.refresh()
        return
      }
      await this.refresh()
      feedback.showLayer(this, LAYERS.exchangeSuccess)
    } catch (error) {
      feedback.showLayer(this, LAYERS.exchangeFailed)
    } finally {
      this.setData({ exchanging: false })
    }
  },

  /** 关闭表扬层 */
  closePraise() {
    feedback.hideLayer(this)
  },
})
