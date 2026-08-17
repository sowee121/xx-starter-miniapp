#!/usr/bin/env node
/**
 * 本地加星合并规则：云端返回 0 时不得覆盖已加的星。
 */
const assert = require('node:assert/strict')
const { pickStars } = require('../miniprogram/utils/stars')

assert.equal(pickStars(0, 0, { added: 3 }), 3)
assert.equal(pickStars(5, 0, { added: 3 }), 8)
assert.equal(pickStars(5, 8, { added: 3 }), 8)
assert.equal(pickStars(5, 0, { added: 3, duplicated: true }), 5)
assert.equal(pickStars(5, 12, { added: 3, duplicated: true }), 12)
assert.equal(pickStars(0, null, { added: 1 }), 1)
assert.equal(pickStars(2, undefined, { added: 4 }), 6)

console.log('✔ 加星合并规则通过')
