Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 卡面主图，须与本卡所在分包同源或主包 /static */
    image: { type: String, value: '' },
    title: { type: String, value: '' },
    sub: { type: String, value: '' },
    /** 色面：sky / rose / sand，对应 tone-* token */
    tone: { type: String, value: 'sky' },
    /** 点击后跳转的页面路径 */
    to: { type: String, value: '' },
  },
  methods: {
    /** 点击卡片，向父级抛出 go 事件（携带 to） */
    onTap() {
      this.triggerEvent('go', { to: this.data.to })
    },
  },
})
