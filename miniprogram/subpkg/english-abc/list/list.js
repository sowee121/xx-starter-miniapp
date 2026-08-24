const { letters, songAudio } = require('../content/alphabet')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { toggleLongPlay, attachLongPlay, detachLongPlay } = require('../../../utils/read-award')
const { goTo } = require('../../../utils/page')

Page({
  data: {
    stars: 0,
    items: [],
    softNote: '',
    songSrc: '',
    songImage: '',
    longPlaying: false,
  },

  onLoad() {
    this.setData({
      songSrc: mediaUrl(songAudio),
      songImage: mediaUrl('/subpkg/english-abc/static/english-abc.png'),
      items: letters.map((x) => ({
        ...x,
        image: mediaUrl(`/subpkg/english-abc/static/${x.image}.png`),
        id: x.letter,
      })),
    })
  },

  onShow() {
    attachLongPlay(this)
    this.setData({ stars: stars.getLocalStars() })
  },

  /** 打开下一页 */
  open(e) {
    const letter = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.letter
    if (!letter) return
    goTo(`/subpkg/english-abc/detail/detail?letter=${encodeURIComponent(letter)}`)
  },

  /** 播放或停止字母歌 */
  toggleSong() {
    toggleLongPlay(this, { src: this.data.songSrc })
  },

  onHide() {
    detachLongPlay(this)
  },

  onUnload() {
    detachLongPlay(this)
  },
})
