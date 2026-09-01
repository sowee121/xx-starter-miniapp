const { mediaUrl } = require('../../../config/media')

// [名称, id, 消耗星星, 主题色]
// 主题色取自项目低饱和护眼 tone-* 体系，按动物色系分组、相邻不撞色，每种动物固定专属
const ANIMALS = [
  ['小兔', 'rabbit', 2, 'rose'],
  ['小猫', 'cat', 2, 'peach'],
  ['小狗', 'dog', 2, 'apricot'],
  ['小鸭', 'duckling', 2, 'butter'],
  ['小鸡', 'chicken', 2, 'apricot'],
  ['小猪', 'pig', 2, 'rose'],
  ['小鸟', 'bird', 2, 'sky'],
  ['小鱼', 'fish', 2, 'mint'],
  ['小仓鼠', 'hamster', 2, 'peach'],
  ['小熊', 'bear', 4, 'apricot'],
  ['小企鹅', 'penguin', 4, 'sky'],
  ['小羊', 'sheep', 4, 'cream'],
  ['小牛', 'cow', 4, 'matcha'],
  ['小猴子', 'monkey', 4, 'apricot'],
  ['小狐狸', 'fox', 6, 'butter'],
  ['小熊猫', 'panda', 6, 'lilac'],
  ['小象', 'elephant', 6, 'sky'],
  ['长颈鹿', 'giraffe', 6, 'butter'],
  ['小海豚', 'dolphin', 6, 'mint'],
  ['小水獭', 'otter', 6, 'sky'],
  ['小恐龙', 'dino', 8, 'matcha'],
  ['小狮子', 'lion', 8, 'apricot'],
  ['小老虎', 'tiger', 8, 'butter'],
  ['独角兽', 'unicorn', 10, 'lilac'],
]

module.exports = ANIMALS.map(([name, id, cost, tone]) => ({
  id,
  name,
  cost,
  tone,
  image: mediaUrl(`/subpkg/shop/static/sticker-${id}.png`),
}))
