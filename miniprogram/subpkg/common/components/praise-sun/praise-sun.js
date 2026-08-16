Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    text: { type: String, value: '真棒！' },
    show: { type: Boolean, value: false },
  },
  data: {
    visible: false,
    starIcon: require('../../../../config/media').mediaUrl('/static/shared/big-star.png'),
    cloudIcon: require('../../../../config/media').mediaUrl('/static/shared/cloud.png'),
    grassIcon: require('../../../../config/media').mediaUrl('/static/shared/grass-tuft.png'),
  },
  observers: {
    show(val) {
      this.setData({ visible: !!val })
    },
  },
  methods: {
    onContinue() {
      this.setData({ visible: false })
      this.triggerEvent('continue')
      this.triggerEvent('hide')
    },
  },
})
