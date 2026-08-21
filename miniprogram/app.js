const { CLOUD_ENV } = require('./config/cloud')
const feedback = require('./utils/feedback')

App({
  globalData: {
    profile: null,
    // 注册为主包共享服务，确保各业务分包可合法加载同一反馈实现。
    feedback,
  },

  onLaunch() {
    // iOS 侧边静音键下也要能点读；须用全局 API（实例 obeyMuteSwitch 已失效）
    try {
      require('./utils/audio').ensureAudioOption()
    } catch (error) {
      // ignore
    }
    // 答题文字音频在主包，启动即建好上下文，各模块首次答题不再等加载
    feedback.preloadVoiceAudio()

    if (!wx.cloud) {
      return
    }
    if (!CLOUD_ENV) {
      return
    }
    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true,
    })
    // 建档 users + 冲刷本地加星队列；onLaunch 内 getApp() 不可用，传入 this
    try {
      require('./utils/stars').ensureSession(this)
    } catch (error) {
      // ignore
    }
  },
})
