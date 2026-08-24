Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    title: { type: String, value: '' },
    image: { type: String, value: '' },
    tone: { type: String, value: 'cream' },
    url: { type: String, value: '' },
    moduleId: { type: String, value: '' },
  },
  methods: {
    /** 点击播放钮 */
    onTap() {
      this.triggerEvent('tap', {
        id: this.data.moduleId,
        url: this.data.url,
        title: this.data.title,
      })
    },
  },
})
