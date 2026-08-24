Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    text: { type: String, value: '' },
    disabled: { type: Boolean, value: false },
  },
  methods: {
    /** 点击播放钮 */
    onTap() {
      if (this.data.disabled) return
      this.triggerEvent('tap')
    },
  },
})
