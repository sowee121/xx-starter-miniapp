/** 识字分类色，列表与详情共用 */
const TONE_MAP = {
  number: 'peach',
  color: 'cream',
  animal: 'butter',
  family: 'rose',
  body: 'matcha',
  nature: 'lilac',
  place: 'sky',
  transport: 'peach',
}

/** 分类对应色调 */
function toneOf(catId) {
  return TONE_MAP[catId] || 'cream'
}

module.exports = { TONE_MAP, toneOf }
