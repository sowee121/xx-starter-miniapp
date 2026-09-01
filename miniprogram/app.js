const cloud = require('./utils/cloud')
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
      // 忽略
    }
    // 答题文字音频在主包，启动即建好上下文，各模块首次答题不再等加载
    feedback.preloadVoiceAudio()
    // 点读加星被多个分包引用；主包显式加载，避免代码质量报未使用
    require('./utils/read-award')

    const bootCloud = () => {
      if (!cloud.init()) return
      // 建档 users + 冲刷本地加星队列；onLaunch 内 getApp() 不可用，传入 this
      try {
        require('./utils/stars').ensureSession(this)
      } catch (error) {
        // 忽略
      }
    }
    // 等基础库挂上 FileSystemManager，避免 init 内部 stat 报 undefined
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(bootCloud)
    } else {
      setTimeout(bootCloud, 0)
    }
  },

  onHide() {
    try {
      require('./utils/audio').destroy()
    } catch (error) {
      // 忽略
    }
  },
})
