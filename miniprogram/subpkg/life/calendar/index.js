const starsUtil = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { trackDaily } = require('../../../utils/daily-tasks')

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

Page({
  data: {
    stars: 0,
    dateText: '',
    weekday: '',
    isNight: false,
    skyIcon: mediaUrl('/subpkg/life/static/sun.png'),
    background: mediaUrl('/static/shared/meadow.png'),
  },

  async onShow() {
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

    await trackDaily('calendar', 'open')
    this.setData({ stars: starsUtil.getLocalStars() })
  },
})
