const starsUtil = require('../../utils/stars')
const { getNavbar } = require('../../utils/navbar')
const { HOME_ASSETS, ICONS } = require('../../content/mascots')
const { getModule, homeModuleEntries } = require('../../content/modules')
const dailyTasks = require('../../utils/daily-tasks')

Page({
  data: {
    stars: 0,
    headerHeight: 84,
    meadow: HOME_ASSETS.meadow,
    avatar: HOME_ASSETS.avatar,
    daisy: HOME_ASSETS.daisy,
    bigStar: ICONS.bigStar,
    task: getModule('task'),
    reward: getModule('reward'),
    modules: homeModuleEntries(),
    taskProgress: 0,
  },

  onLoad() {
    this.setData({
      headerHeight: getNavbar().headerHeight,
      stars: starsUtil.getLocalStars(),
    })
  },

  onShow() {
    this.setData({
      stars: starsUtil.getLocalStars(),
      taskProgress: dailyTasks.getProgress(),
    })
    starsUtil.ensureSession().then(() => {
      this.setData({ stars: starsUtil.getLocalStars() })
    })
  },

  onEntry(e) {
    const url = (e.detail && e.detail.url) || e.currentTarget.dataset.url
    if (!url) return
    wx.navigateTo({ url })
  },
})
