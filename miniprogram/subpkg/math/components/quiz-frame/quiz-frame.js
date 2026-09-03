/**
 * 数学答题公共壳：承载 app-shell 外壳 + 选项区 + 底部导航，
 * 按 type 选渲染 count-card / calc-card。仅做展示与事件转发，不持有业务逻辑。
 */
Component({
  properties: {
    title: { type: String, value: '' },
    stars: { type: Number, value: 0 },
    feedback: { type: Object, value: null },
    barText: { type: String, value: '' },
    barTone: { type: String, value: 'tone-butter' },
    wrongShake: { type: Boolean, value: false },
    /** 当前题目；为 null 时整块不渲染 */
    question: { type: Object, value: null },
    /** 选项原始数据（{value,key}） */
    choices: { type: Array, value: [] },
    pickedValue: { type: null, value: null },
    pickedCorrect: { type: Boolean, value: false },
    /** 选项三色调，按序循环注入 */
    optionTones: { type: Array, value: ['sky', 'butter', 'peach'] },
    /** 'count' | 'calc'，决定渲染哪个主卡片 */
    type: { type: String, value: 'count' },
    /** count 卡片：物品图列表 */
    items: { type: Array, value: [] },
    /** count 卡片：数量（count-stage 尺寸档位） */
    count: { type: Number, value: 0 },
    /** calc 卡片：主图 url */
    calcImage: { type: String, value: '' },
    /** 是否有上一题 */
    hasPrev: { type: Boolean, value: false },
  },

  data: {
    barType: 'warning',
    decoratedChoices: [],
  },

  observers: {
    /** 由 barTone 推导 barType（success/warning） */
    barTone(tone) {
      this.setData({ barType: tone === 'tone-matcha' ? 'success' : 'warning' })
    },
    /** 给每个选项注入循环色调，规避 WXML 数组下标绑定不确定性 */
    'choices, optionTones'(choices, tones) {
      const list = (choices || []).map((c, i) => ({
        ...c,
        tone: (tones && tones[i % tones.length]) || '',
      }))
      this.setData({ decoratedChoices: list })
    },
  },

  methods: {
    /** 选项点击 → 页面 choose（value 经 detail 上传） */
    emitChoose(e) {
      const raw = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value
      const value = Number(raw)
      if (Number.isFinite(value)) this.triggerEvent('choose', { value })
    },
    emitPrev() {
      this.triggerEvent('prev')
    },
    emitNext() {
      this.triggerEvent('next')
    },
    emitContinue() {
      this.triggerEvent('continue')
    },
  },
})
