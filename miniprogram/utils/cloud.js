/**
 * 统一云函数调用。失败不弹窗，返回 { ok, data, error }。
 * wx.cloud 只允许出现在本文件。
 */
const { CLOUD_ENV } = require('../config/cloud')

function summarizeError(err) {
  if (err == null) return err
  if (typeof err === 'string') return err
  return {
    errMsg: err.errMsg || err.message || String(err),
    errCode: err.errCode,
  }
}

function call(name, data = {}) {
  return new Promise((resolve) => {
    if (!wx.cloud || !CLOUD_ENV) {
      const error = !wx.cloud ? 'cloud_unavailable' : 'cloud_env_missing'
      console.warn('[云函数] 未发起', { name, env: CLOUD_ENV || null, error })
      resolve({ ok: false, data: null, error })
      return
    }
    console.log('[云函数] 请求', { env: CLOUD_ENV, name, data })
    wx.cloud
      .callFunction({ name, data })
      .then((res) => {
        const result = (res && res.result) || {}
        const requestID = (res && res.requestID) || ''
        if (result.ok === false) {
          console.warn('[云函数] 业务失败', {
            name,
            requestID,
            result,
          })
          resolve({ ok: false, data: result, error: result.error || 'business_error' })
          return
        }
        console.log('[云函数] 响应', { name, requestID, result })
        resolve({ ok: true, data: result, error: null })
      })
      .catch((err) => {
        console.error('[云函数] 调用失败', {
          name,
          error: summarizeError(err),
        })
        resolve({ ok: false, data: null, error: err })
      })
  })
}

module.exports = {
  call,
}
