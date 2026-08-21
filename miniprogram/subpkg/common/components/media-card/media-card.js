Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    image: { type: String, value: '' },
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    meta: { type: String, value: '' },
    metaIcon: { type: String, value: '' },
    play: { type: Boolean, value: false },
    tone: { type: String, value: 'cream' },
    wideImage: { type: Boolean, value: false },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap')
    },
  },
})
