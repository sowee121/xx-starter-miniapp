const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// P5 再换成 content/rewards.js 同源配置；此处先硬编码价目
const REWARDS = {
  'sticker-star': { cost: 5, type: 'sticker', name: '小星星' },
  'sticker-sun': { cost: 5, type: 'sticker', name: '小太阳' },
  'badge-poem': { cost: 20, type: 'badge', name: '古诗小达人' },
}

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
  if (reward.type === 'badge' && (user.badges || []).includes(rewardId)) {
    return { ok: false, error: 'badge_owned' }
  }

  const patch = {
    stars: _.inc(-reward.cost),
    updatedAt: Date.now(),
  }
  if (reward.type === 'sticker') {
    patch.stickers = _.push(rewardId)
  } else {
    patch.badges = _.push(rewardId)
  }

  await users.doc(user._id).update({ data: patch })
  await db.collection('reward_logs').add({
    data: {
      rewardId,
      cost: reward.cost,
      createdAt: Date.now(),
    },
  })

  return { ok: true, stars: user.stars - reward.cost }
}
