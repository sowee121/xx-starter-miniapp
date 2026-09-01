/**
 * 页面跳转与 query 解析。主包可达，分包也可 require。
 * 栈满时 navigateTo 失败会改走 redirectTo，避免点了没反应。
 */

/** 解码 query，非法编码则原样返回 */
function decodeQuery(value, fallback = '') {
  if (value == null || value === '') return fallback
  const text = String(value)
  try {
    return decodeURIComponent(text)
  } catch (error) {
    return text
  }
}

/** 读取并解码 query */
function queryValue(query, key, fallback = '') {
  if (!query || query[key] == null || query[key] === '') return fallback
  return decodeQuery(query[key], fallback)
}

/** 跳转页面，栈满则重定向 */
function goTo(url, { mode = 'navigate' } = {}) {
  if (!url || typeof wx !== 'object') return false
  const api =
    mode === 'redirect' ? wx.redirectTo : mode === 'reLaunch' ? wx.reLaunch : wx.navigateTo
  if (typeof api !== 'function') return false
  try {
    api.call(wx, {
      url,
      /** 跳转失败则改重定向 */
      fail(err) {
        const msg = (err && err.errMsg) || ''
        if (
          mode === 'navigate' &&
          /limit|timeout/i.test(msg) &&
          typeof wx.redirectTo === 'function'
        ) {
          wx.redirectTo({ url, fail() {} })
          return
        }
        if (typeof wx.showToast === 'function') {
          wx.showToast({ title: '打不开这一页', icon: 'none' })
        }
      },
    })
    return true
  } catch (error) {
    return false
  }
}

/** 先下载分包再跳转 */
function loadThenGo(pkg, url) {
  /** 分包就绪后跳转 */
  const go = () => goTo(url)
  if (!pkg || typeof wx.loadSubpackage !== 'function') {
    go()
    return
  }
  wx.loadSubpackage({ name: pkg, success: go, fail: go })
}

module.exports = {
  decodeQuery,
  queryValue,
  goTo,
  loadThenGo,
}
