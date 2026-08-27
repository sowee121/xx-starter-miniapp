/**
 * 点击节流：第一次立刻执行，GAP 内重复点击忽略。
 * 用法：play: tap(function (e) { ... })
 * 只拦带事件对象的调用，this.goNext() 不受影响。
 */
const TAP_GAP = 300

/** 是否为点击/组件冒泡来的 UI 事件 */
function isUiEvent(e) {
  return !!(
    e
    && typeof e === 'object'
    && typeof e.type === 'string'
    && (e.currentTarget || e.target)
  )
}

/** 包一层点击节流 */
function tap(fn) {
  let last = 0
  return function tapped(e) {
    if (isUiEvent(e)) {
      const now = Date.now()
      if (now - last < TAP_GAP) return
      last = now
    }
    return fn.apply(this, arguments)
  }
}

module.exports = {
  TAP_GAP,
  tap,
}
