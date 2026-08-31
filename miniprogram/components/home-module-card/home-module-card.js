const { tap } = require('../../utils/tap-guard')

/** 六模块吉祥物卡面色（按动物主色），命中则替换 tone 类；其余模块回退原 tone */
const MASCOT_TONES = {
  pinyin: 'mascot-duckling',
  english: 'mascot-bear',
  hanzi: 'mascot-cat',
  poem: 'mascot-rabbit',
  math: 'mascot-dog',
  calendar: 'mascot-penguin',
}

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    title: { type: String, value: '' },
    image: { type: String, value: '' },
    tone: { type: String, value: 'cream' },
    url: { type: String, value: '' },
    moduleId: { type: String, value: '' },
  },
  data: {
    cardTone: 'tone-cream',
  },
  observers: {
    'moduleId, tone': function (moduleId, tone) {
      this.setData({ cardTone: MASCOT_TONES[moduleId] || `tone-${tone}` })
    },
  },
  methods: {
    /** 点击播放钮 */
    onTap: tap(function () {
      this.triggerEvent('tap', {
        id: this.data.moduleId,
        url: this.data.url,
        title: this.data.title,
      })
    }),
  },
})
