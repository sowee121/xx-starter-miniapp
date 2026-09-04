/**
 * H5 审查稿纯导航：带 data-href 的元素点击即跳到对应静态帧。
 * 只做页面跳转，不做点读、播放、切题、答题、兑换等任何产品交互。
 */
;(function () {
  document.addEventListener('click', function (event) {
    var el = event.target.closest ? event.target.closest('[data-href]') : null
    if (el && el.getAttribute('data-href')) {
      location.href = el.getAttribute('data-href')
    }
  })
})()
