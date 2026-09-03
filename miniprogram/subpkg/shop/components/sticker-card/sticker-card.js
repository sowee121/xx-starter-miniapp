const { tap } = require('../../../../utils/tap-guard')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    name: { type: String, value: '' },
    image: { type: String, value: '' },
    tone: { type: String, value: 'matcha' },
    /** 卡片模式：album=我的贴纸（图+名）；shop=兑换贴纸（图+价+兑换钮） */
    mode: { type: String, value: 'album' },
    /** 兑换价（shop 模式） */
    cost: { type: Number, value: 0 },
    /** 星星是否足够（shop 模式） */
    affordable: { type: Boolean, value: true },
    /** 贴纸 id，兑换时回传父级 */
    stickerId: { type: String, value: '' },
  },
  methods: {
    /** 点击兑换，向父级抛出 exchange 事件（detail.id） */
    onExchange: tap(function () {
      if (!this.data.affordable) return
      this.triggerEvent('exchange', { id: this.data.stickerId })
    }),
  },
})
