#!/usr/bin/env node
/**
 * 云数据库脏数据清理（开发期运维工具，会读写真实库）。
 * 默认只审计（报告脏数据数量，不写库）；加 --apply 才执行清理。
 *
 * 清理三类脏数据：
 * 1. 空壳文档：users / progress / task_logs 中缺 _openid 的记录
 *    （历史版本云函数 add 漏写 _openid 产生，按 _openid 查询永远匹配不到，纯垃圾）
 * 2. heatDays 残留：旧版 resetProfile 用「空对象直接赋值」被云端忽略，
 *    真实用户热力清不掉 → 这里用 $set 强制置空（等价 _.set({})）
 * 3. 重复 _openid：并发「先查后插」竞态产生的同 openid 多文档，
 *    保留第一条、删除其余（新版 getOrCreateUser 已自愈，此步骤用于清存量）
 *
 * 用法：
 *   node scripts/purge_dirty_data.js          # 只审计
 *   node scripts/purge_dirty_data.js --apply  # 执行清理
 *
 * 依赖：本机已登录 tcb CLI（npx tcb db nosql execute），环境见 miniprogram/config/cloud.js。
 */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const cloudJs = fs.readFileSync(path.join(ROOT, 'miniprogram/config/cloud.js'), 'utf8')
const ENV = (cloudJs.match(/CLOUD_ENV:\s*'([^']+)'/) || [])[1]
if (!ENV) {
  console.error('读不到 CLOUD_ENV，请先检查 miniprogram/config/cloud.js')
  process.exit(1)
}
const APPLY = process.argv.includes('--apply')

/** 执行单条 nosql 命令，返回解析后的 data */
function nosql(table, type, command) {
  const payload = JSON.stringify([
    { TableName: table, CommandType: type, Command: JSON.stringify(command) },
  ])
  const result = spawnSync(
    'npx',
    ['tcb', 'db', 'nosql', 'execute', '-e', ENV, '--json', '--command', payload],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1' } },
  )
  if (result.status !== 0) {
    console.error(`命令失败(${type} ${table}):`, (result.stderr || result.stdout || '').trim())
    process.exit(1)
  }
  const text = (result.stdout || '').trim()
  const start = text.indexOf('{')
  return JSON.parse(text.slice(start)).data
}

/** 审计集合空壳（缺 _openid）数量 */
function auditEmpty() {
  const out = {}
  for (const name of ['users', 'progress', 'task_logs', 'star_logs', 'reward_logs']) {
    const data = nosql(name, 'AGGREGATE', {
      aggregate: name,
      pipeline: [{ $match: { _openid: { $exists: false } } }, { $count: 'n' }],
      cursor: {},
    })
    const n = data.results && data.results[0] && data.results[0][0] && data.results[0][0].n
    out[name] = Number((n && (n.$numberInt || n.$numberLong)) || 0)
  }
  return out
}

/** 审计 users 重复 _openid（同 openid 多于 1 条的） */
function auditDuplicates() {
  const data = nosql('users', 'AGGREGATE', {
    aggregate: 'users',
    pipeline: [{ $group: { _id: '$_openid', cnt: { $sum: 1 } } }, { $match: { cnt: { $gt: 1 } } }],
    cursor: {},
  })
  const rows = (data.results && data.results[0]) || []
  return rows.map((row) => ({
    openid: row._id || '(null/空壳)',
    count: Number((row.cnt && (row.cnt.$numberInt || row.cnt.$numberLong)) || 0),
  }))
}

/** 审计真实用户 heatDays 残留（有 _openid 且 heatDays 非空） */
function auditHeatDays() {
  const data = nosql('users', 'AGGREGATE', {
    aggregate: 'users',
    pipeline: [
      { $match: { _openid: { $exists: true }, heatDays: { $exists: true, $ne: {} } } },
      { $count: 'n' },
    ],
    cursor: {},
  })
  const n = data.results && data.results[0] && data.results[0][0] && data.results[0][0].n
  return Number((n && (n.$numberInt || n.$numberLong)) || 0)
}

async function main() {
  console.log(`环境：${ENV}${APPLY ? '（--apply，将写库）' : '（审计模式，加 --apply 执行清理）'}`)

  console.log('\n[1] 空壳文档（缺 _openid）：')
  const empty = auditEmpty()
  for (const [name, count] of Object.entries(empty)) console.log(`    ${name}: ${count}`)

  console.log('\n[2] users 重复 _openid：')
  const duplicates = auditDuplicates()
  if (!duplicates.length) console.log('    无')
  for (const item of duplicates) console.log(`    ${item.openid} ×${item.count}`)

  console.log('\n[3] 真实用户 heatDays 残留（非空）：')
  const heat = auditHeatDays()
  console.log(`    ${heat} 条`)

  if (!APPLY) {
    console.log('\n未执行写库。确认无误后加 --apply 执行。')
    return
  }

  console.log('\n--- 执行清理 ---')
  for (const [name, count] of Object.entries(empty)) {
    if (count > 0) {
      nosql(name, 'DELETE', {
        delete: name,
        deletes: [{ q: { _openid: { $exists: false } }, limit: 0 }],
      })
      console.log(`删除 ${name} 空壳：${count} 条`)
    }
  }
  if (heat > 0) {
    nosql('users', 'UPDATE', {
      update: 'users',
      updates: [{ q: { _openid: { $exists: true } }, u: { $set: { heatDays: {} } } }],
    })
    console.log(`清空真实用户 heatDays 残留：${heat} 条`)
  }
  let removed = 0
  for (const item of duplicates) {
    if (item.openid === '(null/空壳)') continue
    const data = nosql('users', 'QUERY', {
      find: 'users',
      filter: { _openid: item.openid },
      limit: 100,
    })
    const docs = (data.results && data.results[0]) || []
    const staleIds = docs.slice(1).map((doc) => doc._id)
    if (staleIds.length) {
      nosql('users', 'DELETE', {
        delete: 'users',
        deletes: [{ q: { _id: { $in: staleIds } }, limit: 0 }],
      })
      removed += staleIds.length
    }
  }
  if (removed > 0) console.log(`收敛重复 _openid：删除 ${removed} 条多余文档`)
  console.log('\n清理完成。')
}

main().catch((error) => {
  console.error(error.stack || error)
  process.exit(1)
})
