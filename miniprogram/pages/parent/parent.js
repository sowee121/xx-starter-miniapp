const audioUtil = require('../../utils/audio')
const mascots = require('../../content/mascots')
const progressUtil = require('../../utils/progress')
const starsUtil = require('../../utils/stars')
const dailyTasksUtil = require('../../utils/daily-tasks')

/** 家长区各清除操作的动词：清零 / 清空 / 重置 / 清除 */
const ACTION_VERBS = {
  stars: '清零',
  stickers: '清空',
  dailyTasks: '重置',
  progress: '清除',
}

/** 家长区清除项；长按与文案状态由 clear-card 组件自己管 */
function actionList() {
  return [
    {
      key: 'dailyTasks',
      title: '每日任务',
      hint: '重置今日任务，不能恢复',
      icon: mascots.HOME_ASSETS.dino,
      iconClass: 'is-dino',
      tone: 'tone-matcha',
      groove: 'is-matcha',
      verb: ACTION_VERBS.dailyTasks,
      result: '',
    },
    {
      key: 'progress',
      title: '学习记录',
      hint: '清除已学记录，不能恢复',
      icon: mascots.HOME_ASSETS.penguin,
      iconClass: 'is-penguin',
      tone: 'tone-frost',
      groove: 'is-sky',
      verb: ACTION_VERBS.progress,
      result: '',
    },
    {
      key: 'stickers',
      title: '兑换贴纸',
      hint: '清空已兑贴纸，不能恢复 ',
      icon: mascots.HOME_ASSETS.unicorn,
      iconClass: 'is-unicorn',
      tone: 'tone-rose',
      groove: '',
      verb: ACTION_VERBS.stickers,
      result: '',
    },
    {
      key: 'stars',
      title: '星星积分',
      hint: '清零星星积分，不能恢复',
      icon: mascots.ICONS.bigStar,
      iconClass: '',
      tone: 'tone-apricot',
      groove: 'is-apricot',
      verb: ACTION_VERBS.stars,
      result: '',
    },
  ]
}

Page({
  data: {
    stars: 0,
    actions: actionList(),
  },

  onShow() {
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  /** 清除项下标 */
  actionIndex(key) {
    return this.data.actions.findIndex((item) => item.key === key)
  },

  /** 更新一项清除态 */
  patchAction(key, patch) {
    const index = this.actionIndex(key)
    if (index < 0) return
    const next = {}
    Object.keys(patch).forEach((field) => {
      next[`actions[${index}].${field}`] = patch[field]
    })
    this.setData(next)
  },

  /** 长按确认后执行清除，结果回写给卡片出文案 */
  async onClear(e) {
    const key = e.currentTarget.dataset.key
    if (!key || this._busy) return
    this._busy = true
    // 先清空结果，保证同一项连做两次也能触发组件的文案更新
    this.patchAction(key, { result: '' })
    let ok = false
    if (key === 'progress') {
      ok = (await progressUtil.clearAll()).ok
    } else if (key === 'stars') {
      ok = (await starsUtil.clearAllStars()).ok
      this.setData({ stars: starsUtil.getLocalStars() })
    } else if (key === 'stickers') {
      ok = (await starsUtil.clearAllStickers()).ok
    } else if (key === 'dailyTasks') {
      ok = (await dailyTasksUtil.resetDailyTasks()).ok
    }
    this.patchAction(key, { result: ok ? 'ok' : 'fail' })
    this._busy = false
  },

  onUnload() {
    audioUtil.stop()
  },
})
