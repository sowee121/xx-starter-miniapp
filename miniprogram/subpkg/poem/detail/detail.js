const { poems } = require('../content/poems')
const starsUtil = require('../../../utils/stars')
const audioUtil = require('../../../utils/audio')
const { poemIcon } = require('../../../content/mascots')
const { trackDaily } = require('../../../utils/daily-tasks')

Page({
  data: {
    stars: 0,
    poem: null,
    poemTitle: '古诗',
    poemAuthor: '',
    activeIndex: -1,
  },

  onLoad(query) {
    const raw = poems.find((p) => p.id === query.id) || poems[0] || null
    if (!raw) return
    const poem = {
      ...raw,
      icon: raw.icon || poemIcon(raw.id, raw.cover),
    }
    this.setData({
      poem,
      poemTitle: poem.title || '古诗',
      poemAuthor: poem.author || '',
    })
  },

  onShow() {
    this.setData({ stars: starsUtil.getLocalStars() })
  },

  async markPoemRead() {
    const poem = this.data.poem
    if (!poem || !poem.id) return null
    const result = await trackDaily('poem', poem.id)
    this.setData({ stars: starsUtil.getLocalStars() })
    return result
  },

  onLineTap(e) {
    const index = Number(e.detail && e.detail.index)
    const line = this.data.poem && this.data.poem.lines[index]
    if (!line) return
    this.setData({ activeIndex: index })
    this.markPoemRead().then((result) => {
      if (line.audio) {
        audioUtil.play(line.audio)
        return
      }
      if (!(result && result.firstAward)) {
        wx.showToast({ title: '语音准备中', icon: 'none' })
      }
    })
  },

  onFullRead() {
    const poem = this.data.poem
    this.setData({ activeIndex: -1 })
    this.markPoemRead().then((result) => {
      if (poem && poem.fullAudio) {
        audioUtil.play(poem.fullAudio)
        return
      }
      if (!(result && result.firstAward)) {
        wx.showToast({ title: '语音准备中', icon: 'none' })
      }
    })
  },

  onUnload() {
    audioUtil.stop()
  },
})
