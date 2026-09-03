Component({
  properties: {
    /** 主图 url */
    image: { type: String, value: '' },
    /** 算式左操作数 */
    a: { type: Number, value: 0 },
    /** 运算符（+ / −） */
    op: { type: String, value: '+' },
    /** 算式右操作数 */
    b: { type: Number, value: 0 },
  },
})
