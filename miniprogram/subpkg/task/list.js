const starsUtil = require('../../utils/stars')
const dailyTasks = require('../../utils/daily-tasks')
const { taskHead } = require('../../content/feedback')
const { goTo } = require('../../utils/page')

Page({
  data: {
    stars: 0,
    tasks: [],
    progress: 0,
    pageHint: '今天的任务',
    pageSubHint: '慢慢完成吧～',
  },

  onShow() {
    this.refresh()
  },

  /** 同步云端后再重绘 */
  refresh() {
    const tasks = dailyTasks.taskList()
    const progress = tasks.filter((task) => task.done).length
    const head = taskHead(progress, tasks.length)
    this.setData({
      tasks,
      stars: starsUtil.getLocalStars(),
      progress,
      pageHint: head.hint,
      pageSubHint: head.subHint,
    })
  },

  /** 打开任务对应页 */
  onTaskTap(event) {
    const id = event.currentTarget.dataset.id
    const url = dailyTasks.nextUrl(id)
    if (!url) return
    goTo(url)
  },
})
