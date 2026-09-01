/**
 * 统一云函数调用。失败不弹窗，返回 { ok, data, error }。
 * wx.cloud 只允许出现在本文件。
 */
const { CLOUD_ENV } = require('../config/cloud')

/** wx.cloud.init 是否已完成；重复 init 会抛错，故用模块标志兜住 */
let inited = false

/** 云函数调用默认超时（ms），启动链快速兜底以免挂住模拟器 */
const CALL_TIMEOUT = 8000

/** 生产环境关掉每次请求/响应 log；排查时改 true */
const DEBUG = false

/** 压缩云错误信息 */
function summarizeError(err) {
  if (err == null) return err
  if (typeof err === 'string') return err
  return {
    errMsg: err.errMsg || err.message || String(err),
    errCode: err.errCode,
  }
}

/** 基础库 3.x 在 onLaunch 同步 init 时，内部 fs.stat 可能尚未挂上 */
function init() {
  if (inited) return true
  if (!wx.cloud || !CLOUD_ENV) return false
  try {
    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true,
    })
    inited = true
    return true
  } catch (error) {
    console.warn('[云] 初始化失败', summarizeError(error))
    return false
  }
}

/** 调用云函数（带超时兜底，防止无网络/挂死时阻塞启动链） */
function call(name, data = {}) {
  return new Promise((resolve) => {
    if (!init()) {
      const error = !wx.cloud ? 'cloud_unavailable' : 'cloud_env_missing'
      console.warn('[云函数] 未发起', { name, env: CLOUD_ENV || null, error })
      resolve({ ok: false, data: null, error })
      return
    }
    if (DEBUG) console.log('[云函数] 请求', { env: CLOUD_ENV, name, data })
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      console.warn('[云函数] 超时', { name })
      resolve({ ok: false, data: null, error: 'timeout' })
    }, CALL_TIMEOUT)

    wx.cloud
      .callFunction({ name, data })
      .then((res) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
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
        if (DEBUG) console.log('[云函数] 响应', { name, requestID, result })
        resolve({ ok: true, data: result, error: null })
      })
      .catch((err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        console.error('[云函数] 调用失败', {
          name,
          error: summarizeError(err),
        })
        resolve({ ok: false, data: null, error: err })
      })
  })
}

module.exports = {
  init,
  call,
}
