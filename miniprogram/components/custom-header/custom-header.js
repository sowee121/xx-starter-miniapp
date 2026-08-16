const { getNavbar } = require('../../utils/navbar')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    title: { type: String, value: '' },
    showHome: { type: Boolean, value: true },
    /** home：品牌标题 + 右侧积分；page：回首页 + 居中标题 */
    variant: { type: String, value: 'page' },
    stars: { type: Number, value: 0 },
    night: { type: Boolean, value: false },
  },

  data: {
    homeIcon: '/static/shared/home-clay.png',
    statusBarHeight: 44,
    menuTop: 48,
    menuHeight: 32,
    headerHeight: 84,
    menuRight: 94,
    menuWidth: 87,
  },

  lifetimes: {
    attached() {
      this.setData(getNavbar())
    },
  },

  methods: {
    onHome() {
      this.triggerEvent('home')
    },
  },
})
