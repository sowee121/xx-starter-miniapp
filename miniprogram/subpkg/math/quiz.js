/**
 * 数一数 / 算一算出题与布局。
 *
 * 数一数：尽量每行数量相同；5=3+2、7=4+3（末行居中）。
 * 1 / 2 / 3 单行；4=2×2；5=3+2；6=3×2；7=4+3；8=4×2；9=3×3；10=5×2。
 */

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** 每行数量相同：下标即数量 1～10 */
const COUNT_COLS = [0, 1, 2, 3, 2, 3, 3, 4, 4, 3, 5]

function layoutCols(n) {
  const count = Math.max(1, Math.min(10, Number(n) || 1))
  return COUNT_COLS[count]
}

/** 3 个选项：必含正确答案，其余从 1～10 随机抽，升序排列。 */
function randomChoices(answer, min, max, count = 3) {
  const pool = []
  for (let v = min; v <= max; v += 1) {
    if (v !== answer) pool.push(v)
  }
  const picks = [answer]
  while (picks.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(i, 1)[0])
  }
  return picks.sort((a, b) => a - b)
}

function randomCountQuestion(fruitImage, avoidAnswer) {
  let answer = randInt(1, 10)
  if (avoidAnswer != null) {
    let tries = 0
    while (answer === avoidAnswer && tries < 8) {
      answer = randInt(1, 10)
      tries += 1
    }
  }
  return {
    id: `c-rand-${Date.now()}-${answer}`,
    answer,
    prompt: '数一数，有几个？',
    choices: randomChoices(answer, 1, 10),
    fruitImage,
    cols: layoutCols(answer),
  }
}

/**
 * 随机加减（结果落在 1～10）。
 * preferOp: '+' | '−' | null（各半）
 */
function randomCalcQuestion(preferOp, avoidKey) {
  const op = preferOp || (Math.random() < 0.5 ? '+' : '−')
  let a
  let b
  let answer
  let key
  let tries = 0
  do {
    if (op === '+') {
      a = randInt(1, 9)
      b = randInt(1, 10 - a)
      answer = a + b
    } else {
      a = randInt(2, 10)
      b = randInt(1, a - 1)
      answer = a - b
    }
    key = `${a}${op}${b}`
    tries += 1
  } while (avoidKey && key === avoidKey && tries < 12)

  return {
    id: `calc-rand-${Date.now()}-${key}`,
    a,
    op,
    b,
    answer,
    choices: randomChoices(answer, 1, 10),
  }
}

module.exports = {
  randomCountQuestion,
  randomCalcQuestion,
}
