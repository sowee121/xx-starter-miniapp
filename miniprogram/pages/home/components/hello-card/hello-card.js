const { HOME_ASSETS } = require('../../../../content/mascots')
const { goTo } = require('../../../../utils/page')
const { tap } = require('../../../../utils/tap-guard')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    title: { type: String, value: '宝贝，你好呀' },
    subtitle: { type: String, value: '一起快乐学习吧～' },
    avatar: { type: String, value: HOME_ASSETS.avatar },
    /** 右侧点缀：雏菊枝 */
    deco: { type: String, value: HOME_ASSETS.daisy },
    tone: { type: String, value: 'cream' },
    /** 点击落地页，默认家长区 */
    url: { type: String, value: '/subpkg/parent/parent/parent' },
  },
  methods: {
    /** 点击整卡进落地页 */
    onTap: tap(function () {
      goTo(this.data.url)
    }),
  },
})
