#!/usr/bin/env node
/**
 * 上传代码包到微信后台「开发版本」。
 * 上传成功后，到公众平台将对应开发版设为「体验版」。
 *
 * 用法：
 *   npm run mp:upload
 *   npm run mp:upload -- 1.0.1
 *   npm run mp:upload -- 1.0.1 '加星修复'
 *   npm run mp:upload -- --version 1.0.1 --desc '加星修复'
 *   MP_CI_VERSION=1.0.1 MP_CI_DESC='加星修复' npm run mp:upload
 *
 * 优先级：命令行参数 > 环境变量 > 默认（version=1.0.0）
 */
const {
  ci,
  createProject,
  compileSetting,
  robotId,
  defaultVersion,
  defaultDesc,
  onProgressUpdate,
} = require('./ci_lib')

function parseArgs(argv) {
  let version
  let desc
  const positionals = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--version' || arg === '-v') {
      version = argv[++i]
      continue
    }
    if (arg === '--desc' || arg === '-d' || arg === '--message' || arg === '-m') {
      desc = argv[++i]
      continue
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`用法:
  npm run mp:upload
  npm run mp:upload -- <version> [desc]
  npm run mp:upload -- --version <version> --desc <desc>

环境变量: MP_CI_VERSION / MP_CI_DESC / MP_CI_ROBOT / MP_CI_PRIVATE_KEY_PATH`)
      process.exit(0)
    }
    if (arg.startsWith('-')) {
      console.error(`未知参数: ${arg}（用 --help 查看用法）`)
      process.exit(1)
    }
    positionals.push(arg)
  }

  if (positionals[0] && !version) version = positionals[0]
  if (positionals[1] && !desc) desc = positionals.slice(1).join(' ')

  return {
    version: version || defaultVersion(),
    desc: desc || defaultDesc('upload'),
  }
}

async function main() {
  const { version, desc } = parseArgs(process.argv.slice(2))
  if (!version) {
    console.error('版本号不能为空')
    process.exit(1)
  }

  const project = createProject()
  console.log(`上传 version=${version} robot=${robotId()}`)
  console.log(`desc=${desc}`)

  const result = await ci.upload({
    project,
    version,
    desc,
    setting: compileSetting(),
    robot: robotId(),
    onProgressUpdate,
  })

  console.log('上传成功（开发版本）。')
  console.log('下一步：微信公众平台 → 管理 → 版本管理 → 开发版本 → 选该版本 → 选为体验版')
  if (result && typeof result === 'object') {
    console.log(JSON.stringify(result, null, 2))
  }
  process.exit(0)
}

main().catch((error) => {
  console.error('上传失败：', error.message || error)
  process.exit(1)
})
