const starsUtil = require('../../utils/stars')
const { mediaUrl } = require('../../config/media')
const { trackDaily, getToday, readToday } = require('../../utils/daily-tasks')
const activity = require('../../utils/activity')
const feedback = require('../../utils/feedback')

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

/** 今日是否已打卡 */
function calendarCheckedIn() {
  const day = readToday()
  return !!(day && day.done && day.done.calendar)
}

Page({
  data: {
    stars: 0,
    dateText: '',
    weekday: '',
    isNight: false,
    checkedIn: false,
    skyIcon: mediaUrl('/subpkg/calendar/static/sun.png'),
    background: mediaUrl('/static/shared/meadow.png'),
    heat: activity.monthBoard(),
    feedback: { show: false, closing: false },
  },

  onShow() {
    const now = new Date()
    const isNight = now.getHours() < 6 || now.getHours() >= 18
    this.setData({
      stars: starsUtil.getLocalStars(),
      dateText: `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`,
      weekday: WEEKDAYS[now.getDay()],
      isNight,
      checkedIn: calendarCheckedIn(),
      skyIcon: mediaUrl(isNight ? '/subpkg/calendar/static/moon-stars.png' : '/subpkg/calendar/static/sun.png'),
      heat: activity.monthBoard(),
    })
    activity.syncFromCloud().then(() => {
      this.setData({ heat: activity.monthBoard() })
    }).catch(() => {})
  },

  /** 日历打卡 */
  onCheckin() {
    if (this.data.checkedIn || this._busy) return
    this._busy = true
    const result = trackDaily('calendar', getToday())
    this.setData({
      checkedIn: true,
      stars: starsUtil.getLocalStars(),
      heat: activity.monthBoard(),
    })
    this._busy = false
    feedback.showTaskAward(this, result)
  },

  /** 关闭表扬层 */
  closePraise() {
    feedback.hideLayer(this)
  },
})
