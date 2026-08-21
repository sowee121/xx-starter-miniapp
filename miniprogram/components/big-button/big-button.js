Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    text: { type: String, value: '' },
    showPlay: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
  },
  data: {
    playIcon: '/static/shared/play.png',
  },
  methods: {
    onTap() {
      if (this.data.disabled) return
      this.triggerEvent('tap')
    },
  },
})
