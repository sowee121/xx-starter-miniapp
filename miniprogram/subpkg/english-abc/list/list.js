const { letters, songAudio } = require('../content/alphabet')
const stars = require('../../../utils/stars')
const { mediaUrl } = require('../../../config/media')
const { toggleLongPlay, attachLongPlay, detachLongPlay } = require('../../../utils/read-award')

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

  open(e) {
    const letter = e.currentTarget.dataset.letter
    wx.navigateTo({
      url: `/subpkg/english-abc/detail/detail?letter=${letter || ''}`,
    })
  },

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
