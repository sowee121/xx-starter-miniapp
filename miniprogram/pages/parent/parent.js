const audioUtil = require('../../utils/audio')
const { togglePlay, playClip } = require('../../utils/read-award')
const { mediaUrl } = require('../../config/media')
const mascots = require('../../content/mascots')
const progressUtil = require('../../utils/progress')
const starsUtil = require('../../utils/stars')
const dailyTasksUtil = require('../../utils/daily-tasks')
const { tap } = require('../../utils/tap-guard')

/** 长按多久算确认清除；够长才能挡住宝宝误触 */
const HOLD_MS = 3000
/** 拖动滑块后延迟试听，避开连续滑动过程中的每一帧 */
const VOLUME_PREVIEW_DELAY = 120
/** 滑块两端留白（rpx），保证两端档位也能完整显示滑块 */
const VOLUME_SLIDER_PADDING = 8
/** 音量试听音源 */
const VOLUME_PREVIEW_AUDIO = mediaUrl('/static/shared/volume-preview.mp3')
/** 家长区各清除操作的动词：清零 / 清空 / 重置 / 清除 */
const ACTION_VERBS = {
  stars: '清零',
  stickers: '清空',
  dailyTasks: '重置',
  progress: '清除',
}

/** 按钮待按文案：长按 3 秒 + 动词 */
function idleLabelOf(key) {
  return `长按 3 秒${ACTION_VERBS[key] || '清除'}`
}

/** 家长区清除项 */
function actionList() {
  return [
    {
      key: 'dailyTasks',
      title: '每日任务',
      hint: '重置今日任务，不能恢复',
      icon: mascots.HOME_ASSETS.dino,
      iconClass: 'is-dino',
      tone: 'tone-matcha',
      groove: 'is-matcha',
      holding: false,
      label: idleLabelOf('dailyTasks'),
    },
    {
      key: 'progress',
      title: '学习记录',
      hint: '清除已学记录，不能恢复',
      icon: mascots.HOME_ASSETS.penguin,
      iconClass: 'is-penguin',
      tone: 'tone-frost',
      groove: 'is-sky',
      holding: false,
      label: idleLabelOf('progress'),
    },
    {
      key: 'stickers',
      title: '兑换贴纸',
      hint: '清空已兑贴纸，不能恢复 ',
      icon: mascots.HOME_ASSETS.unicorn,
      iconClass: 'is-unicorn',
      tone: 'tone-rose',
      groove: '',
      holding: false,
      label: idleLabelOf('stickers'),
    },
    {
      key: 'stars',
      title: '星星积分',
      hint: '清零星星积分，不能恢复',
      icon: mascots.ICONS.bigStar,
      iconClass: '',
      tone: 'tone-apricot',
      groove: 'is-apricot',
      holding: false,
      label: idleLabelOf('stars'),
    },
  ]
}

/** 音量档位下标 */
function volumeIndexOf(value) {
  const options = [0, 0.5, 1]
  const index = options.indexOf(value)
  return index >= 0 ? index : options.length - 1
}

/** 音量滑块位置 */
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
    previewSrc: VOLUME_PREVIEW_AUDIO,
    playingSrc: '',
  },

  onShow() {
    this.setData({
      stars: starsUtil.getLocalStars(),
      volume: audioUtil.getVolume(),
      volumeThumbStyle: thumbStyleOf(volumeIndexOf(audioUtil.getVolume())),
    })
  },

  /** 调节音量 */
  onVolume: tap(function (e) {
    const volume = Number(e.currentTarget.dataset.value)
    this.applyVolume(volume)
  }),

  /** 开始拖音量 */
  onVolumeTrackStart(e) {
    this._volumeDragging = true
    this.updateVolumeByTouch(e)
  },

  /** 拖动音量 */
  onVolumeTrackMove(e) {
    if (!this._volumeDragging) return
    this.updateVolumeByTouch(e)
  },

  /** 结束拖音量 */
  onVolumeTrackEnd() {
    this._volumeDragging = false
  },

  /** 按触摸位置改音量 */
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

  /** 写入音量并预览 */
  applyVolume(volume) {
    wx.setStorageSync(audioUtil.VOLUME_KEY, volume)
    this.setData({
      volume,
      volumeThumbStyle: thumbStyleOf(volumeIndexOf(volume)),
    })
    this.scheduleVolumePreview(volume)
  },

  /** 延迟试听音量 */
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
      playClip(this, VOLUME_PREVIEW_AUDIO)
    }, VOLUME_PREVIEW_DELAY)
  },

  /** 点播放钮试听 / 停止当前音量 */
  onPreviewTap: tap(function () {
    if (this.data.volume === 0) return
    togglePlay(this, { src: VOLUME_PREVIEW_AUDIO })
  }),

  /** 清除项下标 */
  actionIndex(key) {
    return this.data.actions.findIndex((item) => item.key === key)
  },

  /** 更新一项清除态 */
  patchAction(key, patch) {
    const index = this.actionIndex(key)
    if (index < 0) return
    const next = {}
    Object.keys(patch).forEach((field) => {
      next[`actions[${index}].${field}`] = patch[field]
    })
    this.setData(next)
  },

  /** 开始长按清除 */
  onHoldStart(e) {
    const key = e.currentTarget.dataset.key
    if (!['progress', 'stars', 'stickers', 'dailyTasks'].includes(key) || this._busy) return
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

  /** 结束长按清除 */
  onHoldEnd() {
    this.stopHold(false)
  },

  /** 取消长按 */
  stopHold(completed) {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer)
      this._holdTimer = null
    }
    const key = this._holdKey
    this._holdKey = null
    if (!completed && key) {
      this.patchAction(key, { holding: false, label: idleLabelOf(key) })
    }
  },

  /** 执行清除 */
  async runAction(key) {
    if (this._busy) return
    this._busy = true
    const verb = ACTION_VERBS[key] || '清除'
    this.patchAction(key, { label: `${verb}中…` })
    let ok = false
    if (key === 'progress') {
      ok = (await progressUtil.clearAll()).ok
    } else if (key === 'stars') {
      ok = (await starsUtil.clearAllStars()).ok
      this.setData({ stars: starsUtil.getLocalStars() })
    } else if (key === 'stickers') {
      ok = (await starsUtil.clearAllStickers()).ok
    } else if (key === 'dailyTasks') {
      ok = (await dailyTasksUtil.resetDailyTasks()).ok
    }
    this.patchAction(key, {
      holding: false,
      label: ok ? `已${verb}` : `${verb}失败，稍后再试`,
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
