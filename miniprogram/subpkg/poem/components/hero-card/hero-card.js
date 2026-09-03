Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** tone 名（不含 tone- 前缀，内部拼 tone-{{tone}}）；古诗封面卡默认 peach */
    tone: { type: String, value: 'peach' },
    /** 封面大图地址（全宽 widthFix 横图，与 media-card wide 同源） */
    image: { type: String, value: '' },
    /** 标题大字（古诗题名） */
    title: { type: String, value: '' },
    /** 副行（作者） */
    author: { type: String, value: '' },
    /** 播放中态，透传 play-button（playingSrc === fullAudio） */
    playing: { type: Boolean, value: false },
    /** 追加到卡根的 class（扩展位） */
    cls: { type: String, value: '' },
  },
  methods: {
    /** 整卡可点，事件冒泡到宿主后由页面 handler 处理 */
    onTap() {
      this.triggerEvent('tap', {}, { bubbles: true, composed: true })
    },
  },
})
