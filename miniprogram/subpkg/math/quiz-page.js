const stars = require('../../utils/stars')
const feedback = require('../../utils/feedback')
const { INLINE } = require('../../content/feedback')
const { clearAdvanceTimer, handleCorrect } = require('./quiz-flow')

/** 算术切题状态 */
function navState(step, hasPrev) {
  return {
    label: String(step),
    hasPrev: !!hasPrev,
    hasNext: true,
    total: 2,
  }
}

/** 清空作答态 */
function resetPick() {
  return {
    pickedValue: null,
    pickedCorrect: false,
    wrongShake: false,
    softNote: '',
    softNoteTone: 'tone-butter',
  }
}

/** 选项带本题唯一 key，避免 wx:key 复用节点把选中环带到下一题 */
function stampChoices(page, patch) {
  const round = (page._choiceRound = (page._choiceRound || 0) + 1)
  const choices = ((patch.question && patch.question.choices) || []).map((value, i) => ({
    value,
    key: `${round}-${i}`,
  }))
  return { ...patch, choices }
}

/**
 * 口算 / 数数共用切题与作答。出题差异由 makeQuestion / snapshot 注入。
 * 必须留在 math 分包内，不能进主包。
 */
function createQuizPage({ extraData, makeQuestion, snapshot }) {
  return {
    data: {
      stars: 0,
      question: null,
      choices: [],
      ...resetPick(),
      nav: navState(1, false),
      feedback: { show: false, closing: false },
      ...extraData,
    },

    onLoad() {
      this._history = []
      this._step = 1
      this.applyQuestion({ pushHistory: false })
    },

    onShow() {
      this.setData({ stars: stars.getLocalStars() })
    },

    /** 出下一题 */
    applyQuestion({ pushHistory } = { pushHistory: true }) {
      if (!this._history) this._history = []
      if (typeof this._step !== 'number') this._step = 1
      if (pushHistory && this.data.question && snapshot) {
        this._history.push(snapshot(this))
      } else if (pushHistory && this.data.question) {
        this._history.push(this.data.question)
      }
      this.setData({
        ...stampChoices(this, makeQuestion(this)),
        ...resetPick(),
        nav: navState(this._step, this._history.length > 0),
      })
    },

    /** 立刻摘掉选中环 */
    clearPick() {
      this.setData(resetPick())
    },

    /** 上一题 */
    goPrev() {
      if (!this._history || !this._history.length) return
      clearAdvanceTimer(this)
      this._busy = false
      feedback.hideLayer(this)
      feedback.clearInline(this)
      this.clearPick()
      const prev = this._history.pop()
      this._step = Math.max(1, this._step - 1)
      const restored = snapshot ? prev : { question: prev }
      this.setData({
        ...stampChoices(this, restored),
        ...resetPick(),
        nav: navState(this._step, this._history.length > 0),
      })
    },

    /** 下一题 */
    goNext() {
      clearAdvanceTimer(this)
      this._busy = false
      feedback.hideLayer(this)
      feedback.clearInline(this)
      this.clearPick()
      this._step += 1
      this.applyQuestion({ pushHistory: true })
    },

    /** 选择答案 */
    choose(e) {
      if (this._busy || !this.data.question) return
      const raw = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value
      const value = Number(raw)
      if (!Number.isFinite(value)) return
      const correct = value === this.data.question.answer
      if (!correct) {
        this.setData({
          pickedValue: value,
          pickedCorrect: false,
          wrongShake: false,
        })
        wx.nextTick(() => {
          this.setData({ wrongShake: true })
        })
        feedback.showInline(this, INLINE.answerWrong)
        return
      }
      this.setData({
        pickedValue: value,
        pickedCorrect: true,
        wrongShake: false,
      })
      this._busy = true
      handleCorrect(this, {
        reason: 'math',
        ref: this.data.question.id,
        taskId: 'math',
      })
    },

    /** 进入下一题 */
    next() {
      this.goNext()
    },

    onUnload() {
      clearAdvanceTimer(this)
      require('../../utils/audio').stop()
    },
  }
}

module.exports = { createQuizPage, navState }
