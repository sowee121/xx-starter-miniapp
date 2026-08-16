Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    text: { type: String, value: '听一听' },
    compact: { type: Boolean, value: false },
    size: { type: String, value: '' },
    index: { type: Number, value: -1 },
  },
  data: {
    playIcon: '/static/shared/play.png',
  },
  methods: {
    onTap() {
      const detail = { index: this.data.index }
      this.triggerEvent('read', detail)
      this.triggerEvent('tap', detail)
    },
  },
})
