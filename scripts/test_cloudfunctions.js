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
/** 当前调用者身份；默认取 OPENID，鉴权用例可临时切换后还原 */
let CURRENT_OPENID = OPENID
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
  if (expected.__command === 'in') {
    const list = expected.value || []
    return list.includes(actual)
  }
  if (expected.__command === 'exists') {
    // 只用于空集合清空（where({ _id: _.exists(true) })），任意文档均视为命中
    return actual !== undefined
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
    if (value.__command === 'set') {
      doc[key] = clone(value.value)
      continue
    }
  }
}

const cloud = {
  DYNAMIC_CURRENT_ENV: 'test-env',
  /** 初始化假云环境 */
  init() {},
  getWXContext: () => ({ OPENID: CURRENT_OPENID }),
  database: () => ({
    command: {
      inc: (value) => command('inc', value),
      push: (value) => command('push', value),
      gte: (value) => command('gte', value),
      in: (value) => command('in', value),
      nin: (value) => command('nin', value),
      set: (value) => command('set', value),
      exists: (value) => command('exists', value),
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
            /** 整体替换（不存在则创建，与云端 set 语义一致） */
            async set({ data }) {
              const item = docs.find((doc) => doc._id === id)
              if (item) {
                for (const [key, value] of Object.entries(data)) item[key] = clone(value)
                return { stats: { updated: 1 } }
              }
              docs.push({ ...clone(data), _id: id })
              return { stats: { created: 1 } }
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

/** 测建库与 owner 鉴权 */
async function testInitDb() {
  reset()
  // whoami：只回显调用者自身 openid，不产生建表副作用
  const whoami = await fn('initDb')({ mode: 'whoami' })
  assert.deepEqual(whoami, { ok: true, openid: OPENID })
  assert.equal(records('users').length, 0)

  const result = await fn('initDb')()
  assert.equal(result.ok, true)
  assert.deepEqual(result.results.map((item) => item.name).sort(), [
    'daily_tasks',
    'progress',
    'reward_logs',
    'star_logs',
    'task_logs',
    'users',
  ])
  assert.ok(result.results.every((item) => item.status === 'created'))

  // 非 owner 调 reset 被拒，预置文档保留
  records('users').push({ _id: 'u-1', _openid: OPENID, stars: 5 })
  const before = clone(records('users'))
  CURRENT_OPENID = 'stranger-openid'
  try {
    const denied = await fn('initDb')({ mode: 'reset' })
    assert.deepEqual(denied, { ok: false, error: 'forbidden' })
  } finally {
    CURRENT_OPENID = OPENID
  }
  assert.deepEqual(records('users'), before)

  // owner reset：清空业务集合并写全局重置纪元（app_meta/reset），供每日任务作废旧本地
  const resetted = await fn('initDb')({ mode: 'reset' })
  assert.equal(resetted.ok, true)
  assert.equal(records('users').length, 0)
  assert.equal(records('daily_tasks').length, 0)
  const meta = records('app_meta')
  assert.equal(meta.length, 1)
  assert.equal(meta[0]._id, 'reset')
  assert.equal(typeof meta[0].resetAt, 'number')
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
  assert.deepEqual(await addStars({ delta: 7, reason: 'daily_task', clientId: 'daily-too-big' }), {
    ok: false,
    error: 'invalid_params',
  })
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

/** 每日任务云端存取：生成、幂等、seed、自愈、同步、重置。 */
async function testDailyTasks() {
  const dailyTasks = fn('dailyTasks')
  const seedTasks = [
    { id: 'poem', target: 1, reward: 2, title: '读 1 首古诗', url: '/subpkg/poem/list/list' },
    { id: 'hanzi', target: 2, reward: 2, title: '认 2 个汉字', url: '/subpkg/hanzi/list/list' },
    { id: 'math', target: 3, reward: 3, title: '做 3 道算术题', url: '/subpkg/math/hub/hub' },
    { id: 'english', target: 4, reward: 4, title: '学 4 个英语', url: '/subpkg/english/hub/hub' },
    { id: 'pinyin', target: 5, reward: 5, title: '读 5 个拼音', url: '/subpkg/pinyin/list/list' },
    { id: 'calendar', target: 1, reward: 1, title: '日历打卡', url: '/subpkg/calendar/index' },
  ]

  // 无 seed：云端模板生成 6 条完整任务
  reset()
  const created = await dailyTasks({ action: 'get', date: '2026-08-31' })
  assert.equal(created.ok, true)
  assert.equal(created.day.tasks.length, 6)
  for (const id of ['poem', 'hanzi', 'math', 'english', 'pinyin', 'calendar']) {
    assert.ok(
      created.day.tasks.some((t) => t.id === id),
      `任务应包含 ${id}`,
    )
  }
  assert.ok(
    created.day.tasks.every(
      (t) =>
        typeof t.target === 'number' &&
        t.target >= 1 &&
        typeof t.reward === 'number' &&
        t.title &&
        t.url,
    ),
    '任务应含 target/reward/title/url',
  )
  assert.equal(records('daily_tasks').length, 1)
  assert.equal(records('daily_tasks')[0]._openid, OPENID, 'daily_tasks 记录必须带 _openid')

  // 幂等：再次 get 返回同一份，不重复生成
  const again = await dailyTasks({ action: 'get', date: '2026-08-31' })
  assert.equal(again.ok, true)
  assert.deepEqual(again.day.tasks, created.day.tasks)
  assert.equal(records('daily_tasks').length, 1)

  // 有 seed：云端缺失时用 seed 入库，避免双随机漂移
  reset()
  const seeded = await dailyTasks({ action: 'get', date: '2026-08-31', seed: { tasks: seedTasks } })
  assert.equal(seeded.ok, true)
  assert.deepEqual(seeded.day.tasks, seedTasks)
  assert.equal(records('daily_tasks')[0].tasks[0].target, 1)

  // 同 openid+date 多条脏数据：get 自愈保留一条
  reset()
  records('daily_tasks').push(
    {
      _id: 'dt-a',
      _openid: OPENID,
      date: '2026-08-31',
      tasks: seedTasks,
      progress: { poem: ['x'] },
    },
    {
      _id: 'dt-b',
      _openid: OPENID,
      date: '2026-08-31',
      tasks: seedTasks,
      progress: { poem: ['y'] },
    },
  )
  const healed = await dailyTasks({ action: 'get', date: '2026-08-31' })
  assert.equal(healed.ok, true)
  assert.equal(records('daily_tasks').length, 1)

  // sync 无文档 → add；有文档 → update 整体替换
  reset()
  const syncAdd = await dailyTasks({
    action: 'sync',
    date: '2026-08-31',
    day: {
      schema: 10,
      tasks: seedTasks,
      progress: { poem: ['a', 'b'] },
      done: { poem: true },
      awarded: { poem: true },
    },
  })
  assert.equal(syncAdd.ok, true)
  assert.equal(records('daily_tasks').length, 1)
  assert.equal(records('daily_tasks')[0].progress.poem.length, 2)
  assert.equal(records('daily_tasks')[0]._openid, OPENID)

  const syncUpdate = await dailyTasks({
    action: 'sync',
    date: '2026-08-31',
    day: { schema: 10, tasks: seedTasks, progress: { poem: ['a'] }, done: {}, awarded: {} },
  })
  assert.equal(syncUpdate.ok, true)
  assert.equal(records('daily_tasks').length, 1)
  assert.equal(records('daily_tasks')[0].progress.poem.length, 1, 'sync 应整体替换当天文档')
  assert.equal(records('daily_tasks')[0].done.poem, undefined)

  assert.deepEqual(await dailyTasks({ action: 'sync', date: '2026-08-31', day: { tasks: [] } }), {
    ok: false,
    error: 'invalid_params',
  })
  assert.deepEqual(await dailyTasks({ action: 'nope' }), { ok: false, error: 'invalid_action' })

  // reset：删当天 daily_tasks + 当天 task_logs，别天保留
  reset()
  await fn('initDb')() // 先建集合，mock 的 records 在集合未创建时是临时数组、push 不落库
  records('daily_tasks').push({
    _id: 'dt-1',
    _openid: OPENID,
    date: '2026-08-31',
    tasks: seedTasks,
  })
  records('task_logs').push({ _id: 'tl-1', _openid: OPENID, date: '2026-08-31', tasks: [] })
  records('task_logs').push({ _id: 'tl-2', _openid: OPENID, date: '2026-08-30', tasks: [] })
  const resetted = await dailyTasks({ action: 'reset', date: '2026-08-31' })
  assert.equal(resetted.ok, true)
  assert.equal(records('daily_tasks').length, 0, 'reset 应清空当天任务文档')
  assert.equal(records('task_logs').length, 1, 'reset 应只删当天打卡')
  assert.equal(records('task_logs')[0].date, '2026-08-30')
}

/** 每日任务重置纪元：initDb reset 后，旧本地 seed / sync 不得把已清数据回写复活。 */
async function testDailyResetEpoch() {
  const dailyTasks = fn('dailyTasks')
  const seedTasks = [
    { id: 'poem', target: 1, reward: 2, title: '读 1 首古诗', url: '/subpkg/poem/list/list' },
    { id: 'hanzi', target: 2, reward: 2, title: '认 2 个汉字', url: '/subpkg/hanzi/list/list' },
    { id: 'math', target: 3, reward: 3, title: '做 3 道算术题', url: '/subpkg/math/hub/hub' },
    { id: 'english', target: 4, reward: 4, title: '学 4 个英语', url: '/subpkg/english/hub/hub' },
    { id: 'pinyin', target: 5, reward: 5, title: '读 5 个拼音', url: '/subpkg/pinyin/list/list' },
    { id: 'calendar', target: 1, reward: 1, title: '日历打卡', url: '/subpkg/calendar/index' },
  ]
  const resetAt = Date.now() - 1000

  // get 携带 reset 前旧 seed（updatedAt < 纪元）：seed 被忽略、全新空进度、纪元透传
  reset()
  db.set('app_meta', [{ _id: 'reset', resetAt }])
  const oldSeed = await dailyTasks({
    action: 'get',
    date: '2026-08-31',
    seed: { tasks: seedTasks, updatedAt: resetAt - 60000 },
  })
  assert.equal(oldSeed.ok, true)
  assert.equal(oldSeed.resetAt, resetAt)
  assert.deepEqual(oldSeed.day.progress, {})
  assert.ok(oldSeed.day.updatedAt >= resetAt, 'reset 后应生成全新文档')

  // reset 后新本地（updatedAt >= 纪元）且云端无文档 → seed 正常采用（不误伤正常路径）
  reset()
  db.set('app_meta', [{ _id: 'reset', resetAt }])
  const freshSeed = await dailyTasks({
    action: 'get',
    date: '2026-08-31',
    seed: { tasks: seedTasks, updatedAt: resetAt + 1000 },
  })
  assert.equal(freshSeed.ok, true)
  assert.deepEqual(freshSeed.day.tasks, seedTasks)

  // sync 拒收 reset 前旧本地（updatedAt < 纪元）：不回写、不覆盖云端新文档
  reset()
  await fn('initDb')() // 先建业务集合，records 的 push 才落库
  db.set('app_meta', [{ _id: 'reset', resetAt }])
  records('daily_tasks').push({
    _id: 'dt-new',
    _openid: OPENID,
    date: '2026-08-31',
    tasks: seedTasks,
    progress: { poem: ['cloud'] },
    done: {},
    awarded: {},
    updatedAt: resetAt + 5000,
  })
  const staleSync = await dailyTasks({
    action: 'sync',
    date: '2026-08-31',
    day: {
      schema: 10,
      tasks: seedTasks,
      progress: { poem: ['old'] },
      updatedAt: resetAt - 60000,
    },
  })
  assert.equal(staleSync.ok, true)
  assert.equal(staleSync.ignored, true)
  assert.equal(records('daily_tasks').length, 1)
  assert.deepEqual(
    records('daily_tasks')[0].progress.poem,
    ['cloud'],
    '旧本地进度不得覆盖 reset 后云端文档',
  )

  // 从未 reset（无纪元）→ 行为与历史一致：seed 采用、resetAt=0
  reset()
  const noEpoch = await dailyTasks({
    action: 'get',
    date: '2026-08-31',
    seed: { tasks: seedTasks, updatedAt: 1 },
  })
  assert.equal(noEpoch.ok, true)
  assert.equal(noEpoch.resetAt, 0)
  assert.deepEqual(noEpoch.day.tasks, seedTasks)
}

/** 所有落库记录都必须带 _openid，否则按用户查询会全空（云函数 add 不自动注入）。 */
async function testOwnership() {
  reset()
  await fn('login')()
  await fn('addStars')({ delta: 1, reason: 'math', clientId: 'own-1' })
  await fn('completeProgress')({ module: 'poem', itemId: 'poem-1' })
  await fn('checkinTask')({ taskId: 'poem' })
  await fn('dailyTasks')({ action: 'get' })
  records('users')[0].stars = 12
  await fn('exchangeReward')({ rewardId: 'rabbit' })

  for (const name of [
    'users',
    'star_logs',
    'progress',
    'task_logs',
    'reward_logs',
    'daily_tasks',
  ]) {
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
  // 端到端：getProfile 必须返回清空后的热力，否则云端残留值会被合并回本地热力图
  const after = await fn('getProfile')()
  assert.deepEqual(after.profile.heatDays || {}, {}, 'getProfile 返回的热力应已清空')
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

  // 清星后新完成的每日任务（携带真实发起时刻）应正常加星，
  // 不能被「清星标记早于当天 0 点」误判为清零前在途而吞掉
  const freshDaily = await fn('addStars')({
    delta: 2,
    reason: 'daily_task',
    clientId: `daily-${Date.now()}-2026-08-20-hanzi`,
  })
  assert.equal(freshDaily.ok, true)
  assert.equal(freshDaily.stale, undefined)
  assert.equal(freshDaily.duplicated, false)
  assert.equal(records('users')[0].stars, 3, '清星后新完成的每日任务奖励应正常发放')
}

/** 多条同 openid 文档（并发「先查后插」残留）：合并字段进首条后再删多余档，不丢星星/贴纸/热力 */
async function testMergeStaleUsers() {
  // login/getProfile：stars 相加、贴纸/徽章并集去重、热力逐日取大、resetAt/updatedAt 取新
  reset()
  db.set('users', [
    {
      _id: 'uA',
      _openid: OPENID,
      stars: 3,
      stickers: ['rabbit'],
      badges: ['b1'],
      heatDays: { '2026-08-01': 1 },
      updatedAt: 1000,
    },
    {
      _id: 'uB',
      _openid: OPENID,
      stars: 2,
      stickers: ['cat', 'rabbit'],
      badges: ['b1'],
      heatDays: { '2026-08-01': 2, '2026-08-02': 1 },
      starsResetAt: 5000,
      updatedAt: 2000,
    },
  ])
  const login = await fn('login')()
  assert.equal(login.profile.stars, 5, '多档 stars 应相加')
  const users = records('users')
  assert.equal(users.length, 1, '合并后应只剩一条')
  const merged = users[0]
  assert.equal(merged._id, 'uA', '应保留首条为唯一档')
  assert.deepEqual(merged.stickers, ['rabbit', 'cat'], '贴纸应并集去重')
  assert.deepEqual(merged.badges, ['b1'], '徽章应并集去重')
  assert.deepEqual(merged.heatDays, { '2026-08-01': 2, '2026-08-02': 1 }, '热力应逐日取大')
  assert.equal(merged.starsResetAt, 5000, 'starsResetAt 应取最新')
  assert.equal(merged.updatedAt, 2000, 'updatedAt 应取最新')

  // addStars：合并后 inc 应落在唯一档上，不丢星
  reset()
  db.set('users', [
    { _id: 'uA', _openid: OPENID, stars: 3, stickers: [], badges: [], heatDays: {}, updatedAt: 1000 },
    { _id: 'uB', _openid: OPENID, stars: 2, stickers: [], badges: [], heatDays: {}, updatedAt: 2000 },
  ])
  const added = await fn('addStars')({ delta: 1, reason: 'math', ref: '1+1', clientId: 'merge-1' })
  assert.equal(added.ok, true)
  assert.equal(added.duplicated, false)
  assert.equal(added.stars, 6, '合并(5)后再 +1 应为 6')
  assert.equal(records('users').length, 1)
  assert.equal(records('users')[0].stars, 6)

  // exchangeReward：双档期先合并再判断，余额/贴纸以合并值为准，不误拒
  reset()
  db.set('users', [
    { _id: 'uA', _openid: OPENID, stars: 3, stickers: [], badges: [], heatDays: {}, updatedAt: 1000 },
    { _id: 'uB', _openid: OPENID, stars: 2, stickers: [], badges: [], heatDays: {}, updatedAt: 2000 },
  ])
  const traded = await fn('exchangeReward')({ rewardId: 'cat' })
  assert.equal(traded.ok, true, '合并后余额 5 ≥ 2 应可兑换')
  assert.equal(traded.stars, 3, '扣 2 后应剩 3')
  assert.deepEqual(records('users')[0].stickers, ['cat'])
  assert.equal(records('users').length, 1)
  assert.equal(records('reward_logs').length, 1)
}

/** 云函数入口 */
async function main() {
  const cases = [
    ['initDb 建集合与 owner 鉴权', testInitDb],
    ['login 与 getProfile 用户档案', testLoginAndProfile],
    ['addStars 参数校验与幂等', testAddStars],
    ['completeProgress 与 checkinTask', testProgressAndTasks],
    ['dailyTasks 生成/幂等/同步/重置', testDailyTasks],
    ['dailyTasks 重置纪元防旧本地回写', testDailyResetEpoch],
    ['bumpHeat 按日只增不减', testBumpHeat],
    ['exchangeReward 校验与扣星', testRewards],
    ['exchangeReward 并发只扣一次', testRewardRace],
    ['resetProfile 分作用域重置', testResetProfile],
    ['多档 users 合并自愈', testMergeStaleUsers],
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
