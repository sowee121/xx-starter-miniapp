const starsUtil = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { trackDaily, getToday } = require('../../../utils/daily-tasks')
const feedback = require('../../../utils/feedback')

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

Page({
  data: {
    stars: 0,
    dateText: '',
    weekday: '',
    isNight: false,
    skyIcon: mediaUrl('/subpkg/life/static/sun.png'),
    background: mediaUrl('/static/shared/meadow.png'),
    feedback: { show: false, closing: false },
  },

  onShow() {
    const now = new Date()
    const isNight = now.getHours() < 6 || now.getHours() >= 18
    this.setData({
      stars: starsUtil.getLocalStars(),
      dateText: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
      weekday: WEEKDAYS[now.getDay()],
      isNight,
      skyIcon: mediaUrl(isNight ? '/subpkg/life/static/moon-stars.png' : '/subpkg/life/static/sun.png'),
      background: mediaUrl(isNight ? '/subpkg/life/static/meadow-night.png' : '/static/shared/meadow.png'),
    })

    clearTimeout(this._calendarTimer)
    this._calendarTimer = setTimeout(async () => {
      this._calendarTimer = null
      const result = await trackDaily('calendar', getToday())
      this.setData({ stars: starsUtil.getLocalStars() })
      feedback.showTaskAward(this, result)
    }, 500)
  },

  closePraise() {
    feedback.hideLayer(this)
  },

  onUnload() {
    clearTimeout(this._calendarTimer)
  },
})
