/** 英语单词媒体所在分包。真机禁止跨分包引用本地图片/音频。 */
const MEDIA_PKG = {
  fruit: 'english-fruit',
  animal: 'english-animal',
  color: 'english-color',
  body: 'english-body',
  transport: 'english-transport',
  number: 'english-number',
  food: 'english-food',
  nature: 'english-nature',
}

/** 分类色调 */
const TONE_MAP = {
  fruit: 'apricot',
  animal: 'butter',
  color: 'rose',
  number: 'lilac',
  body: 'peach',
  transport: 'sky',
  food: 'orange',
  nature: 'matcha',
}

/** 仅唯一词。orange 分属 color/fruit，必须带 cat。 */
const WORD_OWNER = {
  apple: 'english-fruit',
  arm: 'english-body',
  banana: 'english-fruit',
  bear: 'english-animal',
  bike: 'english-transport',
  bird: 'english-animal',
  black: 'english-color',
  blue: 'english-color',
  boat: 'english-transport',
  bread: 'english-food',
  brown: 'english-color',
  bus: 'english-transport',
  cake: 'english-food',
  candy: 'english-food',
  car: 'english-transport',
  cat: 'english-animal',
  cherry: 'english-fruit',
  cloud: 'english-nature',
  cookie: 'english-food',
  dog: 'english-animal',
  duck: 'english-animal',
  ear: 'english-body',
  egg: 'english-food',
  eight: 'english-number',
  eye: 'english-body',
  face: 'english-body',
  finger: 'english-body',
  fish: 'english-animal',
  five: 'english-number',
  flower: 'english-nature',
  foot: 'english-body',
  four: 'english-number',
  gold: 'english-color',
  grape: 'english-fruit',
  grass: 'english-nature',
  gray: 'english-color',
  green: 'english-color',
  hair: 'english-body',
  hand: 'english-body',
  head: 'english-body',
  hundred: 'english-number',
  juice: 'english-food',
  kiwi: 'english-fruit',
  leaf: 'english-nature',
  leg: 'english-body',
  lemon: 'english-fruit',
  lion: 'english-animal',
  mango: 'english-fruit',
  meat: 'english-food',
  milk: 'english-food',
  monkey: 'english-animal',
  moon: 'english-nature',
  mouth: 'english-body',
  nine: 'english-number',
  noodles: 'english-food',
  nose: 'english-body',
  one: 'english-number',
  panda: 'english-animal',
  peach: 'english-fruit',
  pear: 'english-fruit',
  pig: 'english-animal',
  pink: 'english-color',
  pizza: 'english-food',
  plane: 'english-transport',
  purple: 'english-color',
  rabbit: 'english-animal',
  rain: 'english-nature',
  red: 'english-color',
  rice: 'english-food',
  river: 'english-nature',
  rocket: 'english-transport',
  seven: 'english-number',
  ship: 'english-transport',
  six: 'english-number',
  snow: 'english-nature',
  star: 'english-nature',
  strawberry: 'english-fruit',
  subway: 'english-transport',
  sun: 'english-nature',
  taxi: 'english-transport',
  tea: 'english-food',
  ten: 'english-number',
  thousand: 'english-number',
  three: 'english-number',
  tiger: 'english-animal',
  train: 'english-transport',
  tree: 'english-nature',
  truck: 'english-transport',
  two: 'english-number',
  van: 'english-transport',
  watermelon: 'english-fruit',
  white: 'english-color',
  wind: 'english-nature',
  yellow: 'english-color',
}

/** 分类对应色调 */
function toneOf(catId) {
  return TONE_MAP[catId] || 'cream'
}

/** 分类所属分包名 */
function mediaOwner(catId) {
  return MEDIA_PKG[catId] || ''
}

/** 分包名反查分类 id */
function catIdOfPackage(pkg) {
  const id = Object.keys(MEDIA_PKG).find((key) => MEDIA_PKG[key] === pkg)
  return id || ''
}

/** 单词所属分包 */
function wordOwner(word, catId) {
  if (catId && MEDIA_PKG[catId]) return MEDIA_PKG[catId]
  return WORD_OWNER[word] || ''
}

/** 列表小图路径 */
function listImageUrl(mediaUrl, catId, image) {
  return mediaUrl(`/subpkg/english/static/list/${image}.png`)
}

/** 详情大图路径 */
function detailImageUrl(mediaUrl, catId, image) {
  const owner = mediaOwner(catId)
  if (!owner || !image) return ''
  return mediaUrl(`/subpkg/${owner}/static/${image}.png`)
}

/** 详情页路径 */
function detailPageUrl(word, cat) {
  const owner = mediaOwner(cat)
  if (!owner) return ''
  const w = encodeURIComponent(word || '')
  const c = encodeURIComponent(cat || '')
  return `/subpkg/${owner}/detail/detail?word=${w}&cat=${c}`
}

module.exports = {
  MEDIA_PKG,
  TONE_MAP,
  WORD_OWNER,
  toneOf,
  mediaOwner,
  catIdOfPackage,
  wordOwner,
  listImageUrl,
  detailImageUrl,
  detailPageUrl,
}
