/** 每日任务行卡片：勾选态 + 奖励，整行可点跳转 */
Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    /** 任务标识，点击回传 */
    taskId: { type: String, value: '' },
    /** 任务标题 */
    title: { type: String, value: '' },
    /** 是否已完成 */
    done: { type: Boolean, value: false },
    /** 是否展示进度（如 2/3） */
    showProgress: { type: Boolean, value: false },
    /** 当前进度 */
    current: { type: Number, value: 0 },
    /** 目标进度 */
    target: { type: Number, value: 0 },
    /** 奖励星星数 */
    reward: { type: Number, value: 0 },
  },
  methods: {
    /** 点击行：回传任务标识，由页面决定跳转目标 */
    onTap() {
      this.triggerEvent('tap', { id: this.data.taskId })
    },
  },
})
