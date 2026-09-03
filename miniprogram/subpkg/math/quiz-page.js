const stars = require('../../utils/stars')
const feedback = require('../../utils/feedback')
const feedbackBehavior = feedback.feedbackBehavior
const { INLINE } = require('../../content/feedback')
const { clearAdvanceTimer, handleCorrect } = require('./quiz-flow')
const { tap } = require('../../utils/tap-guard')

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
    behaviors: [feedbackBehavior],

    data: {
      stars: 0,
      question: null,
      choices: [],
      ...resetPick(),
      nav: navState(1, false),
      ...extraData,
    },

    onLoad() {
      this._history = []
      this._future = []
      this._step = 1
      this.applyQuestion({ pushHistory: false })
    },

    onShow() {
      this.setData({ stars: stars.getLocalStars() })
    },

    /** 主动出新题（答对自动切 / 手动前进）；回看分支经 goPrev/goNext 走栈，不经过这里 */
    applyQuestion({ pushHistory } = { pushHistory: true }) {
      if (!this._history) this._history = []
      if (typeof this._step !== 'number') this._step = 1
      if (pushHistory && this.data.question) {
        // 主动前进即放弃回看分支，当前题存档到历史
        this._future = []
        this._history.push(snapshot ? snapshot(this) : this.data.question)
        this._step += 1
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

    /** 上一题：当前题存未来栈，之后点「下一题」能原样恢复 */
    goPrev() {
      if (!this._history || !this._history.length) return
      clearAdvanceTimer(this)
      this._busy = false
      feedback.hideLayer(this)
      feedback.clearInline(this)
      this.clearPick()
      if (this.data.question) {
        this._future.push(snapshot ? snapshot(this) : this.data.question)
      }
      const prev = this._history.pop()
      this._step = Math.max(1, this._step - 1)
      const restored = snapshot ? prev : { question: prev }
      this.setData({
        ...stampChoices(this, restored),
        ...resetPick(),
        nav: navState(this._step, this._history.length > 0),
      })
    },

    /** 下一题：有回看分支就恢复原题，没有才出全新题 */
    goNext() {
      clearAdvanceTimer(this)
      this._busy = false
      feedback.hideLayer(this)
      feedback.clearInline(this)
      this.clearPick()
      if (this._future && this._future.length) {
        const next = this._future.pop()
        // 当前题存回历史，保证还能再回看
        if (this.data.question) {
          this._history.push(snapshot ? snapshot(this) : this.data.question)
          this._step += 1
        }
        const restored = snapshot ? next : { question: next }
        this.setData({
          ...stampChoices(this, restored),
          ...resetPick(),
          nav: navState(this._step, this._history.length > 0),
        })
        return
      }
      this.applyQuestion({ pushHistory: true })
    },

    /** 选择答案 */
    choose: tap(function (e) {
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
    }),

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
