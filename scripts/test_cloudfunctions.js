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

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => doc[key] === value)
}

function command(type, value) {
  return { __command: type, value }
}

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
  init() {},
  getWXContext: () => ({ OPENID }),
  database: () => ({
    command: {
      inc: (value) => command('inc', value),
      push: (value) => command('push', value),
    },
    async createCollection(name) {
      if (db.has(name)) throw new Error('collection already exist')
      db.set(name, [])
    },
    collection(name) {
      if (!db.has(name)) db.set(name, [])
      const docs = db.get(name)
      const select = (query) => ({
        limit() {
          return this
        },
        async get() {
          return { data: docs.filter((doc) => matches(doc, query)).map(clone) }
        },
        async update({ data }) {
          for (const doc of docs.filter((item) => matches(item, query))) applyPatch(doc, data)
        },
      })
      return {
        where: select,
        async add({ data }) {
          const doc = { ...clone(data), _id: data._id || `${name}-${docs.length + 1}` }
          if (!Object.hasOwn(doc, '_openid')) doc._openid = OPENID
          if (docs.some((item) => item._id === doc._id)) throw new Error('duplicate key')
          docs.push(doc)
          return { _id: doc._id }
        },
        doc(id) {
          return {
            async update({ data }) {
              const item = docs.find((doc) => doc._id === id)
              assert.ok(item, `${name}/${id} 应存在`)
              applyPatch(item, data)
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

function reset() {
  db.clear()
  for (const file of Object.keys(require.cache)) {
    if (file.startsWith(path.join(ROOT, 'cloudfunctions'))) delete require.cache[file]
  }
}

function fn(name) {
  return require(path.join(ROOT, 'cloudfunctions', name, 'index.js')).main
}

function records(name) {
  return db.get(name) || []
}

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
}

async function testProgressAndTasks() {
  reset()
  const completeProgress = fn('completeProgress')
  assert.deepEqual(await completeProgress({}), { ok: false, error: 'invalid_params' })
  assert.deepEqual(await completeProgress({ module: 'poem', itemId: 'poem-1' }), { ok: true })
  assert.deepEqual(await completeProgress({ module: 'poem', itemId: 'poem-1' }), { ok: true })
  assert.equal(records('progress').length, 1)
  assert.equal(records('progress')[0].done, true)

  const checkinTask = fn('checkinTask')
  assert.deepEqual(await checkinTask({}), { ok: false, error: 'invalid_params' })
  const first = await checkinTask({ taskId: 'math' })
  assert.equal(first.ok, true)
  assert.equal(first.duplicated, false)
  assert.match(first.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.deepEqual(await checkinTask({ taskId: 'math' }), { ok: true, duplicated: true })
  assert.equal(records('task_logs').length, 1)
}

async function testRewards() {
  reset()
  const exchangeReward = fn('exchangeReward')
  assert.deepEqual(await exchangeReward({ rewardId: 'unknown' }), {
    ok: false,
    error: 'invalid_reward',
  })
  assert.deepEqual(await exchangeReward({ rewardId: 'sticker-star' }), {
    ok: false,
    error: 'no_user',
  })

  await fn('login')()
  assert.deepEqual(await exchangeReward({ rewardId: 'sticker-star' }), {
    ok: false,
    error: 'not_enough_stars',
  })
  records('users')[0].stars = 25
  assert.deepEqual(await exchangeReward({ rewardId: 'sticker-star' }), { ok: true, stars: 20 })
  assert.deepEqual(await exchangeReward({ rewardId: 'badge-poem' }), { ok: true, stars: 0 })
  assert.deepEqual(await exchangeReward({ rewardId: 'badge-poem' }), {
    ok: false,
    error: 'not_enough_stars',
  })
  assert.equal(records('reward_logs').length, 2)
}

async function main() {
  const cases = [
    ['initDb 创建全部集合', testInitDb],
    ['login 与 getProfile 用户档案', testLoginAndProfile],
    ['addStars 参数校验与幂等', testAddStars],
    ['completeProgress 与 checkinTask', testProgressAndTasks],
    ['exchangeReward 校验与扣星', testRewards],
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
