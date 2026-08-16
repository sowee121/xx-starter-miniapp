const stickers = require('../content/stickers')
const starsUtil = require('../../../utils/stars')

const OWNED_KEY = 'owned_stickers'

function getOwned() {
  try {
    const value = wx.getStorageSync(OWNED_KEY)
    return Array.isArray(value) ? value : []
  } catch (error) {
    return []
  }
}

Page({
  data: { stars: 0, stickers: [] },

  onShow() {
    this.refresh()
  },

  refresh() {
    const stars = starsUtil.getLocalStars()
    const owned = getOwned()
    this.setData({
      stars,
      stickers: stickers.map((sticker) => ({
        ...sticker,
        owned: owned.includes(sticker.id),
        affordable: stars >= sticker.cost,
      })),
    })
  },

  onExchange(event) {
    const id = event.currentTarget.dataset.id
    const sticker = stickers.find((item) => item.id === id)
    const owned = getOwned()
    const stars = starsUtil.getLocalStars()
    if (!sticker || owned.includes(id)) return
    if (stars < sticker.cost) {
      wx.showToast({ title: '再攒一点星星吧', icon: 'none' })
      return
    }
    const nextOwned = owned.concat(id)
    try {
      wx.setStorageSync(OWNED_KEY, nextOwned)
    } catch (error) {
      // 即使存储不可用，积分仍不会被错误扣除。
      wx.showToast({ title: '暂时不能保存贴纸', icon: 'none' })
      return
    }
    starsUtil.setLocalStars(stars - sticker.cost)
    this.refresh()
    wx.showToast({ title: `得到${sticker.name}贴纸`, icon: 'success' })
  },
})
