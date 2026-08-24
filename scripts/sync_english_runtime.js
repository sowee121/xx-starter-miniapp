#!/usr/bin/env node
/**
 * 把英语枢纽包里的运行时文件复制到 8 个分类包。
 * 词库按类裁剪；media / detail-page / 详情 wxml·json 保持同文。
 * 禁止分类包去 require 枢纽包。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const EN = path.join(ROOT, 'miniprogram/subpkg/english')
const CATS = ['fruit', 'animal', 'color', 'body', 'transport', 'number', 'food', 'nature']

/** 复制运行时文件 */
function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

/** 按类写出词库 */
function writeWords(catId) {
  const { categories } = require(path.join(EN, 'content/english-words.js'))
  const cat = categories.find((c) => c.id === catId)
  if (!cat) {
    throw new Error(`英语词库缺少分类 ${catId}`)
  }
  const dest = path.join(ROOT, `miniprogram/subpkg/english-${catId}/content/english-words.js`)
  const body = `module.exports = ${JSON.stringify({ categories: [cat] }, null, 2)}\n`
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, body)
}

/** 云函数入口 */
function main() {
  const copies = [
    ['lib/english-media.js', 'lib/english-media.js'],
    ['lib/english-detail-page.js', 'lib/english-detail-page.js'],
    ['detail/detail.wxml', 'detail/detail.wxml'],
    ['detail/detail.json', 'detail/detail.json'],
  ]
  for (const cat of CATS) {
    const pkg = path.join(ROOT, `miniprogram/subpkg/english-${cat}`)
    for (const [from, to] of copies) {
      copyFile(path.join(EN, from), path.join(pkg, to))
    }
    writeWords(cat)
    console.log(`ok english-${cat}`)
  }
}

main()
