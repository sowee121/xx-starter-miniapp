Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 入口卡列表：{ image, title, sub, tone, to } */
    cards: { type: Array, value: [] },
  },
  methods: {
    /** 转发单卡的 go 事件，向页面抛出（携带 to） */
    onCardGo(e) {
      this.triggerEvent('go', { to: e.detail.to })
    },
  },
})
