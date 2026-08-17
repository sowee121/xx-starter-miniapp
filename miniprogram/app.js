const { CLOUD_ENV } = require('./config/cloud')

App({
  globalData: {
    profile: null,
  },

  onLaunch() {
    // iOS 侧边静音键下也要能点读；须用全局 API（实例 obeyMuteSwitch 已失效）
    try {
      require('./utils/audio').ensureAudioOption()
    } catch (error) {
      // ignore
    }

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
    try {
      require('./utils/stars').bootstrap().catch(() => {})
    } catch (error) {
      // 建档失败不影响本地加星
    }
  },
})
