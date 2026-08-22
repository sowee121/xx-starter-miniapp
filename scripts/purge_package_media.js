#!/usr/bin/env node
/**
 * 将代码包内图片/音频清到 <200KB（代码质量 IMAGE_AND_AUDIO_LIMIT）。
 * 壳层必要小图保留；其余以 cloud-assets/ 为准，需先上传到云存储再用 cloud:// 引用。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MP = path.join(ROOT, 'miniprogram')
const KEEP = new Set([
  'static/shared/play.png',
  'static/shared/check.png',
  'static/icons/home.png',
  'static/home/star.png',
  'static/shared/meadow.png',
  'static/shared/cloud.png',
  'static/shared/grass-tuft.png',
])
const EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.svg', '.png', '.gif',
  '.flac', '.m4a', '.ogg', '.ape', '.amr', '.wma', '.wav', '.mp3', '.mp4',
])

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

let removed = 0
let keptBytes = 0
for (const file of walk(MP)) {
  const ext = path.extname(file).toLowerCase()
  if (!EXTS.has(ext)) continue
  const rel = path.relative(MP, file).split(path.sep).join('/')
  if (KEEP.has(rel)) {
    keptBytes += fs.statSync(file).size
    continue
  }
  fs.unlinkSync(file)
  removed += 1
}

console.log(`已删除 ${removed} 个媒体文件；保留 ${(keptBytes / 1024).toFixed(1)} KB`)
if (keptBytes / 1024 >= 200) {
  console.error('保留体积仍 ≥ 200KB，请继续精简 KEEP 列表')
  process.exit(1)
}
console.log('代码质量「图片和音频资源」现在应按合计 <200KB 通过。')
console.log('请确认云存储已上传 cloud-assets/，且小程序内路径已切到 cloud://')
