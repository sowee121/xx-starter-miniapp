Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 入口卡列表：{ image, title, sub, tone, to } */
    cards: { type: Array, value: [] },
  },
  methods: {
    /** 点击某张入口卡，向页面抛出 go 事件（携带 to） */
    onCardTap(e) {
      this.triggerEvent('go', { to: e.currentTarget.dataset.to })
    },
  },
})
