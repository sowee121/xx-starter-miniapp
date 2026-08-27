#!/usr/bin/env node
/**
 * 把英语枢纽包里的运行时文件复制到 8 个分类包。
 * 词库按类裁剪；media / detail-page / 详情 wxml·json 保持同文。
 * 禁止分类包去 require 枢纽包。
 *
 * 内容没变则不写盘。npm test 会静默调用；改枢纽后不必再手跑本脚本。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const EN = path.join(ROOT, 'miniprogram/subpkg/english')
const CATS = ['fruit', 'animal', 'color', 'body', 'transport', 'number', 'food', 'nature']

const COPIES = [
  ['lib/english-media.js', 'lib/english-media.js'],
  ['lib/english-detail-page.js', 'lib/english-detail-page.js'],
  ['detail/detail.wxml', 'detail/detail.wxml'],
  ['detail/detail.json', 'detail/detail.json'],
]

/** 仅在内容不同时写入 */
function writeIfChanged(dest, body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body)
  if (fs.existsSync(dest) && fs.readFileSync(dest).equals(buf)) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  return true
}

/** 按类写出词库 */
function writeWords(catId) {
  const wordsPath = path.join(EN, 'content/english-words.js')
  delete require.cache[require.resolve(wordsPath)]
  const { categories } = require(wordsPath)
  const cat = categories.find((c) => c.id === catId)
  if (!cat) {
    throw new Error(`英语词库缺少分类 ${catId}`)
  }
  const dest = path.join(ROOT, `miniprogram/subpkg/english-${catId}/content/english-words.js`)
  const body = `module.exports = ${JSON.stringify({ categories: [cat] }, null, 2)}\n`
  return writeIfChanged(dest, body)
}

/**
 * 同步 8 个分类包。返回写入次数。
 * @param {{ silent?: boolean }} [opts]
 */
function syncEnglishRuntime(opts = {}) {
  const silent = !!opts.silent
  let changed = 0
  for (const cat of CATS) {
    const pkg = path.join(ROOT, `miniprogram/subpkg/english-${cat}`)
    for (const [from, to] of COPIES) {
      if (writeIfChanged(path.join(pkg, to), fs.readFileSync(path.join(EN, from)))) {
        changed += 1
      }
    }
    if (writeWords(cat)) changed += 1
    if (!silent) console.log(`ok english-${cat}`)
  }
  if (silent && changed) {
    console.log(`英语分类包已自动同步（${changed} 处）`)
  }
  return changed
}

if (require.main === module) {
  syncEnglishRuntime()
}

module.exports = { CATS, syncEnglishRuntime }
