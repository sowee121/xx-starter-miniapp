const { getNavbar } = require('../../utils/navbar')
const { goTo } = require('../../utils/page')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    title: { type: String, value: '' },
    hint: { type: String, value: '' },
    subHint: { type: String, value: '' },
    stars: { type: Number, value: 0 },
    showHome: { type: Boolean, value: true },
    night: { type: Boolean, value: false },
    background: { type: String, value: require('../../config/media').mediaUrl('/static/shared/meadow.jpg') },
  },

  data: {
    headerHeight: 84,
  },

  lifetimes: {
    attached() {
      // 顶栏避让高度；再往下的 30rpx 呼吸间距由 wxml 的 calc 补，和积木间距同一节奏
      this.setData({ headerHeight: getNavbar().headerHeight })
    },
  },

  methods: {
    /** 回首页 */
    onGoHome() {
      try {
        require('../../utils/audio').stop()
      } catch (error) {
        // ignore
      }
      goTo('/pages/home/home', { mode: 'reLaunch' })
    },
  },
})
