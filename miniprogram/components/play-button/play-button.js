const { ICONS } = require('../../content/mascots')
const { tap } = require('../../utils/tap-guard')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    /** 尺寸：默认 92 / sm 76 / lg 112（rpx） */
    size: { type: String, value: '' },
    /** 收成小号圆钮，用于诗行 / 组词 */
    compact: { type: Boolean, value: false },
    /** 仅展示、不拦截点击，列表装饰钮用 */
    passive: { type: Boolean, value: false },
    /** 点读序号，经 tap 事件 detail.index 回传 */
    index: { type: Number, value: -1 },
    /** 长播中显示停止方块 */
    playing: { type: Boolean, value: false },
  },
  /** 两张图首帧就一起加载，切换只靠 class，不再走一次 setData 往返 */
  data: {
    playIcon: ICONS.play,
    stopIcon: ICONS.stop,
  },
  methods: {
    /** 点击播放钮 */
    onTap: tap(function () {
      if (this.data.passive) return
      this.triggerEvent('tap', { index: this.data.index })
    }),
  },
})
