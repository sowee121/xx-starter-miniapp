#!/usr/bin/env node
/**
 * miniprogram-ci 公共配置。
 * 私钥与 IP 白名单说明见 docs/ci-miniprogram.md
 */
const fs = require('fs')
const path = require('path')
const ci = require('miniprogram-ci')

const ROOT = path.join(__dirname, '..')
const projectConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8')
)

/** 解析上传私钥路径 */
function resolveKeyPath() {
  if (process.env.MP_CI_PRIVATE_KEY_PATH) {
    return path.resolve(process.env.MP_CI_PRIVATE_KEY_PATH)
  }
  const appid = projectConfig.appid
  const candidates = [
    path.join(ROOT, 'secrets', `private.${appid}.key`),
    path.join(ROOT, 'secrets', 'private.key'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || candidates[0]
}

/** 创建 ci 项目实例 */
function createProject() {
  const privateKeyPath = resolveKeyPath()
  if (!fs.existsSync(privateKeyPath)) {
    console.error(
      [
        '找不到代码上传私钥。',
        '1. 微信公众平台 → 管理 → 开发管理 → 开发设置 → 小程序代码上传',
        '2. 下载密钥，保存为 secrets/private.' + projectConfig.appid + '.key',
        '3. 配置 IP 白名单（本机公网 IP）',
        '详见 docs/ci-miniprogram.md',
      ].join('\n')
    )
    process.exit(1)
  }

  return new ci.Project({
    appid: projectConfig.appid,
    type: 'miniProgram',
    projectPath: ROOT,
    privateKeyPath,
    ignores: [
      'node_modules/**/*',
      'miniprogram/node_modules/**/*',
      '.cursor/**/*',
      '.git/**/*',
      'docs/**/*',
      'cloud-assets/**/*',
      'secrets/**/*',
      'scripts/**/*',
      '**/*.md',
      '**/.DS_Store',
    ],
  })
}

/** 编译选项 */
function compileSetting() {
  const s = projectConfig.setting || {}
  return {
    es6: s.es6 !== false,
    es7: true,
    minify: true,
    minifyJS: true,
    minifyWXML: s.minifyWXML !== false,
    minifyWXSS: s.minifyWXSS !== false,
    autoPrefixWXSS: s.postcss !== false,
    codeProtect: false,
  }
}

/** ci 机器人编号 */
function robotId() {
  const n = Number(process.env.MP_CI_ROBOT || 1)
  if (!Number.isInteger(n) || n < 1 || n > 30) {
    console.error('MP_CI_ROBOT 须为 1～30')
    process.exit(1)
  }
  return n
}

/** 默认版本号 */
function defaultVersion() {
  if (process.env.MP_CI_VERSION) return process.env.MP_CI_VERSION
  // 体验阶段固定 1.0.0；正式发版前再改为语义化递增或时间戳
  return '1.0.0'
}

/** 默认版本说明 */
function defaultDesc(action) {
  if (process.env.MP_CI_DESC) return process.env.MP_CI_DESC
  const time = new Date().toLocaleString('zh-CN', { hour12: false })
  // 例：upload: 2026/8/17 12:30:00
  return `${action}: ${time}`
}

/** 打印上传进度 */
function onProgressUpdate(task) {
  const msg = typeof task === 'string' ? task : task && task.message
  if (msg) console.log(msg)
}

module.exports = {
  ROOT,
  ci,
  projectConfig,
  createProject,
  compileSetting,
  robotId,
  defaultVersion,
  defaultDesc,
  onProgressUpdate,
}
