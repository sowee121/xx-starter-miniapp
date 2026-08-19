const audioUtil = require('../../utils/audio')
const progressUtil = require('../../utils/progress')
const starsUtil = require('../../utils/stars')

Page({
  data: {
    stars: 0,
    volume: 1,
    volumes: [0, 0.5, 1],
    resetLabel: '重置进度',
    clearLabel: '按住清空',
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

  async onResetProgress() {
    if (this._resetting) return
    this._resetting = true
    this.setData({ resetLabel: '重置中…' })
    const { ok } = await progressUtil.clearAll()
    this._resetting = false
    // 云端失败时本地已清，但下次同步会拉回，必须如实告知
    this.setData({ resetLabel: ok ? '已重置' : '重置失败，稍后再试' })
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
        this.runClear()
      }
    }, 50)
  },

  async runClear() {
    this.setData({ stars: 0, clearLabel: '清空中…' })
    const { ok } = await starsUtil.clearAllStars()
    const app = getApp()
    if (app.globalData.profile) {
      app.globalData.profile.stickers = []
      app.globalData.profile.badges = []
    }
    this.setData({
      stars: starsUtil.getLocalStars(),
      clearLabel: ok ? '已清空' : '清空失败，稍后再试',
    })
  },

  onClearEnd() {
    if (this._clearTimer) {
      clearInterval(this._clearTimer)
      this._clearTimer = null
    }
    if (this.data.clearProgress < 100) {
      this.setData({ clearProgress: 0, clearLabel: '按住清空' })
    }
  },

  onUnload() {
    if (this._clearTimer) clearInterval(this._clearTimer)
  },
})
