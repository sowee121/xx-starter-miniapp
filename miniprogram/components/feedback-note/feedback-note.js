Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 提示文案；为空不渲染 */
    text: { type: String, value: '' },
    /** 语义：success=绿条（答对），warning=黄条（警告，自动晃动） */
    type: { type: String, value: 'warning' },
    /** 重播信号：页面每次触发（false→true，如连续答错）让黄条提示重新晃动 */
    shake: { type: Boolean, value: false },
  },
  data: {
    toneClass: 'tone-butter',
    shaking: false,
  },
  observers: {
    'type'(type) {
      this.setData({ toneClass: type === 'success' ? 'tone-matcha' : 'tone-butter' })
    },
    /** 文案变化或重播信号到达（同文案连续答错）都要重走晃动 */
    'text, shake'() {
      this.refresh()
    },
  },
  lifetimes: {
    /** 页面用 wx:if 控制显隐，组件每次挂载都可能带初始文案，补一次首播 */
    attached() {
      this.setData({ toneClass: this.data.type === 'success' ? 'tone-matcha' : 'tone-butter' })
      this.refresh()
    },
  },
  methods: {
    /** 黄条 warning 出现即晃；先摘动画类再挂回，保证连续触发能重播 */
    refresh() {
      const { text, type } = this.data
      if (!text || type !== 'warning') {
        this.setData({ shaking: false })
        return
      }
      this.setData({ shaking: false })
      wx.nextTick(() => {
        this.setData({ shaking: true })
      })
    },
  },
})
