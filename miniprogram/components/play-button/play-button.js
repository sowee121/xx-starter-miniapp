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
  },
  data: {
    playIcon: '/static/shared/play.png',
  },
  methods: {
    onTap() {
      if (this.data.passive) return
      this.triggerEvent('tap', { index: this.data.index })
    },
  },
})
