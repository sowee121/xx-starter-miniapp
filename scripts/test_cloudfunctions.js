#!/usr/bin/env node
/**
 * 云函数本地单元测试。
 * - Mock wx-server-sdk，不访问线上环境、不写入真实云数据库。
 * - 用法：node scripts/test_cloudfunctions.js
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const OPENID = 'test-openid'
const db = new Map()

/** 浅拷贝对象 */
function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

/** 匹配期望值 */
function matchValue(actual, expected) {
  if (!expected || !expected.__command) return actual === expected
  if (expected.__command === 'gte') return (Number(actual) || 0) >= expected.value
  if (expected.__command === 'nin') {
    const list = expected.value || []
    const owned = Array.isArray(actual) ? actual : actual === undefined ? [] : [actual]
    return !owned.some((item) => list.includes(item))
  }
  throw new Error(`mock 未支持的查询指令：${expected.__command}`)
}

/** 是否命中条件 */
function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => matchValue(doc[key], value))
}

/** 拼出云函数命令 */
function command(type, value) {
  return { __command: type, value }
}

/** 给假数据库打补丁 */
function applyPatch(doc, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (!value || !value.__command) {
      doc[key] = clone(value)
      continue
    }
    if (value.__command === 'inc') doc[key] = (doc[key] || 0) + value.value
    if (value.__command === 'push') doc[key] = [...(doc[key] || []), value.value]
  }
}

const cloud = {
  DYNAMIC_CURRENT_ENV: 'test-env',
  /** 初始化假云环境 */
  init() {},
  getWXContext: () => ({ OPENID }),
  database: () => ({
    command: {
      inc: (value) => command('inc', value),
      push: (value) => command('push', value),
      gte: (value) => command('gte', value),
      nin: (value) => command('nin', value),
    },
    /** 创建集合 */
    async createCollection(name) {
      if (db.has(name)) throw new Error('collection already exist')
      db.set(name, [])
    },
    /** 取集合句柄 */
    collection(name) {
      if (!db.has(name)) db.set(name, [])
      const docs = db.get(name)
      /** 链式查询 */
      const select = (query) => {
        let skipCount = 0
        let limitCount = Infinity
        const api = {
          /** 跳过前几条 */
          skip(n) {
            skipCount = Number(n) || 0
            return api
          },
          /** 限制条数 */
          limit(n) {
            limitCount = Number(n) || Infinity
            return api
          },
          /** 读取记录 */
          async get() {
            const filtered = docs.filter((doc) => matches(doc, query)).map(clone)
            return { data: filtered.slice(skipCount, skipCount + limitCount) }
          },
          /** 更新记录 */
          async update({ data }) {
            const hits = docs.filter((item) => matches(item, query))
            for (const doc of hits) applyPatch(doc, data)
            return { stats: { updated: hits.length } }
          },
          /** 删除记录 */
          async remove() {
            const keep = docs.filter((item) => !matches(item, query))
            const removed = docs.length - keep.length
            docs.length = 0
            docs.push(...keep)
            return { stats: { removed } }
          },
        }
        return api
      }
      return {
        where: select,
        // 与云函数一致：wx-server-sdk 的 add 不会自动注入 _openid，
        // 只有客户端 SDK 才会。这里刻意不补，才能拦住漏写 _openid 的云函数。
        async add({ data }) {
          const doc = { ...clone(data), _id: data._id || `${name}-${docs.length + 1}` }
          if (docs.some((item) => item._id === doc._id)) throw new Error('duplicate key')
          docs.push(doc)
          return { _id: doc._id }
        },
        /** 按 id 取文档 */
        doc(id) {
          return {
            /** 读取记录 */
            async get() {
              const item = docs.find((doc) => doc._id === id)
              if (!item) throw new Error('document.get document not exists')
              return { data: clone(item) }
            },
            /** 更新记录 */
            async update({ data }) {
              const item = docs.find((doc) => doc._id === id)
              assert.ok(item, `${name}/${id} 应存在`)
              applyPatch(item, data)
              return { stats: { updated: 1 } }
            },
          }
        },
      }
    },
  }),
}

const originalLoad = Module._load
Module._load = function load(request, parent, isMain) {
  if (request === 'wx-server-sdk') return cloud
  return originalLoad.call(this, request, parent, isMain)
}

/** 重置测试数据 */
function reset() {
  db.clear()
  for (const file of Object.keys(require.cache)) {
    if (file.startsWith(path.join(ROOT, 'cloudfunctions'))) delete require.cache[file]
  }
}

/** 取云函数实现 */
function fn(name) {
  return require(path.join(ROOT, 'cloudfunctions', name, 'index.js')).main
}

/** 读假库记录 */
function records(name) {
  return db.get(name) || []
}

/** 测建库 */
async function testInitDb() {
  reset()
  const result = await fn('initDb')()
  assert.equal(result.ok, true)
  assert.deepEqual(
    result.results.map((item) => item.name).sort(),
    ['progress', 'reward_logs', 'star_logs', 'task_logs', 'users']
  )
  assert.ok(result.results.every((item) => item.status === 'created'))
}

/** 测登录与档案 */
async function testLoginAndProfile() {
  reset()
  const login = await fn('login')()
  assert.equal(login.ok, true)
  assert.equal(login.profile.stars, 0)
  assert.equal(records('users').length, 1)

  const profile = await fn('getProfile')()
  assert.equal(profile.ok, true)
  assert.equal(profile.profile.stars, 0)
  assert.match(profile.serverDate, /^\d{4}-\d{2}-\d{2}$/)

  const secondLogin = await fn('login')()
  assert.equal(secondLogin.profile.stars, login.profile.stars)
  assert.ok(secondLogin.profile._id)
  assert.equal(records('users').length, 1)
}

/** 测加星 */
async function testAddStars() {
  reset()
  await fn('login')()
  const addStars = fn('addStars')
  assert.deepEqual(await addStars({ delta: 0, reason: 'math', clientId: 'a' }), {
    ok: false,
    error: 'invalid_params',
  })

  const first = await addStars({ delta: 3, reason: 'math', ref: '1+2', clientId: 'star-1' })
  assert.deepEqual(first, { ok: true, duplicated: false, stars: 3 })
  const duplicate = await addStars({ delta: 3, reason: 'math', ref: '1+2', clientId: 'star-1' })
  assert.deepEqual(duplicate, { ok: true, duplicated: true, stars: 3 })
  assert.equal(records('star_logs').length, 1)
  const pinyin = await addStars({ delta: 1, reason: 'pinyin_done', ref: 'a', clientId: 'pinyin-1' })
  assert.deepEqual(pinyin, { ok: true, duplicated: false, stars: 4 })
  const letter = await addStars({ delta: 1, reason: 'letter_done', ref: 'A', clientId: 'letter-1' })
  assert.deepEqual(letter, { ok: true, duplicated: false, stars: 5 })
  assert.deepEqual(await addStars({ delta: 1, reason: 'letter_skip', clientId: 'letter-bad' }), {
    ok: false,
    error: 'invalid_params',
  })
  assert.equal(records('star_logs').length, 3)
  assert.equal(records('star_logs')[1].credited, true)

  reset()
  await fn('login')()
  records('star_logs').push({
    _id: 'half-1',
    _openid: OPENID,
    delta: 2,
    reason: 'math',
    ref: '',
    credited: false,
    createdAt: Date.now(),
  })
  const repaired = await addStars({ delta: 2, reason: 'math', clientId: 'half-1' })
  assert.deepEqual(repaired, { ok: true, duplicated: false, stars: 2 })
  assert.equal(records('star_logs')[0].credited, true)

  const daily = await addStars({
    delta: 2,
    reason: 'daily_task',
    clientId: 'daily-2026-08-20-poem',
  })
  assert.equal(daily.stars, 4)
  const pinyinDaily = await addStars({
    delta: 6,
    reason: 'daily_task',
    clientId: 'daily-2026-08-20-pinyin',
  })
  assert.equal(pinyinDaily.ok, true)
  assert.equal(pinyinDaily.stars, 10)
  assert.deepEqual(
    await addStars({ delta: 7, reason: 'daily_task', clientId: 'daily-too-big' }),
    { ok: false, error: 'invalid_params' }
  )
  const dailyDup = await addStars({
    delta: 2,
    reason: 'daily_task',
    clientId: 'daily-2026-08-20-poem',
  })
  assert.deepEqual(dailyDup, { ok: true, duplicated: true, stars: 10 })

  reset()
  const orphan = await addStars({ delta: 2, reason: 'daily_task', clientId: 'no-login' })
  assert.equal(orphan.ok, true)
  assert.equal(orphan.stars, 2)
  assert.equal(records('users').length, 1)
  assert.equal(records('users')[0]._openid, OPENID)
  assert.equal(records('users')[0].stars, 2)
}

/** 测进度与任务 */
async function testProgressAndTasks() {
  reset()
  const completeProgress = fn('completeProgress')
  assert.deepEqual(await completeProgress({}), { ok: false, error: 'invalid_params' })
  assert.deepEqual(await completeProgress({ module: 'poem', itemId: 'poem-1' }), { ok: true })
  assert.deepEqual(await completeProgress({ module: 'poem', itemId: 'poem-1' }), { ok: true })
  assert.equal(records('progress').length, 1)
  assert.equal(records('progress')[0].done, true)

  await completeProgress({ module: 'hanzi', itemId: '一' })
  const getProgress = fn('getProgress')
  const all = await getProgress({})
  assert.equal(all.ok, true)
  assert.equal(all.items.length, 2)
  const poemOnly = await getProgress({ module: 'poem' })
  assert.equal(poemOnly.items.length, 1)
  assert.equal(poemOnly.items[0].itemId, 'poem-1')

  const checkinTask = fn('checkinTask')
  assert.deepEqual(await checkinTask({}), { ok: false, error: 'invalid_params' })
  const first = await checkinTask({ taskId: 'math' })
  assert.equal(first.ok, true)
  assert.equal(first.duplicated, false)
  assert.match(first.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.deepEqual(await checkinTask({ taskId: 'math' }), { ok: true, duplicated: true })
  assert.equal(records('task_logs').length, 1)
}

/** 所有落库记录都必须带 _openid，否则按用户查询会全空（云函数 add 不自动注入）。 */
async function testOwnership() {
  reset()
  await fn('login')()
  await fn('addStars')({ delta: 1, reason: 'math', clientId: 'own-1' })
  await fn('completeProgress')({ module: 'poem', itemId: 'poem-1' })
  await fn('checkinTask')({ taskId: 'poem' })
  records('users')[0].stars = 12
  await fn('exchangeReward')({ rewardId: 'rabbit' })

  for (const name of ['users', 'star_logs', 'progress', 'task_logs', 'reward_logs']) {
    const rows = records(name)
    assert.ok(rows.length > 0, `${name} 应有记录`)
    for (const row of rows) {
      assert.equal(row._openid, OPENID, `${name} 记录缺少 _openid`)
    }
  }
}

/** 测兑换 */
async function testRewards() {
  reset()
  const exchangeReward = fn('exchangeReward')
  assert.deepEqual(await exchangeReward({ rewardId: 'unknown' }), {
    ok: false,
    error: 'invalid_reward',
  })
  assert.deepEqual(await exchangeReward({ rewardId: 'rabbit' }), {
    ok: false,
    error: 'no_user',
  })

  await fn('login')()
  assert.deepEqual(await exchangeReward({ rewardId: 'rabbit' }), {
    ok: false,
    error: 'not_enough_stars',
  })
  records('users')[0].stars = 12
  assert.deepEqual(await exchangeReward({ rewardId: 'rabbit' }), {
    ok: true,
    stars: 10,
    stickerId: 'rabbit',
  })
  assert.deepEqual(await exchangeReward({ rewardId: 'rabbit' }), {
    ok: false,
    error: 'sticker_owned',
  })
  assert.deepEqual(await exchangeReward({ rewardId: 'unicorn' }), {
    ok: true,
    stars: 0,
    stickerId: 'unicorn',
  })
  assert.equal(records('reward_logs').length, 2)
}

/** 连点/多设备并发：两次请求都能读到旧星数，必须只有一次真正扣星。 */
async function testRewardRace() {
  reset()
  await fn('login')()
  records('users')[0].stars = 12
  const exchangeReward = fn('exchangeReward')
  const results = await Promise.all([
    exchangeReward({ rewardId: 'bear' }),
    exchangeReward({ rewardId: 'bear' }),
  ])
  assert.equal(results.filter((item) => item.ok).length, 1, '只应成功一次')
  assert.equal(results.find((item) => !item.ok).error, 'exchange_conflict')
  assert.equal(records('users')[0].stars, 8, '4 星贴纸只能扣一次')
  assert.deepEqual(records('users')[0].stickers, ['bear'])
  assert.equal(records('reward_logs').length, 1)
}

/** 热力按日只增不减，换机合并。 */
async function testBumpHeat() {
  reset()
  const bumpHeat = fn('bumpHeat')
  assert.deepEqual(await bumpHeat({}), { ok: false, error: 'invalid_params' })
  const first = await bumpHeat({ day: '2026-08-27', count: 2 })
  assert.equal(first.ok, true)
  assert.equal(first.heatDays['2026-08-27'], 2)
  const lower = await bumpHeat({ day: '2026-08-27', count: 1 })
  assert.equal(lower.heatDays['2026-08-27'], 2)
  const higher = await bumpHeat({ day: '2026-08-27', count: 4 })
  assert.equal(higher.heatDays['2026-08-27'], 4)
  assert.equal(records('users')[0]._openid, OPENID)
  assert.equal(records('users')[0].heatDays['2026-08-27'], 4)
}

/** 家长区重置：两个作用域互不越界。 */
async function testResetProfile() {
  reset()
  await fn('login')()
  await fn('addStars')({ delta: 5, reason: 'math', clientId: 'reset-1' })
  await fn('completeProgress')({ module: 'poem', itemId: 'poem-1' })
  await fn('checkinTask')({ taskId: 'poem' })
  const resetProfile = fn('resetProfile')

  assert.deepEqual(await resetProfile({}), { ok: false, error: 'invalid_params' })

  await fn('bumpHeat')({ day: '2026-08-27', count: 3 })
  const cleared = await resetProfile({ scope: 'progress' })
  assert.equal(cleared.ok, true)
  assert.equal(records('progress').length, 0)
  assert.deepEqual(records('users')[0].heatDays || {}, {}, '重置进度应清热力')
  assert.equal(records('users')[0].stars, 5, '重置进度不应动积分')
  assert.equal(records('task_logs').length, 1, '重置进度不应动今日打卡')

  records('users')[0].stickers = ['rabbit']
  const wiped = await resetProfile({ scope: 'stars' })
  assert.equal(wiped.ok, true)
  assert.ok(wiped.starsResetAt)
  assert.equal(records('users')[0].stars, 0)
  assert.equal(records('users')[0].starsResetAt, wiped.starsResetAt)
  assert.deepEqual(records('users')[0].stickers, ['rabbit'], '清空积分不应动贴纸')
  assert.equal(records('star_logs').length, 0, '余额清零后发星流水也应清掉')

  const stale = await fn('addStars')({
    delta: 2,
    reason: 'math',
    clientId: `${wiped.starsResetAt - 1000}-old`,
  })
  assert.equal(stale.stale, true)
  assert.equal(stale.stars, 0)
  assert.equal(records('users')[0].stars, 0)

  const staleDaily = await fn('addStars')({
    delta: 6,
    reason: 'daily_task',
    clientId: 'daily-2026-08-20-pinyin',
  })
  assert.equal(staleDaily.stale, true)
  assert.equal(records('users')[0].stars, 0, '清星后在途每日任务不应把星加回来')

  const peeled = await resetProfile({ scope: 'stickers' })
  assert.equal(peeled.ok, true)
  assert.deepEqual(records('users')[0].stickers, [])
  assert.equal(records('users')[0].stars, 0, '清空贴纸不应把积分加回来')

  const fresh = await fn('addStars')({
    delta: 1,
    reason: 'math',
    clientId: `${wiped.starsResetAt + 1}-new`,
  })
  assert.equal(fresh.ok, true)
  assert.equal(fresh.duplicated, false)
  assert.equal(records('users')[0].stars, 1)
}

/** 云函数入口 */
async function main() {
  const cases = [
    ['initDb 创建全部集合', testInitDb],
    ['login 与 getProfile 用户档案', testLoginAndProfile],
    ['addStars 参数校验与幂等', testAddStars],
    ['completeProgress 与 checkinTask', testProgressAndTasks],
    ['bumpHeat 按日只增不减', testBumpHeat],
    ['exchangeReward 校验与扣星', testRewards],
    ['exchangeReward 并发只扣一次', testRewardRace],
    ['resetProfile 分作用域重置', testResetProfile],
    ['落库记录均带 _openid', testOwnership],
  ]
  for (const [name, run] of cases) {
    await run()
    console.log(`✓ ${name}`)
  }
  console.log(`云函数本地测试通过：${cases.length}/${cases.length}`)
}

main().catch((error) => {
  console.error('云函数本地测试失败：', error.stack || error)
  process.exitCode = 1
})
