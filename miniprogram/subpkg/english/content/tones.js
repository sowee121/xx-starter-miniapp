/** 英语分类色，列表与详情共用 */
const TONE_MAP = {
  fruit: 'rose',
  animal: 'butter',
  color: 'sky',
  number: 'apricot',
  body: 'matcha',
  transport: 'peach',
  food: 'cream',
  nature: 'lilac',
}

function toneOf(catId) {
  return TONE_MAP[catId] || 'cream'
}

module.exports = { TONE_MAP, toneOf }
