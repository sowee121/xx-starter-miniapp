const content = require('../content/math')
const { randomCountQuestion } = require('../quiz')
const { mediaUrl } = require('../../../config/media')
const { createQuizPage } = require('../quiz-page')

/** 数数题快照 */
function snapshotCount(page) {
  return {
    question: page.data.question,
    count: page.data.count,
    cols: page.data.cols,
    items: page.data.items,
  }
}

Page(
  createQuizPage({
    extraData: {
      count: 0,
      cols: 1,
      items: [],
    },
    snapshot: snapshotCount,
    /** 生成本题题目 */
    makeQuestion(page) {
      const avoid = page.data.question && page.data.question.answer
      const question = randomCountQuestion(content.fruitImage, avoid)
      const src = mediaUrl(`/subpkg/math/static/${question.fruitImage}.png`)
      return {
        question,
        count: question.answer,
        cols: question.cols,
        items: Array.from({ length: question.answer }, () => src),
      }
    },
  })
)
