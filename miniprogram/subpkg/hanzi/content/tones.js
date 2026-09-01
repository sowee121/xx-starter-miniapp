/** 识字分类色，列表与详情共用 */
const TONE_MAP = {
  number: 'lilac',
  color: 'rose',
  animal: 'butter',
  family: 'coral',
  body: 'peach',
  nature: 'matcha',
  place: 'sand',
  transport: 'sky',
}

/** 分类对应色调 */
function toneOf(catId) {
  return TONE_MAP[catId] || 'cream'
}

module.exports = { TONE_MAP, toneOf }
