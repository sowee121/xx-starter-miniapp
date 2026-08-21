const LAYERS = {
  taskDone: {
    variant: 'success',
    title: '宝贝真棒',
    desc: (taskTitle) => `「${taskTitle}」任务完成啦～`,
  },
  exchangeSuccess: {
    variant: 'exchange',
    title: '兑换成功',
    desc: '新的动物贴纸送给你～',
  },
  exchangeFailed: {
    variant: 'softFail',
    title: '兑换失败',
    desc: '稍后再来兑贴纸吧～',
  },
}

const INLINE = {
  answerCorrect: {
    text: '答对啦！你真棒！',
    audio: '/static/shared/answer-correct.mp3',
  },
  answerWrong: {
    text: '答错啦！再试一次吧～',
    audio: '/static/shared/answer-wrong.mp3',
  },
  audioUnavailable: '语音准备中～',
}

/** 任务列表页头三种状态（P1 / P2 / P3） */
function taskHead(doneCount, totalCount) {
  if (doneCount <= 0) {
    return { hint: '今天的任务', subHint: '慢慢完成吧～' }
  }
  if (doneCount >= totalCount) {
    return { hint: '今天的任务完成啦', subHint: '宝贝真棒' }
  }
  return { hint: `今天已完成 ${doneCount} 项`, subHint: '再完成一点点～' }
}

module.exports = {
  LAYERS,
  INLINE,
  taskHead,
}
