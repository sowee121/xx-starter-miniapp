#!/usr/bin/env node
/**
 * 算术答题：反馈后自动切题，同一题不能连跳两次。
 */
const assert = require('node:assert/strict')
const {
  FEEDBACK_MS,
  canAdvanceQuestion,
  beginFeedback,
  stopFeedbackTimer,
  advanceQuestion,
} = require('../miniprogram/subpkg/math/quiz')

assert.equal(FEEDBACK_MS, 1800)
assert.equal(canAdvanceQuestion('q1'), true)
assert.equal(canAdvanceQuestion(null), false)
assert.equal(canAdvanceQuestion(''), false)

const calls = []
const ctx = {
  _feedbackFor: undefined,
  data: { question: { id: 'q1' }, locked: false },
  setData(patch) {
    Object.assign(this.data, patch)
  },
  applyQuestion() {
    calls.push(this.data.question.id)
    this.data.question = { id: 'q2' }
    this.setData({ locked: false, retry: false, praise: false })
  },
}

beginFeedback(ctx, true)
assert.equal(ctx.data.praise, true)
assert.equal(ctx.data.locked, true)
assert.equal(ctx._feedbackFor, 'q1')
stopFeedbackTimer(ctx)

advanceQuestion(ctx)
advanceQuestion(ctx)
assert.deepEqual(calls, ['q1'])
assert.equal(ctx._feedbackFor, null)

console.log('✔ 算术自动切题规则通过')
