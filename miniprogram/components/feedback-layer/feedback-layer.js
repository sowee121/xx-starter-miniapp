const { tap } = require('../../utils/tap-guard')

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
    closingState: '', // 出场类；出场过渡走 CSS transition，无需动画重播
    starIcon: require('../../config/media').mediaUrl('/static/shared/big-star.png'),
    cloudIcon: require('../../config/media').mediaUrl('/static/shared/cloud.png'),
    grassIcon: require('../../config/media').mediaUrl('/static/shared/grass-tuft.png'),
    actionLabel: '继续学',
  },
  observers: {
    /** 显隐变化 */
    show(val) {
      this.setData({ visible: !!val })
    },
    closing(val) {
      this.setData({ closingState: val ? 'is-closing' : '' })
    },
    'variant, action'(variant, action) {
      const byVariant = {
        success: '继续学',
        exchange: '收下啦',
        fail: '再看看',
      }
      this.setData({ actionLabel: action || byVariant[variant] || '继续学' })
    },
  },
  methods: {
    /** 点卡片空白处：只拦住冒泡，不关弹层 */
    onCardTap() {},
    /** 点继续按钮或遮罩空白，关掉弹层 */
    onContinue: tap(function () {
      this.triggerEvent('continue')
    }),
  },
})
