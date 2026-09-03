const { tap } = require('../../../../utils/tap-guard')

/** 拼音字母石子径：渲染全部韵母，点击回传当前 id 给页面切项 */
Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    trail: { type: Array, value: [] },
    label: { type: String, value: '石子径' },
  },
  methods: {
    /** 点击石子，回传 id */
    onTap: tap(function (e) {
      this.triggerEvent('tap', { id: e.currentTarget.dataset.id })
    }),
  },
})
