const content = require('../content/math')
const { randomCalcQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const { createQuizPage } = require('../quiz-page')

Page(
  createQuizPage({
    extraData: {
      calcImage: mediaUrl(`/subpkg/math/static/${content.calcImage}.png`),
    },
    /** 生成本题题目 */
    makeQuestion(page) {
      const prev = page.data.question
      const avoidKey = prev ? `${prev.a}${prev.op}${prev.b}` : null
      return { question: randomCalcQuestion(null, avoidKey) }
    },
  })
)
