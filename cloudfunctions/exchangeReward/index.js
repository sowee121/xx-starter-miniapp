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

/** 多条同 openid 文档（并发「先查后插」残留）：把分散字段并入首条后再删除。
 *  stars 相加——每笔 delta 由 star_logs 的 clientId 幂等只 cred 一次，档间余额不重叠；
 *  stickers/badges 并集去重；heatDays 逐日取最大；starsResetAt/heatResetAt/updatedAt 取最新。
 *  返回合并后的主档，调用方后续读写都应以它为准。 */
async function mergeStaleUsers(col, primary, stale) {
  let stars = Number(primary.stars) || 0
  const stickers = [...(primary.stickers || [])]
  const badges = [...(primary.badges || [])]
  const heatDays = { ...(primary.heatDays || {}) }
  let starsResetAt = Number(primary.starsResetAt) || 0
  let heatResetAt = Number(primary.heatResetAt) || 0
  let updatedAt = Number(primary.updatedAt) || 0
  for (const item of stale) {
    stars += Number(item.stars) || 0
    for (const s of item.stickers || []) {
      if (!stickers.includes(s)) stickers.push(s)
    }
    for (const b of item.badges || []) {
      if (!badges.includes(b)) badges.push(b)
    }
    for (const key of Object.keys(item.heatDays || {})) {
      heatDays[key] = Math.max(heatDays[key] || 0, Number(item.heatDays[key]) || 0)
    }
    starsResetAt = Math.max(starsResetAt, Number(item.starsResetAt) || 0)
    heatResetAt = Math.max(heatResetAt, Number(item.heatResetAt) || 0)
    updatedAt = Math.max(updatedAt, Number(item.updatedAt) || 0)
  }
  // heatDays / resetAt 用 _.set 整包覆盖，避免空对象被云端 update 忽略导致残留
  const patch = { stars, stickers, badges, heatDays: _.set(heatDays), updatedAt }
  if (starsResetAt) patch.starsResetAt = _.set(starsResetAt)
  if (heatResetAt) patch.heatResetAt = _.set(heatResetAt)
  await col.doc(primary._id).update({ data: patch })
  await col.where({ _id: _.in(stale.map((item) => item._id)) }).remove()
  return { ...primary, stars, stickers, badges, heatDays, starsResetAt, heatResetAt, updatedAt }
}

/** 云函数入口 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const rewardId = event.rewardId
  const reward = REWARDS[rewardId]
  if (!reward) return { ok: false, error: 'invalid_reward' }

  const users = db.collection('users')
  // 双档异常态：合并进首条后再判断，避免命中空壳档误拒兑换（无档仍返回 no_user）
  const found = await users.where({ _openid: OPENID }).limit(10).get()
  let user = found.data[0]
  if (!user) return { ok: false, error: 'no_user' }
  if (found.data.length > 1) {
    user = await mergeStaleUsers(users, user, found.data.slice(1))
  }
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
