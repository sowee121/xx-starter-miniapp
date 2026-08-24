#!/usr/bin/env node
/**
 * 本地预编译：去注释并压缩 JS，写出到 .ci-output/miniprogram。
 * 真机上传仍走微信编译器（project.config.json 的 minified / minifyJS）。
 */
const fs = require('fs')
const path = require('path')
const { minify } = require('terser')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'miniprogram')
const DEST = path.join(ROOT, '.ci-output', 'miniprogram')

const SKIP_DIR = new Set(['node_modules', 'miniprogram_npm', '.git'])

/** 递归收集源文件 */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIR.has(name) || name.startsWith('.')) continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/** 去掉 wxml 注释 */
function stripWxmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '')
}

/** 去掉 wxss 注释 */
function stripWxssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 压缩一份 JS（去注释 + compress） */
async function minifyJs(code, filePath) {
  const result = await minify(code, {
    compress: {
      drop_console: false,
      drop_debugger: true,
    },
    mangle: false,
    output: { comments: false },
    module: false,
    toplevel: false,
  })
  if (result.error) {
    throw new Error(`${path.relative(SRC, filePath)}: ${result.error.message}`)
  }
  return result.code || ''
}

/** 拷贝并按类型压缩 */
async function main() {
  fs.rmSync(DEST, { recursive: true, force: true })
  fs.mkdirSync(DEST, { recursive: true })

  const files = walk(SRC)
  let jsCount = 0
  let beforeJs = 0
  let afterJs = 0
  let beforeAll = 0
  let afterAll = 0

  for (const file of files) {
    const rel = path.relative(SRC, file)
    const dest = path.join(DEST, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const raw = fs.readFileSync(file)
    beforeAll += raw.length
    const ext = path.extname(file).toLowerCase()

    if (ext === '.js') {
      const text = raw.toString('utf8')
      const min = await minifyJs(text, file)
      fs.writeFileSync(dest, min)
      jsCount += 1
      beforeJs += raw.length
      afterJs += Buffer.byteLength(min)
      afterAll += Buffer.byteLength(min)
      continue
    }
    if (ext === '.wxml') {
      const out = stripWxmlComments(raw.toString('utf8'))
      fs.writeFileSync(dest, out)
      afterAll += Buffer.byteLength(out)
      continue
    }
    if (ext === '.wxss') {
      const out = stripWxssComments(raw.toString('utf8'))
      fs.writeFileSync(dest, out)
      afterAll += Buffer.byteLength(out)
      continue
    }
    if (ext === '.json') {
      const compact = JSON.stringify(JSON.parse(raw.toString('utf8')))
      fs.writeFileSync(dest, compact)
      afterAll += Buffer.byteLength(compact)
      continue
    }
    fs.writeFileSync(dest, raw)
    afterAll += raw.length
  }

  const kb = (n) => `${(n / 1024).toFixed(1)}KB`
  console.log(`写出 ${DEST}`)
  console.log(`JS ${jsCount} 个：${kb(beforeJs)} → ${kb(afterJs)}`)
  console.log(`合计：${kb(beforeAll)} → ${kb(afterAll)}`)
  console.log('上传体验版仍用 npm run mp:upload（微信侧再压一遍 JS/WXML/WXSS）')
}

main().catch((error) => {
  console.error('构建失败：', error.message || error)
  process.exit(1)
})
