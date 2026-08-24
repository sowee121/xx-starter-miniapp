const { ICONS } = require('../../content/mascots')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    /** 尺寸：默认 92 / sm 76 / lg 112（rpx） */
    size: { type: String, value: '' },
    /** 收紧热区，贴齐卡片内边，用于诗行 / 组词两端对齐 */
    compact: { type: Boolean, value: false },
    /** 仅展示、不拦截点击，列表装饰钮用 */
    passive: { type: Boolean, value: false },
    /** 点读序号，经 tap 事件 detail.index 回传 */
    index: { type: Number, value: -1 },
    /** 长播中显示停止方块 */
    playing: { type: Boolean, value: false },
  },
  data: {
    playIcon: ICONS.play,
  },
  observers: {
    /** 播放态变化 */
    playing(playing) {
      this.setData({
        playIcon: playing ? ICONS.stop : ICONS.play,
      })
    },
  },
  methods: {
    /** 点击播放钮 */
    onTap() {
      if (this.data.passive) return
      this.triggerEvent('tap', { index: this.data.index })
    },
  },
})
