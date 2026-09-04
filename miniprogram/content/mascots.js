const { mediaUrl } = require('../config/media')

/** 首页专属素材目录 */
const HOME_BASE = '/static/home'
/** 通用图标目录 */
const ICON_BASE = '/static/icons'
/** 主包共享素材目录；首页与各分包共用，故必须留在主包内 */
const SHARED_BASE = '/static/shared'

/** 首页确认稿素材（上云） */
const HOME_ASSETS = {
  meadow: mediaUrl(`${SHARED_BASE}/meadow.png`),
  avatar: mediaUrl(`${HOME_BASE}/avatar.png`),
  star: mediaUrl(`${HOME_BASE}/star.png`),
  daisy: mediaUrl(`${HOME_BASE}/daisy-sprig.png`),
  dino: mediaUrl(`${HOME_BASE}/dino.png`),
  rabbit: mediaUrl(`${HOME_BASE}/rabbit.png`),
  cat: mediaUrl(`${HOME_BASE}/cat.png`),
  dog: mediaUrl(`${HOME_BASE}/dog.png`),
  bear: mediaUrl(`${HOME_BASE}/bear.png`),
  duckling: mediaUrl(`${HOME_BASE}/duckling.png`),
  penguin: mediaUrl(`${HOME_BASE}/penguin.png`),
  unicorn: mediaUrl(`${HOME_BASE}/unicorn.png`),
}

/** 全站入口图标：模块/奖励取 HOME_ASSETS 吉祥物图，播放/停止等通用钮取 SHARED_BASE */
const ICONS = {
  home: mediaUrl(`${ICON_BASE}/home.png`),
  poem: HOME_ASSETS.rabbit,
  hanzi: HOME_ASSETS.cat,
  math: HOME_ASSETS.dog,
  english: HOME_ASSETS.bear,
  pinyin: HOME_ASSETS.duckling,
  calendar: HOME_ASSETS.penguin,
  task: HOME_ASSETS.dino,
  reward: HOME_ASSETS.unicorn,
  star: HOME_ASSETS.star,
  avatar: HOME_ASSETS.avatar,
  play: mediaUrl(`${SHARED_BASE}/play.png`),
  stop: mediaUrl(`${SHARED_BASE}/stop.png`),
  check: mediaUrl(`${SHARED_BASE}/check.png`),
  bigStar: mediaUrl(`${SHARED_BASE}/big-star.png`),
}

/** 古诗封面图 */
function poemCover(cover) {
  if (!cover) return HOME_ASSETS.rabbit
  if (cover.startsWith('/') || cover.startsWith('cloud://')) return mediaUrl(cover)
  return mediaUrl(`/subpkg/poem/static/${cover}.png`)
}

/** 八大板块 + 壳层入口 */
const MODULE_ICONS = {
  home: ICONS.home,
  hanzi: ICONS.hanzi,
  poem: ICONS.poem,
  pinyin: ICONS.pinyin,
  english: ICONS.english,
  math: ICONS.math,
  calendar: ICONS.calendar,
  task: ICONS.task,
  reward: ICONS.reward,
}

/** 积木底色（对齐首页确认稿 tone） */
const MODULE_TINTS = {
  poem: 'sky',
  hanzi: 'butter',
  math: 'peach',
  english: 'mint',
  pinyin: 'lilac',
  calendar: 'apricot',
  task: 'matcha',
  reward: 'rose',
}

/** 古诗缺封面时的回退图 */
const POEM_ICONS = {
  'yong-e': HOME_ASSETS.rabbit,
  'jing-ye-si': HOME_ASSETS.rabbit,
  'min-nong': HOME_ASSETS.rabbit,
  'chun-xiao': HOME_ASSETS.rabbit,
}

/** 古诗封面 */
function poemIcon(poemId, cover) {
  if (cover) return poemCover(cover)
  return POEM_ICONS[poemId] || ICONS.poem
}

/** 模块底色 */
function tintOf(moduleId) {
  return MODULE_TINTS[moduleId] || 'cream'
}

module.exports = {
  HOME_ASSETS,
  ICONS,
  MODULE_ICONS,
  poemIcon,
  tintOf,
}
