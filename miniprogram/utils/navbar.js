function getNavbar() {
  const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  const rawMenu = wx.getMenuButtonBoundingClientRect
    ? wx.getMenuButtonBoundingClientRect()
    : null
  const statusBarHeight = windowInfo.statusBarHeight || 44
  const menu = rawMenu && rawMenu.width
    ? rawMenu
    : {
      top: statusBarHeight + 6,
      height: 32,
      width: 87,
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

module.exports = { getNavbar }
