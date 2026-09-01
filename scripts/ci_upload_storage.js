#!/usr/bin/env node
/**
 * 用 miniprogram-ci 上传云存储（无需 tcb login）。
 * 与 assets:upload（tcb）并行保留；媒体开关仍由 media.js USE_CLOUD 控制。
 *
 * 用法：
 *   npm run assets:ci-upload              # static + subpkg
 *   node scripts/ci_upload_storage.js static
 *   node scripts/ci_upload_storage.js subpkg
 */
const fs = require('fs')
const path = require('path')
const { ROOT, ci, createProject, cleanupTempDirs } = require('./ci_lib')

const cloudJs = fs.readFileSync(path.join(ROOT, 'miniprogram/config/cloud.js'), 'utf8')
const envMatch = cloudJs.match(/CLOUD_ENV:\s*'([^']+)'/)
const ENV = process.env.CLOUD_ENV || (envMatch && envMatch[1])
const ASSETS_ROOT = path.join(ROOT, 'cloud-assets')

/** 本地目录名 → 云存储远端前缀（与 assets:upload / media.js 约定一致） */
const DEFAULT_JOBS = [
  { local: 'static', remote: 'static' },
  { local: 'subpkg', remote: 'subpkg' },
]

/** 拆出上传任务 */
function resolveJobs(argv) {
  if (!argv.length) return DEFAULT_JOBS
  return argv.map((name) => {
    const hit = DEFAULT_JOBS.find((j) => j.local === name || j.remote === name)
    if (hit) return hit
    return { local: name, remote: name }
  })
}

/** 上传一个云函数或目录 */
async function uploadOne(project, { local, remote }) {
  const localPath = path.join(ASSETS_ROOT, local)
  if (!fs.existsSync(localPath)) {
    throw new Error(`本地目录不存在: ${localPath}`)
  }
  console.log(`→ 云存储 ${local} → ${remote}/ …`)
  await ci.cloud.uploadStorage({
    project,
    env: ENV,
    path: localPath,
    remotePath: remote,
  })
  console.log(`✓ ${local} → ${remote}/`)
}

/** 云函数入口 */
async function main() {
  if (!ENV) {
    console.error('缺少 CLOUD_ENV（miniprogram/config/cloud.js 或环境变量）')
    process.exit(1)
  }

  const jobs = resolveJobs(process.argv.slice(2))
  const project = createProject()
  console.log(`env=${ENV} · 共 ${jobs.length} 组`)

  const failed = []
  try {
    for (const job of jobs) {
      try {
        await uploadOne(project, job)
      } catch (error) {
        failed.push({ job, error: error.message || String(error) })
        console.error(`✗ ${job.local}:`, error.message || error)
      }
    }
  } finally {
    cleanupTempDirs()
  }

  if (failed.length) {
    console.error(`云存储 CI 上传结束：失败 ${failed.length}/${jobs.length}`)
    process.exit(1)
  }
  console.log(`云存储 CI 上传成功：${jobs.length}/${jobs.length}`)
  console.log('提醒：免费套餐请保持 USE_CLOUD=false，除非已能设「所有用户可读」。')
  process.exit(0)
}

main().catch((error) => {
  console.error('云存储 CI 上传失败：', error.message || error)
  process.exit(1)
})
