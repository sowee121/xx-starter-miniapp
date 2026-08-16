const audioUtil = require('../../utils/audio')
const starsUtil = require('../../utils/stars')

Page({
  data: {
    stars: 0,
    volume: 1,
    volumes: [0, 0.5, 1],
    resetDone: false,
    clearProgress: 0,
  },

  onShow() {
    this.setData({
      stars: starsUtil.getLocalStars(),
      volume: audioUtil.getVolume(),
    })
  },

  onVolume(e) {
    const volume = Number(e.currentTarget.dataset.value)
    wx.setStorageSync(audioUtil.VOLUME_KEY, volume)
    this.setData({ volume })
  },

  onResetProgress() {
    // P2 接通云函数 completeProgress 批量清理；P0 仅本地标记
    this.setData({ resetDone: true })
  },

  onClearStart() {
    this._clearStart = Date.now()
    this._clearTimer = setInterval(() => {
      const elapsed = Date.now() - this._clearStart
      const clearProgress = Math.min(100, Math.floor((elapsed / 3000) * 100))
      this.setData({ clearProgress })
      if (clearProgress >= 100) {
        clearInterval(this._clearTimer)
        this._clearTimer = null
        starsUtil.setLocalStars(0)
        const app = getApp()
        if (app.globalData.profile) {
          app.globalData.profile.stickers = []
          app.globalData.profile.badges = []
        }
        this.setData({ stars: 0 })
      }
    }, 50)
  },

  onClearEnd() {
    if (this._clearTimer) {
      clearInterval(this._clearTimer)
      this._clearTimer = null
    }
    if (this.data.clearProgress < 100) {
      this.setData({ clearProgress: 0 })
    }
  },

  onUnload() {
    if (this._clearTimer) clearInterval(this._clearTimer)
  },
})
