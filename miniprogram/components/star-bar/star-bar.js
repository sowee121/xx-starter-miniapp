const { ICONS } = require('../../content/mascots')
const starsUtil = require('../../utils/stars')
const { getNavbar } = require('../../utils/navbar')

/** 顶栏避让尺寸 */
function metricsOf(height) {
  const h = height || 32
  return {
    barHeight: h,
    iconPx: Math.round(h * 0.75),
    textPx: Math.round(h * 0.46875),
  }
}

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  properties: {
    stars: { type: Number, value: 0 },
    night: { type: Boolean, value: false },
    capsuleHeight: { type: Number, value: 0 },
  },

  data: {
    starIcon: ICONS.star,
    displayStars: 0,
    barHeight: 32,
    iconPx: 22,
    textPx: 15,
  },

  lifetimes: {
    attached() {
      this.syncMetrics()
      this.syncDisplay()
    },
  },

  observers: {
    /** 星星数变化 */
    stars() {
      this.syncDisplay()
    },
    /** 胶囊高度变化 */
    capsuleHeight() {
      this.syncMetrics()
    },
  },

  methods: {
    /** 同步顶栏尺寸 */
    syncMetrics() {
      const height = this.properties.capsuleHeight || getNavbar().menuHeight
      this.setData(metricsOf(height))
    },

    /** 刷新星星展示 */
    syncDisplay() {
      this.setData({ displayStars: starsUtil.getLocalStars() })
    },
  },
})
