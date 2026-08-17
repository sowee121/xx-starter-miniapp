#!/usr/bin/env node
/**
 * 真机预览：生成二维码（预览版，不是体验版）。
 * 用法：
 *   npm run mp:preview
 *   MP_CI_PAGE=pages/home/home npm run mp:preview
 */
const fs = require('fs')
const path = require('path')
const {
  ci,
  ROOT,
  createProject,
  compileSetting,
  robotId,
  defaultDesc,
  onProgressUpdate,
} = require('./ci_lib')

async function main() {
  const outDir = path.join(ROOT, '.ci-output')
  fs.mkdirSync(outDir, { recursive: true })
  const qrcodeOutputDest = path.join(outDir, 'preview-qrcode.jpg')

  const project = createProject()
  console.log(`robot=${robotId()} → 预览二维码: ${qrcodeOutputDest}`)

  const result = await ci.preview({
    project,
    desc: defaultDesc('preview'),
    setting: compileSetting(),
    robot: robotId(),
    qrcodeFormat: 'image',
    qrcodeOutputDest,
    pagePath: process.env.MP_CI_PAGE || undefined,
    searchQuery: process.env.MP_CI_QUERY || undefined,
    onProgressUpdate,
  })

  console.log('预览完成。用微信扫码打开预览版。')
  if (result && typeof result === 'object') {
    console.log(JSON.stringify(result, null, 2))
  }
}

main().catch((error) => {
  console.error('预览失败：', error.message || error)
  process.exit(1)
})
