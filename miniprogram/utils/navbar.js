/** 读取状态栏与胶囊尺寸 */
function getNavbar() {
  let windowInfo = { statusBarHeight: 44, windowWidth: 375 }
  try {
    windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  } catch (error) {
    // 少数基础库取不到窗体信息
  }
  let rawMenu = null
  try {
    rawMenu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null
  } catch (error) {
    rawMenu = null
  }
  const statusBarHeight = windowInfo.statusBarHeight || 44
  const menu =
    rawMenu && rawMenu.width
      ? rawMenu
      : {
          top: statusBarHeight + 6,
          height: 32,
          width: 87,
          // 胶囊默认尺寸拿不到时的兜底左偏移：宽 87 + 右边距 7
          left: (windowInfo.windowWidth || 375) - 94,
        }
  const menuGap = Math.max(menu.top - statusBarHeight, 4)
  return {
    statusBarHeight,
    menuTop: menu.top,
    menuHeight: menu.height,
    menuWidth: menu.width,
    menuRight: windowInfo.windowWidth - menu.left,
    headerHeight: statusBarHeight + menuGap * 2 + menu.height,
    windowWidth: windowInfo.windowWidth,
  }
}

/**
 * 详情底栏切题（左右箭头）状态。
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

module.exports = { getNavbar, stepNavState }
