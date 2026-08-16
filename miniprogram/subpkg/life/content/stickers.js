const { mediaUrl } = require('../../../config/media')

const ANIMALS = [
  ['小兔', 'rabbit', 2], ['小猫', 'cat', 2], ['小狗', 'dog', 2], ['小鸭', 'duckling', 2],
  ['小鸡', 'chicken', 2], ['小猪', 'pig', 2], ['小鸟', 'bird', 2], ['小鱼', 'fish', 2],
  ['小仓鼠', 'hamster', 2], ['小熊', 'bear', 4], ['小企鹅', 'penguin', 4], ['小羊', 'sheep', 4],
  ['小牛', 'cow', 4], ['小猴子', 'monkey', 4], ['小狐狸', 'fox', 6], ['小熊猫', 'panda', 6],
  ['小象', 'elephant', 6], ['长颈鹿', 'giraffe', 6], ['小海豚', 'dolphin', 6], ['小水獭', 'otter', 6],
  ['小恐龙', 'dino', 8], ['小狮子', 'lion', 8], ['小老虎', 'tiger', 8], ['独角兽', 'unicorn', 10],
]

const TONES = ['rose', 'sky', 'butter', 'matcha', 'peach', 'lilac', 'mint', 'apricot']

module.exports = ANIMALS.map(([name, id, cost], index) => ({
  id,
  name,
  cost,
  tone: TONES[index % TONES.length],
  image: mediaUrl(`/subpkg/life/static/sticker-${id}.png`),
}))
