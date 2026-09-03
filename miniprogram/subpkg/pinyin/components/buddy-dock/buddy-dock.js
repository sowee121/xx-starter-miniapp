/** 伙伴气泡：吉祥物 + 提示语，纯展示 */
Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    icon: { type: String, value: '' },
    text: { type: String, value: '' },
    tone: { type: String, value: 'cream' },
  },
})
