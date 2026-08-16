const { HOME_ASSETS } = require('../../content/mascots')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    image: { type: String, value: '' },
    tone: { type: String, value: 'matcha' },
    /** task | reward */
    type: { type: String, value: 'task' },
    actionText: { type: String, value: '去兑换' },
    /** 已点亮星数，0–6（每日任务六模块） */
    progress: { type: Number, value: 0 },
    url: { type: String, value: '' },
    moduleId: { type: String, value: '' },
    /** 任务卡右上角点缀图（big-star） */
    deco: { type: String, value: '' },
  },
  data: {
    starIcon: HOME_ASSETS.star,
    sockets: [false, false, false, false, false, false],
  },
  observers: {
    progress(val) {
      const n = Math.max(0, Math.min(6, Number(val) || 0))
      this.setData({
        sockets: [0, 1, 2, 3, 4, 5].map((i) => i < n),
      })
    },
  },
  lifetimes: {
    attached() {
      const n = Math.max(0, Math.min(6, Number(this.data.progress) || 0))
      this.setData({
        sockets: [0, 1, 2, 3, 4, 5].map((i) => i < n),
      })
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', {
        id: this.data.moduleId,
        url: this.data.url,
        title: this.data.title,
        type: this.data.type,
      })
    },
  },
})
