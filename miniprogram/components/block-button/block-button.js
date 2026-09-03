const { tap } = require('../../utils/tap-guard')

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
    /** 点击按钮，向父级抛出 tap 事件（禁用则忽略） */
    onTap: tap(function () {
      if (this.data.disabled) return
      this.triggerEvent('tap')
    }),
  },
})
