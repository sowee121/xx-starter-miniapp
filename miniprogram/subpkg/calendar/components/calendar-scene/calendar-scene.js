Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    /** 天空图标（sun / moon-stars），按昼夜切换 */
    skyIcon: { type: String, value: '' },
    /** 是否夜间，控制 tone-night 色面 */
    isNight: { type: Boolean, value: false },
    /** 今日日期文案 */
    dateText: { type: String, value: '' },
    /** 今日星期文案 */
    weekday: { type: String, value: '' },
    /** 今日是否已打卡，决定按钮文案与禁用态 */
    checkedIn: { type: Boolean, value: false },
  },
  methods: {
    /** 点击打卡按钮，向页面抛出 checkin 事件 */
    onCheckinTap() {
      this.triggerEvent('checkin')
    },
  },
})
