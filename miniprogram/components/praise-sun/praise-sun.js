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
    action: { type: String, value: '' },
  },
  data: {
    visible: false,
    starIcon: require('../../config/media').mediaUrl('/static/shared/big-star.png'),
    cloudIcon: require('../../config/media').mediaUrl('/static/shared/cloud.png'),
    grassIcon: require('../../config/media').mediaUrl('/static/shared/grass-tuft.png'),
    actionLabel: '继续学',
  },
  observers: {
    show(val) {
      this.setData({ visible: !!val })
    },
    'variant, action'(variant, action) {
      const byVariant = {
        success: '继续学',
        exchange: '收下啦',
        softFail: '再看看',
      }
      this.setData({ actionLabel: action || byVariant[variant] || '继续学' })
    },
  },
  methods: {
    onContinue() {
      this.triggerEvent('continue')
    },
  },
})
