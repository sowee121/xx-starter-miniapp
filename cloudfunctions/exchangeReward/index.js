const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 贴纸兑换价目，与商城 stickers.js 同源 */
const REWARDS = {
  rabbit: { cost: 2, type: 'sticker', name: '小兔' },
  cat: { cost: 2, type: 'sticker', name: '小猫' },
  dog: { cost: 2, type: 'sticker', name: '小狗' },
  duckling: { cost: 2, type: 'sticker', name: '小鸭' },
  chicken: { cost: 2, type: 'sticker', name: '小鸡' },
  pig: { cost: 2, type: 'sticker', name: '小猪' },
  bird: { cost: 2, type: 'sticker', name: '小鸟' },
  fish: { cost: 2, type: 'sticker', name: '小鱼' },
  hamster: { cost: 2, type: 'sticker', name: '小仓鼠' },
  bear: { cost: 4, type: 'sticker', name: '小熊' },
  penguin: { cost: 4, type: 'sticker', name: '小企鹅' },
  sheep: { cost: 4, type: 'sticker', name: '小羊' },
  cow: { cost: 4, type: 'sticker', name: '小牛' },
  monkey: { cost: 4, type: 'sticker', name: '小猴子' },
  fox: { cost: 6, type: 'sticker', name: '小狐狸' },
  panda: { cost: 6, type: 'sticker', name: '小熊猫' },
  elephant: { cost: 6, type: 'sticker', name: '小象' },
  giraffe: { cost: 6, type: 'sticker', name: '长颈鹿' },
  dolphin: { cost: 6, type: 'sticker', name: '小海豚' },
  otter: { cost: 6, type: 'sticker', name: '小水獭' },
  dino: { cost: 8, type: 'sticker', name: '小恐龙' },
  lion: { cost: 8, type: 'sticker', name: '小狮子' },
  tiger: { cost: 8, type: 'sticker', name: '小老虎' },
  unicorn: { cost: 10, type: 'sticker', name: '独角兽' },
}

/** 云函数入口 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const rewardId = event.rewardId
  const reward = REWARDS[rewardId]
  if (!reward) return { ok: false, error: 'invalid_reward' }

  const users = db.collection('users')
  const found = await users.where({ _openid: OPENID }).limit(1).get()
  const user = found.data[0]
  if (!user) return { ok: false, error: 'no_user' }
  if ((user.stars || 0) < reward.cost) return { ok: false, error: 'not_enough_stars' }
  if ((user.stickers || []).includes(rewardId)) {
    return { ok: false, error: 'sticker_owned' }
  }

  // 条件更新：星数够、且还没拥有该贴纸时才落库。
  // 上面的预读只用于给出友好错误，连点/多设备并发要靠这一步的条件兜住，
  // 否则两次请求都能读到旧星数、各扣一次。
  const applied = await users
    .where({
      _id: user._id,
      _openid: OPENID,
      stars: _.gte(reward.cost),
      stickers: _.nin([rewardId]),
    })
    .update({
      data: {
        stars: _.inc(-reward.cost),
        stickers: _.push(rewardId),
        updatedAt: Date.now(),
      },
    })
  if (!applied.stats || !applied.stats.updated) {
    // 已被另一次请求抢先扣过，本次不能再扣
    return { ok: false, error: 'exchange_conflict' }
  }

  await db.collection('reward_logs').add({
    data: {
      _openid: OPENID,
      rewardId,
      cost: reward.cost,
      createdAt: Date.now(),
    },
  })

  const latest = await users.doc(user._id).get()
  const stars = (latest.data && latest.data.stars) || 0
  return { ok: true, stars, stickerId: rewardId }
}
