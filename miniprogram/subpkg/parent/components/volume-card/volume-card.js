const audioUtil = require('../../../../utils/audio')
const { togglePlay, playClip, detachLongPlay } = require('../../../../utils/read-award')
const { mediaUrl } = require('../../../../config/media')
const { tap } = require('../../../../utils/tap-guard')

/** 拖动滑块后延迟试听，避开连续滑动过程中的每一帧 */
const VOLUME_PREVIEW_DELAY = 120
/** 滑块两端留白（rpx），保证两端档位也能完整显示滑块 */
const VOLUME_SLIDER_PADDING = 8
/** 默认试听音源 */
const DEFAULT_PREVIEW = mediaUrl('/static/shared/volume-preview.mp3')

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

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    /** 卡面主题：tone-sky */
    tone: { type: String, value: 'sky' },
    title: { type: String, value: '音量大小' },
    hint: { type: String, value: '' },
    /** 试听音源，留空用默认 */
    src: { type: String, value: '' },
  },
  data: {
    volume: 1,
    volumes: [
      { value: 0, label: '静音' },
      { value: 0.5, label: '柔和' },
      { value: 1, label: '正常' },
    ],
    thumbStyle: thumbStyleOf(2),
    previewSrc: DEFAULT_PREVIEW,
    playingSrc: '',
  },
  observers: {
    /** 外部指定音源时覆盖默认值 */
    src(value) {
      if (value) this.setData({ previewSrc: value })
    },
  },
  lifetimes: {
    attached() {
      const volume = audioUtil.getVolume()
      this.setData({ volume, thumbStyle: thumbStyleOf(volumeIndexOf(volume)) })
    },
    detached() {
      clearTimeout(this._previewTimer)
      this._previewTimer = null
      detachLongPlay(this)
    },
  },
  methods: {
    /** 选档 */
    onVolume: tap(function (e) {
      this.applyVolume(Number(e.currentTarget.dataset.value))
    }),

    /** 开始拖音量 */
    onVolumeTrackStart(e) {
      this._dragging = true
      this.updateVolumeByTouch(e)
    },

    /** 拖动音量 */
    onVolumeTrackMove(e) {
      if (!this._dragging) return
      this.updateVolumeByTouch(e)
    },

    /** 结束拖音量 */
    onVolumeTrackEnd() {
      this._dragging = false
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
        thumbStyle: thumbStyleOf(volumeIndexOf(volume)),
      })
      this.scheduleVolumePreview(volume)
      this.triggerEvent('change', { volume })
    },

    /** 延迟试听音量 */
    scheduleVolumePreview(volume) {
      clearTimeout(this._previewTimer)
      if (volume === 0) audioUtil.stop()
      this._previewTimer = setTimeout(() => {
        this._previewTimer = null
        if (volume === 0) {
          if (typeof wx.vibrateShort === 'function') {
            wx.vibrateShort({ type: 'light' })
          }
          return
        }
        playClip(this, this.data.previewSrc)
      }, VOLUME_PREVIEW_DELAY)
    },

    /** 点播放钮试听 / 停止当前音量 */
    onPreviewTap: tap(function () {
      if (this.data.volume === 0) return
      togglePlay(this, { src: this.data.previewSrc })
    }),
  },
})
