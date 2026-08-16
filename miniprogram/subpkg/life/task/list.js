const starsUtil = require('../../../utils/stars')
const dailyTasks = require('../../../utils/daily-tasks')

Page({
  data: { stars: 0, tasks: [], progress: 0, showPraise: false, praiseText: '' },

  onShow() {
    this.refresh()
  },

  refresh() {
    const tasks = dailyTasks.taskList()
    this.setData({
      tasks,
      stars: starsUtil.getLocalStars(),
      progress: tasks.filter((task) => task.done).length,
    })
  },

  onTaskTap(event) {
    const id = event.currentTarget.dataset.id
    const url = dailyTasks.nextUrl(id)
    if (!url) return
    wx.navigateTo({ url })
  },

  closePraise() {
    this.setData({ showPraise: false })
  },
})
