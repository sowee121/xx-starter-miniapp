const { poem, life } = require('../content/hanzi')
const stars = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: { stars: 0, item: null },

  onLoad(q) {
    const char = decodeURIComponent(q.char || '入')
    const item = poem.concat(life).find((x) => x.char === char) || poem[0]
    this.setData({ item })
  },

  onShow() {
    this.setData({ stars: stars.getLocalStars() })
  },

  async play(e) {
    const item = this.data.item
    if (!item) return

    const kind = (e.currentTarget && e.currentTarget.dataset.kind) || 'char'
    let src = item.audio
    if (kind === 'word') {
      const idx = Number(e.currentTarget.dataset.index)
      src = (item.wordAudios && item.wordAudios[idx]) || ''
    }

    if (src) {
      audioUtil.play(src)
    } else {
      wx.showToast({ title: '语音准备中', icon: 'none' })
    }

    if (item.char) {
      const result = await trackDaily('hanzi', item.char)
      this.setData({ stars: stars.getLocalStars() })
      if (!src && result && result.firstAward) {
        // trackDaily 已 toast 任务完成
      }
    }
  },

  onUnload() {
    audioUtil.stop()
  },
})
