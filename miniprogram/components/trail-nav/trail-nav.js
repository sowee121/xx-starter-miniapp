const { tap } = require('../../utils/tap-guard')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    show: { type: Boolean, value: true },
    hasPrev: { type: Boolean, value: false },
    hasNext: { type: Boolean, value: false },
    label: { type: String, value: '切题' },
  },
  methods: {
    /** 触发上一题 */
    onPrev: tap(function () {
      if (!this.data.hasPrev) return
      this.triggerEvent('prev')
    }),
    /** 触发下一题 */
    onNext: tap(function () {
      if (!this.data.hasNext) return
      this.triggerEvent('next')
    }),
  },
})
