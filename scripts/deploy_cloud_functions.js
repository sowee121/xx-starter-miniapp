#!/usr/bin/env node
/**
 * 用微信开发者工具 CLI 部署云函数。
 * 必须显式传 --appid + --paths：只传 --project/--names 时，签名接口会报 41002。
 * 流程说明见 cloudfunctions/README.md「二、自动化流程」。
 *
 * 用法：
 *   node scripts/deploy_cloud_functions.js              # 部署全部
 *   node scripts/deploy_cloud_functions.js initDb login
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'))
const cloudJs = fs.readFileSync(path.join(ROOT, 'miniprogram/config/cloud.js'), 'utf8')
const envMatch = cloudJs.match(/CLOUD_ENV:\s*'([^']+)'/)
const APPID = project.appid
const ENV = envMatch && envMatch[1]
const CF_ROOT = path.join(ROOT, project.cloudfunctionRoot || 'cloudfunctions')

const CLI_CANDIDATES = [
  '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
  process.env.WECHAT_DEVTOOLS_CLI,
].filter(Boolean)

/** 列出云函数目录 */
function allFunctionDirs() {
  return fs
    .readdirSync(CF_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(CF_ROOT, d.name, 'index.js')))
    .map((d) => d.name)
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : allFunctionDirs()
const paths = names.map((name) => path.join(CF_ROOT, name))
for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.error(`找不到云函数目录: ${p}`)
    process.exit(1)
  }
}

const cli = CLI_CANDIDATES.find((p) => fs.existsSync(p))
if (!cli) {
  console.error('找不到微信开发者工具 CLI。请安装并开启：设置 → 安全设置 → 服务端口。')
  process.exit(1)
}
if (!APPID || !ENV) {
  console.error('缺少 appid 或 CLOUD_ENV')
  process.exit(1)
}

const args = [
  'cloud',
  'functions',
  'deploy',
  '--appid',
  APPID,
  '--env',
  ENV,
  '--paths',
  ...paths,
  '--remote-npm-install',
  '--lang',
  'zh',
]

console.log(`${cli} ${args.join(' ')}`)
const result = spawnSync(cli, args, { stdio: 'inherit' })

process.exit(result.status == null ? 1 : result.status)
