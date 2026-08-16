const { mediaUrl } = require('../config/media')

const HOME_BASE = '/static/home'

/** 首页确认稿素材（上云） */
const HOME_ASSETS = {
  meadow: mediaUrl(`${HOME_BASE}/meadow.png`),
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

/**
 * 全站图标与吉祥物
 * 首页入口统一走 HOME_ASSETS；旧页仍可能引用其它路径。
 */
const ICON_BASE = '/static/icons'

const SHARED_BASE = '/static/shared'

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
  bigStar: mediaUrl(`${SHARED_BASE}/big-star.png`),
}

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

const POEM_ICONS = {
  'yong-e': HOME_ASSETS.rabbit,
  'jing-ye-si': HOME_ASSETS.rabbit,
  'min-nong': HOME_ASSETS.rabbit,
  'chun-xiao': HOME_ASSETS.rabbit,
}

function iconOf(moduleId) {
  return MODULE_ICONS[moduleId] || ICONS.home
}

function poemIcon(poemId, cover) {
  if (cover) return poemCover(cover)
  return POEM_ICONS[poemId] || ICONS.poem
}

function tintOf(moduleId) {
  return MODULE_TINTS[moduleId] || 'cream'
}

module.exports = {
  HOME_BASE,
  HOME_ASSETS,
  ICON_BASE,
  SHARED_BASE,
  ICONS,
  MODULE_ICONS,
  MODULE_TINTS,
  POEM_ICONS,
  iconOf,
  poemIcon,
  poemCover,
  tintOf,
}
