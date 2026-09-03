Component({
  properties: {
    /** 物品图 url 列表 */
    items: { type: Array, value: [] },
    /** 数量，用于 count-stage--N 尺寸档位 */
    count: { type: Number, value: 0 },
    /** 标题，如「数一数，有几个？」 */
    prompt: { type: String, value: '' },
  },
})
