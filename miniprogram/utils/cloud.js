/**
 * 统一云函数调用。失败不弹窗，返回 { ok, data, error }。
 * wx.cloud 只允许出现在本文件。
 */
const { CLOUD_ENV } = require('../config/cloud')

function call(name, data = {}) {
  return new Promise((resolve) => {
    if (!wx.cloud || !CLOUD_ENV) {
      resolve({ ok: false, data: null, error: 'cloud_unavailable' })
      return
    }
    wx.cloud
      .callFunction({ name, data })
      .then((res) => {
        const result = (res && res.result) || {}
        if (result.ok === false) {
          resolve({ ok: false, data: result, error: result.error || 'business_error' })
          return
        }
        resolve({ ok: true, data: result, error: null })
      })
      .catch((err) => {
        resolve({ ok: false, data: null, error: err })
      })
  })
}

module.exports = {
  call,
}
