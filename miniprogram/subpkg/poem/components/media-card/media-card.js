const { tap } = require('../../../../utils/tap-guard')

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
    /** 点击媒体卡，向父级抛出 tap 事件 */
    onTap: tap(function () {
      this.triggerEvent('tap')
    }),
  },
})
