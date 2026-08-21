const stickers = require('../content/stickers')
const starsUtil = require('../../../utils/stars')
const feedback = require('../../../utils/feedback')
const { LAYERS } = require('../../../content/feedback')

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

  async refresh() {
    await starsUtil.ensureSession()
    this.paint()
  },

  async onExchange(event) {
    if (this.data.exchanging) return
    const id = event.currentTarget.dataset.id
    const sticker = this.data.stickers.find((item) => item.id === id)
    if (!sticker || sticker.owned || !sticker.affordable) return

    this.setData({ exchanging: true })
    const result = await starsUtil.exchangeReward(id)
    this.setData({ exchanging: false })

    if (!result.ok) {
      feedback.showLayer(this, LAYERS.exchangeFailed)
      await this.refresh()
      return
    }

    await this.refresh()
    feedback.showLayer(this, LAYERS.exchangeSuccess)
  },

  closePraise() {
    feedback.hideLayer(this)
  },
})
