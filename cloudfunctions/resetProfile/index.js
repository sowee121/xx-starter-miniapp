const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 家长区重置。只清当前用户的数据。
 * event.scope：
 * - 'stars'    清空积分与已换贴纸（含发星 / 兑换流水，保持余额与流水一致）
 * - 'progress' 清空学习进度（不动积分，也不动今日任务打卡）
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const scope = (event && event.scope) || ''

  if (scope === 'progress') {
    const removed = await db.collection('progress').where({ _openid: OPENID }).remove()
    return { ok: true, scope, removed: (removed.stats && removed.stats.removed) || 0 }
  }

  if (scope === 'stars') {
    await db
      .collection('users')
      .where({ _openid: OPENID })
      .update({
        data: { stars: 0, stickers: [], badges: [], updatedAt: Date.now() },
      })
    for (const name of ['star_logs', 'reward_logs']) {
      await db.collection(name).where({ _openid: OPENID }).remove()
    }
    return { ok: true, scope, stars: 0 }
  }

  return { ok: false, error: 'invalid_params' }
}
