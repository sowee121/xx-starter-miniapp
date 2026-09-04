const { mediaUrl } = require('../../../config/media')

// [名称, id, 消耗星星, 主题色]
// 主题色取自项目低饱和护眼 tone-* 体系，按动物天然色系分配：
// 粉系=兔/猫/猪，黄橙系=鸭/鸡/狐/狮/虎/鹿，棕米系=狗/熊/猴/獭，蓝系=鸟/企鹅/象/豚，
// 绿系=鱼/牛/恐龙，紫系=熊猫/独角兽，白系=羊；同色最多 3 只。
// 数组顺序即货架展示顺序：升星分组（2/4/6/8/10），组内每 3 只一行、行内跨色系不撞色。
const ANIMALS = [
  ['小兔', 'rabbit', 2, 'rose'],
  ['小鸭', 'duckling', 2, 'butter'],
  ['小鸟', 'bird', 2, 'sky'],
  ['小猫', 'cat', 2, 'peach'],
  ['小鸡', 'chicken', 2, 'orange'],
  ['小鱼', 'fish', 2, 'mint'],
  ['小猪', 'pig', 2, 'pink'],
  ['小狗', 'dog', 2, 'sand'],
  ['小仓鼠', 'hamster', 2, 'apricot'],
  ['小熊', 'bear', 4, 'tan'],
  ['小羊', 'sheep', 4, 'cream'],
  ['小企鹅', 'penguin', 4, 'frost'],
  ['小牛', 'cow', 4, 'matcha'],
  ['小猴子', 'monkey', 4, 'tan'],
  ['小狐狸', 'fox', 6, 'coral'],
  ['小熊猫', 'panda', 6, 'lilac'],
  ['长颈鹿', 'giraffe', 6, 'butter'],
  ['小象', 'elephant', 6, 'frost'],
  ['小海豚', 'dolphin', 6, 'mint'],
  ['小水獭', 'otter', 6, 'tan'],
  ['小恐龙', 'dino', 8, 'matcha'],
  ['小狮子', 'lion', 8, 'orange'],
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
