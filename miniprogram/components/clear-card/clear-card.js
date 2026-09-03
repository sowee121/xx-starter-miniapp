/** 结果文案停留时长：够看清「已清零」，又不挡下一次长按 */
const RESULT_STAY_MS = 1400

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  externalClasses: ['custom-class'],
  properties: {
    /** 卡片图标：吉祥物或大星 */
    icon: { type: String, value: '' },
    /** 图标放大档位：is-dino / is-penguin / is-unicorn，空串表示不放大 */
    iconClass: { type: String, value: '' },
    title: { type: String, value: '' },
    hint: { type: String, value: '' },
    /** 卡面主题：tone-matcha / tone-frost / tone-rose / tone-apricot */
    tone: { type: String, value: 'cream' },
    /** 长按槽配色：is-matcha / is-sky / is-apricot，空串用默认玫红 */
    groove: { type: String, value: '' },
    /** 动作动词：清零 / 清空 / 重置 / 清除 */
    verb: { type: String, value: '清除' },
    /** 需要按住的毫秒数 */
    holdMs: { type: Number, value: 3000 },
    /** 页面回写的执行结果：'' | 'ok' | 'fail' */
    result: { type: String, value: '' },
  },
  data: {
    holding: false,
    label: '',
  },
  observers: {
    /** 页面回写结果后落文案；新一轮开始时回写的空串不动 */
    result(status) {
      if (!status) return
      const verb = this.data.verb
      this.setData({
        holding: false,
        label: status === 'ok' ? `已${verb}` : `${verb}失败，稍后再试`,
      })
      clearTimeout(this._stayTimer)
      this._stayTimer = setTimeout(() => {
        this._stayTimer = null
        this.toIdle()
      }, RESULT_STAY_MS)
    },
  },
  lifetimes: {
    attached() {
      this.setData({ label: this.idleLabel() })
    },
    detached() {
      this.stopHold()
      clearTimeout(this._stayTimer)
      this._stayTimer = null
    },
  },
  methods: {
    /** 待按文案：长按 N 秒 + 动词 */
    idleLabel() {
      return `长按 ${Math.round(this.data.holdMs / 1000)} 秒${this.data.verb}`
    },

    /** 复位成待按态 */
    toIdle() {
      this.setData({ holding: false, label: this.idleLabel() })
    },

    /** 取消进行中的长按 */
    stopHold() {
      clearTimeout(this._holdTimer)
      this._holdTimer = null
      if (this.data.holding) this.setData({ holding: false })
    },

    /** 开始长按：按住满时长才算确认，挡住宝宝误触 */
    onHoldStart() {
      this.stopHold()
      clearTimeout(this._stayTimer)
      this.setData({ holding: true })
      this._holdTimer = setTimeout(() => {
        this._holdTimer = null
        this.setData({ holding: false, label: `${this.data.verb}中…` })
        this.triggerEvent('confirm', { verb: this.data.verb })
      }, this.data.holdMs)
    },

    /** 松手 / 触摸取消 */
    onHoldEnd() {
      this.stopHold()
    },
  },
})
