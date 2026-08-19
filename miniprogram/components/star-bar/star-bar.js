const { ICONS } = require('../../content/mascots')
const starsUtil = require('../../utils/stars')

const PARENT_ROUTE = 'pages/parent/parent'
/** bindlongpress 的触发阈值固定在 350ms 左右且不可配置，所以家长区的 1.5 秒只能自己计时 */
const HOLD_MS = 1500
/** 手指移出这个距离就按滑动处理；单位与 touch 的 clientX/clientY 一致（px） */
const MOVE_TOLERANCE = 12

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  properties: {
    stars: { type: Number, value: 0 },
    night: { type: Boolean, value: false },
  },

  data: {
    starIcon: ICONS.star,
    displayStars: 0,
    pressing: false,
  },

  lifetimes: {
    attached() {
      this.syncDisplay()
    },
    detached() {
      // 只清定时器：组件已销毁，此时 setData 会打到不存在的实例上
      this.clearHoldTimer()
    },
  },

  observers: {
    stars() {
      this.syncDisplay()
    },
  },

  methods: {
    /**
     * 星数只认 stars 工具的账（云端快照 + 待同步增量）。
     * stars 属性仅作为「该重读了」的信号，页面 setData 时机早于云端返回，
     * 直接用属性值会在回首页时闪一下 0。
     */
    syncDisplay() {
      this.setData({ displayStars: starsUtil.getLocalStars() })
    },

    onHoldStart(e) {
      this.clearHoldTimer()
      const touch = (e.touches && e.touches[0]) || {}
      this._holdOrigin = { x: touch.clientX || 0, y: touch.clientY || 0 }
      this.setData({ pressing: true })
      this._holdTimer = setTimeout(() => {
        this._holdTimer = null
        this.setData({ pressing: false })
        this.enterParent()
      }, HOLD_MS)
    },

    onHoldMove(e) {
      if (!this._holdTimer) return
      const touch = (e.touches && e.touches[0]) || {}
      const dx = Math.abs((touch.clientX || 0) - this._holdOrigin.x)
      const dy = Math.abs((touch.clientY || 0) - this._holdOrigin.y)
      if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) this.cancelHold()
    },

    onHoldEnd() {
      this.cancelHold()
    },

    clearHoldTimer() {
      if (this._holdTimer) {
        clearTimeout(this._holdTimer)
        this._holdTimer = null
      }
    },

    cancelHold() {
      this.clearHoldTimer()
      if (this.data.pressing) this.setData({ pressing: false })
    },

    enterParent() {
      // 家长区已在页面栈里就不再跳，否则返回要连点好几次
      const inStack = getCurrentPages().some((page) => page && page.route === PARENT_ROUTE)
      if (inStack) return
      // 页面栈满 10 层时必然失败，静默放过：这是隐藏入口，不该给孩子弹报错
      wx.navigateTo({ url: `/${PARENT_ROUTE}`, fail() {} })
    },
  },
})
