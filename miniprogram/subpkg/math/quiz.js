/**
 * 数一数 / 算一算出题与布局。
 *
 * 数一数排列：每行列数 = 10 的约数中 ≤ 数量的最大者；
 * 数量为 10 时用 5（上 5 下 5），避免一行过挤。
 * 例：3→2+1，4→2+2，7→5+2，10→5+5。
 */

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick(list) {
  return list[randInt(0, list.length - 1)]
}

/** 10 的约数中 ≤ n 的最大者；n=10 时退回 5 */
function layoutCols(n) {
  const count = Math.max(1, Number(n) || 1)
  const divisors = [1, 2, 5, 10]
  let cols = 1
  for (let i = 0; i < divisors.length; i += 1) {
    if (divisors[i] <= count) cols = divisors[i]
  }
  if (cols === 10) return 5
  return cols
}

/** 正确答案附近的 3 个选项，升序；优先答案±1 */
function nearbyChoices(answer, min, max) {
  const set = new Set([answer])
  for (const delta of [-1, 1, -2, 2]) {
    if (set.size >= 3) break
    const v = answer + delta
    if (v >= min && v <= max) set.add(v)
  }
  for (let v = min; set.size < 3 && v <= max; v += 1) set.add(v)
  return Array.from(set).sort((a, b) => a - b)
}

function randomCountQuestion(fruitPool, avoidAnswer) {
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
    choices: nearbyChoices(answer, 1, 10),
    fruit: pick(fruitPool),
    cols: layoutCols(answer),
  }
}

/**
 * 随机加减（结果落在 1～5，适合低幼）。
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
      a = randInt(1, 4)
      b = randInt(1, 5 - a)
      answer = a + b
    } else {
      a = randInt(2, 5)
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
    choices: nearbyChoices(answer, 1, 5),
  }
}

module.exports = {
  layoutCols,
  nearbyChoices,
  randomCountQuestion,
  randomCalcQuestion,
  randInt,
  pick,
}
