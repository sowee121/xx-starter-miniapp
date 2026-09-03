Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 图卡 / 词卡 / 字母歌卡的图片地址 */
    image: { type: String, value: '' },
    /** 字卡内容（emoji 字符，识字卡专用） */
    emoji: { type: String, value: '' },
    /** 词卡 / 字卡底部标签文字 */
    label: { type: String, value: '' },
    /** 是否渲染播放钮；纯图卡 / 字母歌卡开，词卡 / 字卡关 */
    play: { type: Boolean, value: true },
    /** 播放钮仅展示、不拦截点击，列表装饰钮用 */
    passive: { type: Boolean, value: true },
    /** 播放中态，透传给 play-button（字母歌卡显示停止方块） */
    playing: { type: Boolean, value: false },
    /** 追加到卡根的 class：tone-* / word-card--english / word-card--hanzi / is-song */
    cls: { type: String, value: '' },
  },
  methods: {
    /** 整卡可点，事件冒泡到宿主后由页面 handler 经 dataset 分发 */
    onTap() {
      this.triggerEvent('tap', {}, { bubbles: true, composed: true })
    },
  },
})
