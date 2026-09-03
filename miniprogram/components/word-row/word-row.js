Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 主文（诗行 / 组词 / 例句） */
    text: { type: String, value: '' },
    /** 播放中高亮，由页面 playingSrc === 对应音频 驱动 */
    active: { type: Boolean, value: false },
    /** 播放中，透传给 play-button */
    playing: { type: Boolean, value: false },
    /** 双卡各占一半（hanzi 组词卡用） */
    half: { type: Boolean, value: false },
  },
  methods: {
    /** 整行可点，事件冒泡到宿主后由页面 handler 经 dataset 分发 */
    onTap() {
      this.triggerEvent('tap')
    },
  },
})
