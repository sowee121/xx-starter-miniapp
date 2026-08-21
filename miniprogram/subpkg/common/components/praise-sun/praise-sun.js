Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    show: { type: Boolean, value: false },
    closing: { type: Boolean, value: false },
    variant: { type: String, value: 'success' },
    title: { type: String, value: '宝贝真棒' },
    desc: { type: String, value: '' },
    image: { type: String, value: '' },
  },
  data: {
    visible: false,
    starIcon: require('../../../../config/media').mediaUrl('/static/shared/big-star.png'),
    cloudIcon: require('../../../../config/media').mediaUrl('/subpkg/common/static/cloud.png'),
    grassIcon: require('../../../../config/media').mediaUrl('/subpkg/common/static/grass-tuft.png'),
  },
  observers: {
    show(val) {
      this.setData({ visible: !!val })
    },
  },
  methods: {
    onContinue() {
      this.triggerEvent('continue')
    },
  },
})
