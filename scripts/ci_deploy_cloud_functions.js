#!/usr/bin/env node
/**
 * 用 miniprogram-ci 上传云函数（无需打开开发者工具）。
 * 与 cloud:deploy（微信开发者工具 CLI）并行保留，鉴权走上传私钥。
 *
 * 用法：
 *   npm run cloud:ci-deploy                 # 全部
 *   npm run cloud:ci-init                   # initDb login addStars
 *   node scripts/ci_deploy_cloud_functions.js login getProfile
 */
const fs = require('fs')
const path = require('path')
const { ROOT, ci, projectConfig, createProject } = require('./ci_lib')

const cloudJs = fs.readFileSync(path.join(ROOT, 'miniprogram/config/cloud.js'), 'utf8')
const envMatch = cloudJs.match(/CLOUD_ENV:\s*'([^']+)'/)
const ENV = process.env.CLOUD_ENV || (envMatch && envMatch[1])
const CF_ROOT = path.join(ROOT, projectConfig.cloudfunctionRoot || 'cloudfunctions')

function allFunctionDirs() {
  return fs
    .readdirSync(CF_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(CF_ROOT, d.name, 'index.js')))
    .map((d) => d.name)
}

async function uploadOne(project, name) {
  const fnPath = path.join(CF_ROOT, name)
  if (!fs.existsSync(path.join(fnPath, 'index.js'))) {
    throw new Error(`找不到云函数: ${fnPath}`)
  }
  console.log(`→ 上传 ${name} …`)
  const result = await ci.cloud.uploadFunction({
    project,
    env: ENV,
    name,
    path: fnPath,
    remoteNpmInstall: true,
  })
  console.log(`✓ ${name}`)
  return result
}

async function main() {
  if (!ENV) {
    console.error('缺少 CLOUD_ENV（miniprogram/config/cloud.js 或环境变量）')
    process.exit(1)
  }

  const names = process.argv.slice(2).length ? process.argv.slice(2) : allFunctionDirs()
  if (!names.length) {
    console.error(`未找到云函数目录: ${CF_ROOT}`)
    process.exit(1)
  }

  const project = createProject()
  console.log(`env=${ENV} · 共 ${names.length} 个：${names.join(', ')}`)

  const failed = []
  for (const name of names) {
    try {
      await uploadOne(project, name)
    } catch (error) {
      failed.push({ name, error: error.message || String(error) })
      console.error(`✗ ${name}:`, error.message || error)
    }
  }

  if (failed.length) {
    console.error(`云函数 CI 上传结束：失败 ${failed.length}/${names.length}`)
    process.exit(1)
  }
  console.log(`云函数 CI 上传成功：${names.length}/${names.length}`)
  process.exit(0)
}

main().catch((error) => {
  console.error('云函数 CI 上传失败：', error.message || error)
  process.exit(1)
})
