Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** tone 名（不含 tone- 前缀，内部拼 tone-{{tone}}）；如 cream/sky/rose 或页面动态值 */
    tone: { type: String, value: 'cream' },
    /** 主图地址：english 词卡大图 / pinyin·abc 韵母图 / hanzi 不传 */
    image: { type: String, value: '' },
    /** 主图 class：detail-card__image(320rpx 词卡图，默认) 或 detail-card__image--wide(360rpx 韵母宽图) */
    imageClass: { type: String, value: 'detail-card__image' },
    /** 识字卡 emoji 大字（hanzi） */
    emoji: { type: String, value: '' },
    /** 识字卡汉字字形（hanzi） */
    glyph: { type: String, value: '' },
    /** 词卡主词大字（english） */
    title: { type: String, value: '' },
    /** 副行：注音或「拼音 · 笔画」串（四页都有） */
    sub: { type: String, value: '' },
    /** 词卡释义（english） */
    meaning: { type: String, value: '' },
    /** 播放中态，透传 play-button（playingSrc === item.audio） */
    playing: { type: Boolean, value: false },
    /** 是否渲染播放钮（默认 true，全部页面保留） */
    play: { type: Boolean, value: true },
    /** 追加到卡根的 class（扩展位） */
    cls: { type: String, value: '' },
  },
  methods: {
    /** 整卡可点，事件冒泡到宿主后由页面 handler 经 data-kind 分发 */
    onTap() {
      this.triggerEvent('tap', {}, { bubbles: true, composed: true })
    },
  },
})
