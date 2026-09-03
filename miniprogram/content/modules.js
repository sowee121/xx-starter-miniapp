const { MODULE_ICONS, tintOf } = require('./mascots')

/** 八大功能板块（最终需求） */
const MODULES = {
  poem: {
    id: 'poem',
    title: '古诗',
    icon: MODULE_ICONS.poem,
    tint: tintOf('poem'),
    url: '/subpkg/poem/poem/poem',
  },
  hanzi: {
    id: 'hanzi',
    title: '识字',
    icon: MODULE_ICONS.hanzi,
    tint: tintOf('hanzi'),
    url: '/subpkg/hanzi/list/list',
  },
  math: {
    id: 'math',
    title: '算术',
    icon: MODULE_ICONS.math,
    tint: tintOf('math'),
    url: '/subpkg/math/hub/hub',
  },
  english: {
    id: 'english',
    title: '英语',
    icon: MODULE_ICONS.english,
    tint: tintOf('english'),
    url: '/subpkg/english/hub/hub',
  },
  pinyin: {
    id: 'pinyin',
    title: '拼音',
    icon: MODULE_ICONS.pinyin,
    tint: tintOf('pinyin'),
    url: '/subpkg/pinyin/list/list',
  },
  calendar: {
    id: 'calendar',
    title: '日历',
    icon: MODULE_ICONS.calendar,
    tint: tintOf('calendar'),
    url: '/subpkg/calendar/index',
  },
  task: {
    id: 'task',
    title: '每日任务',
    icon: MODULE_ICONS.task,
    tint: tintOf('task'),
    url: '/subpkg/task/list',
    subtitle: '今天的任务，慢慢完成吧',
  },
  reward: {
    id: 'reward',
    title: '积分商城',
    icon: MODULE_ICONS.reward,
    tint: tintOf('reward'),
    url: '/subpkg/shop/shop',
    subtitle: '星星兑换动物贴纸',
    actionText: '兑换贴纸',
  },
}

/** 首页六宫格：拼音/英语 → 识字/古诗 → 算术 → 日常 */
const HOME_MODULE_ENTRIES = ['pinyin', 'english', 'hanzi', 'poem', 'math', 'calendar']

/** 读取功能模块配置 */
function getModule(id) {
  return MODULES[id] || null
}

/** 首页入口列表 */
function homeModuleEntries() {
  return HOME_MODULE_ENTRIES.map((id) => MODULES[id])
}

module.exports = {
  getModule,
  homeModuleEntries,
}
