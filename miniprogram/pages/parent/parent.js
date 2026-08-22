const audioUtil = require('../../utils/audio')
const { mediaUrl } = require('../../config/media')
const mascots = require('../../content/mascots')
const progressUtil = require('../../utils/progress')
const starsUtil = require('../../utils/stars')

const HOLD_MS = 3000
const VOLUME_PREVIEW_DELAY = 120
const VOLUME_SLIDER_PADDING = 10
const VOLUME_PREVIEW_AUDIO = mediaUrl('/static/shared/volume-preview.mp3')
const IDLE_LABEL = '长按 3 秒清除'

function actionList() {
  return [
    {
      key: 'progress',
      title: '学习记录',
      hint: '清除已学记录，不能恢复',
      icon: mascots.HOME_ASSETS.dino,
      tone: 'tone-matcha',
      groove: 'is-matcha',
      holding: false,
      label: IDLE_LABEL,
    },
    {
      key: 'stars',
      title: '星星积分',
      hint: '清除星星积分，不能恢复',
      icon: mascots.ICONS.bigStar,
      tone: 'tone-rose',
      groove: '',
      holding: false,
      label: IDLE_LABEL,
    },
    {
      key: 'stickers',
      title: '兑换贴纸',
      hint: '清除已兑换贴纸，不能恢复',
      icon: mascots.HOME_ASSETS.unicorn,
      tone: 'tone-peach',
      groove: 'is-peach',
      holding: false,
      label: IDLE_LABEL,
    },
  ]
}

function volumeIndexOf(value) {
  const options = [0, 0.5, 1]
  const index = options.indexOf(value)
  return index >= 0 ? index : options.length - 1
}

function thumbStyleOf(index) {
  return `left: calc(${VOLUME_SLIDER_PADDING}rpx + ((100% - ${VOLUME_SLIDER_PADDING * 2}rpx) / 3) * ${index});`
}

Page({
  data: {
    stars: 0,
    volume: 1,
    volumes: [
      { value: 0, label: '静音' },
      { value: 0.5, label: '柔和' },
      { value: 1, label: '正常' },
    ],
    actions: actionList(),
    volumeThumbStyle: thumbStyleOf(2),
  },

  onShow() {
    this.setData({
      stars: starsUtil.getLocalStars(),
      volume: audioUtil.getVolume(),
      volumeThumbStyle: thumbStyleOf(volumeIndexOf(audioUtil.getVolume())),
    })
  },

  onVolume(e) {
    const volume = Number(e.currentTarget.dataset.value)
    this.applyVolume(volume)
  },

  onVolumeTrackStart(e) {
    this._volumeDragging = true
    this.updateVolumeByTouch(e)
  },

  onVolumeTrackMove(e) {
    if (!this._volumeDragging) return
    this.updateVolumeByTouch(e)
  },

  onVolumeTrackEnd() {
    this._volumeDragging = false
  },

  updateVolumeByTouch(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
    if (!touch) return
    const query = wx.createSelectorQuery().in(this)
    query.select('.volume-options').boundingClientRect((rect) => {
      if (!rect || !rect.width) return
      const ratio = (touch.clientX - rect.left) / rect.width
      const index = Math.max(0, Math.min(2, Math.round(ratio * 3 - 0.5)))
      this.applyVolume(this.data.volumes[index].value)
    })
    query.exec()
  },

  applyVolume(volume) {
    wx.setStorageSync(audioUtil.VOLUME_KEY, volume)
    this.setData({
      volume,
      volumeThumbStyle: thumbStyleOf(volumeIndexOf(volume)),
    })
    this.scheduleVolumePreview(volume)
  },

  scheduleVolumePreview(volume) {
    clearTimeout(this._volumePreviewTimer)
    if (volume === 0) audioUtil.stop()
    this._volumePreviewTimer = setTimeout(() => {
      this._volumePreviewTimer = null
      if (volume === 0) {
        if (typeof wx.vibrateShort === 'function') {
          wx.vibrateShort({ type: 'light' })
        }
        return
      }
      audioUtil.play(VOLUME_PREVIEW_AUDIO)
    }, VOLUME_PREVIEW_DELAY)
  },

  actionIndex(key) {
    return this.data.actions.findIndex((item) => item.key === key)
  },

  patchAction(key, patch) {
    const index = this.actionIndex(key)
    if (index < 0) return
    const next = {}
    Object.keys(patch).forEach((field) => {
      next[`actions[${index}].${field}`] = patch[field]
    })
    this.setData(next)
  },

  onHoldStart(e) {
    const key = e.currentTarget.dataset.key
    if (!['progress', 'stars', 'stickers'].includes(key) || this._busy) return
    this.stopHold(false)
    this._holdKey = key
    this.patchAction(key, { holding: true })
    this._holdTimer = setTimeout(() => {
      this._holdTimer = null
      if (this._holdKey !== key) return
      this._holdKey = null
      this.patchAction(key, { holding: false })
      this.runAction(key)
    }, HOLD_MS)
  },

  onHoldEnd() {
    this.stopHold(false)
  },

  stopHold(completed) {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer)
      this._holdTimer = null
    }
    const key = this._holdKey
    this._holdKey = null
    if (!completed && key) {
      this.patchAction(key, { holding: false, label: IDLE_LABEL })
    }
  },

  async runAction(key) {
    if (this._busy) return
    this._busy = true
    this.patchAction(key, { label: '清除中…' })
    let ok = false
    if (key === 'progress') {
      ok = (await progressUtil.clearAll()).ok
    } else if (key === 'stars') {
      ok = (await starsUtil.clearAllStars()).ok
      this.setData({ stars: starsUtil.getLocalStars() })
    } else if (key === 'stickers') {
      ok = (await starsUtil.clearAllStickers()).ok
    }
    this.patchAction(key, {
      holding: false,
      label: ok ? '已清除' : '清除失败，稍后再试',
    })
    this._busy = false
  },

  onUnload() {
    this.stopHold(true)
    clearTimeout(this._volumePreviewTimer)
    this._volumePreviewTimer = null
    audioUtil.stop()
  },
})
