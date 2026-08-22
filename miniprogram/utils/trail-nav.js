/**
 * 详情底栏「上一个 / 序号 / 下一个」状态。
 * @param {number} index 0-based
 * @param {number} total
 */
function stepNavState(index, total) {
  const i = Math.max(0, Number(index) || 0)
  const n = Math.max(0, Number(total) || 0)
  return {
    index: i,
    total: n,
    label: n > 0 ? String(i + 1) : '',
    hasPrev: n > 0 && i > 0,
    hasNext: n > 0 && i < n - 1,
  }
}

module.exports = {
  stepNavState,
}
