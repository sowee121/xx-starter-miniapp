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
    url: '/subpkg/life/calendar/index',
  },
  task: {
    id: 'task',
    title: '每日任务',
    icon: MODULE_ICONS.task,
    tint: tintOf('task'),
    url: '/subpkg/life/task/list',
    subtitle: '今天的任务，慢慢完成吧',
  },
  reward: {
    id: 'reward',
    title: '积分商城',
    icon: MODULE_ICONS.reward,
    tint: tintOf('reward'),
    url: '/subpkg/life/reward/shop',
    subtitle: '用星星兑换动物贴纸',
    actionText: '去兑换',
  },
}

/** 首页六宫格：语（识字/拼音/古诗/英语）→ 算术 → 日常 */
const HOME_MODULE_ENTRIES = ['hanzi', 'pinyin', 'poem', 'english', 'math', 'calendar']

/** 兼容旧调用：首页全部八入口顺序 */
const HOME_ENTRIES = ['task', 'hanzi', 'pinyin', 'poem', 'english', 'math', 'calendar', 'reward']

const NAV_ORDER = HOME_ENTRIES.slice()

function getModule(id) {
  return MODULES[id] || null
}

function homeEntries() {
  return HOME_ENTRIES.map((id) => MODULES[id])
}

function homeModuleEntries() {
  return HOME_MODULE_ENTRIES.map((id) => MODULES[id])
}

function navItems() {
  return NAV_ORDER.map((id) => {
    const mod = MODULES[id]
    return {
      id: mod.id,
      label: mod.title,
      icon: mod.icon,
      url: mod.url,
    }
  })
}

module.exports = {
  MODULES,
  HOME_ENTRIES,
  HOME_MODULE_ENTRIES,
  NAV_ORDER,
  getModule,
  homeEntries,
  homeModuleEntries,
  navItems,
}
