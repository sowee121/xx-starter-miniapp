const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    return { ok: true, scope, removed: (removed.stats && removed.stats.removed) || 0 }
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
