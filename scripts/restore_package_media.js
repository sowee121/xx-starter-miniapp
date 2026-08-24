#!/usr/bin/env node
/** 从 cloud-assets/ 拷回 miniprogram/，便于本地预览（此时代码质量媒体项会再次失败）。 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'cloud-assets')
const DST = path.join(ROOT, 'miniprogram')

if (!fs.existsSync(SRC)) {
  console.error('缺少 cloud-assets/，无法恢复')
  process.exit(1)
}

/** 递归收集文件 */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

let n = 0
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file)
  const dest = path.join(DST, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(file, dest)
  n += 1
}
console.log(`已从 cloud-assets 恢复 ${n} 个文件到 miniprogram/`)
