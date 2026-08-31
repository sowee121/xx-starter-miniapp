const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 读取或创建用户。
 * 幂等：同 openid 若存在多条（并发「先查后插」竞态会产生），
 * 保留第一条并删除其余，避免积分/热力各写一条、getProfile 读到残留旧值。
 */
async function getOrCreateUser(openid) {
  const col = db.collection('users')
  const found = await col.where({ _openid: openid }).limit(10).get()
  const user = found.data[0]
  if (user) {
    if (found.data.length > 1) {
      const staleIds = found.data.slice(1).map((item) => item._id)
      await col.where({ _id: _.in(staleIds) }).remove()
    }
    return user
  }
  const doc = {
    stars: 0,
    stickers: [],
    badges: [],
    heatDays: {},
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await col.add({ data: doc })
  return { ...doc, _id: added._id }
}

/**
 * 家长区重置。只清当前用户的数据。
 * event.scope：
 * - 'progress' 清空学习进度（不动积分、贴纸、今日任务打卡）
 * - 'stars'    只清空积分（含发星流水；贴纸与兑换记录不动）
 * - 'stickers' 只清空贴纸（含兑换流水；积分不动）
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const scope = (event && event.scope) || ''

  if (scope === 'progress') {
    const removed = await db.collection('progress').where({ _openid: OPENID }).remove()
    // 确保用户文档存在后，按 openid 批量复位。
    // 用 where 而非 doc(user._id)：覆盖「同 openid 多条文档」脏数据——
    // 否则只清一条，getProfile 可能读到残留旧值的另一条；
    // 配合 _.set 强制覆盖，避免空对象被 update 忽略导致热力残留。
    await getOrCreateUser(OPENID)
    const heatResetAt = Date.now()
    await db.collection('users').where({ _openid: OPENID }).update({
      data: { heatDays: _.set({}), heatResetAt: _.set(heatResetAt), updatedAt: heatResetAt },
    })
    return {
      ok: true,
      scope,
      removed: (removed.stats && removed.stats.removed) || 0,
      heatResetAt,
    }
  }

  if (scope === 'stars') {
    const starsResetAt = Date.now()
    await db
      .collection('users')
      .where({ _openid: OPENID })
      .update({
        data: { stars: 0, starsResetAt, updatedAt: starsResetAt },
      })
    await db.collection('star_logs').where({ _openid: OPENID }).remove()
    return { ok: true, scope, stars: 0, starsResetAt }
  }

  if (scope === 'stickers') {
    await db
      .collection('users')
      .where({ _openid: OPENID })
      .update({
        data: { stickers: [], badges: [], updatedAt: Date.now() },
      })
    await db.collection('reward_logs').where({ _openid: OPENID }).remove()
    return { ok: true, scope, stickers: [] }
  }

  return { ok: false, error: 'invalid_params' }
}
