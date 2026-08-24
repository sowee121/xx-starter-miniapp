#!/usr/bin/env node
/**
 * 小程序静态冒烟测试：拦住「wxml 用了自定义组件但 json 未注册」等低级错误。
 * 用法：node scripts/check_miniprogram.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MP = path.join(ROOT, 'miniprogram')

const NATIVE_TAGS = new Set([
  'view', 'scroll-view', 'swiper', 'swiper-item', 'movable-area', 'movable-view',
  'cover-view', 'cover-image', 'icon', 'text', 'rich-text', 'progress',
  'button', 'checkbox', 'checkbox-group', 'form', 'input', 'label', 'picker',
  'picker-view', 'picker-view-column', 'radio', 'radio-group', 'slider', 'switch',
  'textarea', 'navigator', 'audio', 'camera', 'image', 'video', 'live-player',
  'live-pusher', 'map', 'canvas', 'web-view', 'ad', 'official-account',
  'open-data', 'functional-page-navigator', 'editor', 'match-media', 'page-meta',
  'navigation-bar', 'voip-room', 'ad-custom', 'page-container', 'share-element',
  'keyboard-accessory', 'root-portal', 'channel-live', 'channel-video',
  'snapshot', 'span', 'block', 'template', 'slot', 'import', 'include', 'wxs',
])

const errors = []
const warnings = []

/** 递归收集文件 */
function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => name.endsWith(e))) out.push(full)
  }
  return out
}

/** 读 JSON，失败记错误 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    errors.push(`${rel(file)}: JSON 解析失败 (${err.message})`)
    return null
  }
}

/** 相对仓库根的路径 */
function rel(file) {
  return path.relative(ROOT, file)
}

/** 收集 wxml 自定义标签 */
function collectUsedTags(wxml) {
  const tags = new Set()
  const re = /<\/?([a-z][a-z0-9-]*)\b/gi
  let m
  while ((m = re.exec(wxml))) {
    const tag = m[1].toLowerCase()
    if (!NATIVE_TAGS.has(tag)) tags.add(tag)
  }
  return [...tags]
}

/** 解析组件绝对路径 */
function resolveComponentPath(fromJson, compPath) {
  if (!compPath || typeof compPath !== 'string') return null
  let target = compPath
  if (target.startsWith('/')) {
    target = path.join(MP, target.slice(1))
  } else {
    target = path.resolve(path.dirname(fromJson), target)
  }
  const candidates = [
    target,
    `${target}.js`,
    path.join(target, 'index.js'),
    `${target}.json`,
    path.join(target, 'index.json'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      if (c.endsWith('.json') || c.endsWith('.js')) return path.dirname(c)
      if (fs.existsSync(path.join(c, `${path.basename(c)}.js`)) || fs.existsSync(path.join(c, 'index.js'))) {
        return c
      }
      // directory with component files
      const base = path.basename(c)
      if (fs.existsSync(path.join(c, `${base}.js`)) || fs.existsSync(path.join(c, 'index.js'))) {
        return c
      }
    }
  }
  // /components/foo/foo → file exists as foo.js beside foo.json
  if (fs.existsSync(`${target}.js`) || fs.existsSync(`${target}.wxml`)) {
    return path.dirname(`${target}.js`)
  }
  return null
}

/** 核对页面或组件 json */
function checkPageOrComponent(jsonPath) {
  const base = jsonPath.replace(/\.json$/, '')
  const wxmlPath = `${base}.wxml`
  if (!fs.existsSync(wxmlPath)) return

  const json = readJson(jsonPath)
  if (!json) return

  const registered = json.usingComponents || {}
  const wxml = fs.readFileSync(wxmlPath, 'utf8')
  const used = collectUsedTags(wxml)

  for (const tag of used) {
    if (!registered[tag]) {
      errors.push(
        `${rel(wxmlPath)}: 使用了 <${tag}>，但 ${path.basename(jsonPath)} 的 usingComponents 未注册`
      )
    }
  }

  for (const [tag, compPath] of Object.entries(registered)) {
    const resolved = resolveComponentPath(jsonPath, compPath)
    if (!resolved) {
      errors.push(
        `${rel(jsonPath)}: usingComponents["${tag}"] 路径无效 → ${compPath}`
      )
      continue
    }
    // 未在本页 wxml 使用 → 阻断（避免 json 残留无用组件）
    if (!used.includes(tag) && !wxml.includes(`<${tag}`) && !wxml.includes(`</${tag}`)) {
      errors.push(`${rel(jsonPath)}: 注册了未使用的组件 "${tag}"，请从 usingComponents 移除`)
    }
  }
}

/** 核对静态资源引用 */
function checkStaticRefs() {
  const wxmls = walk(MP, ['.wxml'])
  const re = /(?:src|background)=["'](\/[^"']+\.(?:webp|png|jpg|jpeg|gif|mp3|svg))["']/gi
  for (const file of wxmls) {
    const text = fs.readFileSync(file, 'utf8')
    let m
    while ((m = re.exec(text))) {
      const asset = m[1]
      // skip mustache
      if (asset.includes('{{')) continue
      const full = path.join(MP, asset.replace(/^\//, ''))
      if (!fs.existsSync(full)) {
        errors.push(`${rel(file)}: 引用不存在的资源 ${asset}`)
      }
    }
  }

  // js data 里常见的硬编码路径（mediaUrl(...) 会转成 cloud://，允许文件不在代码包）
  const jss = walk(path.join(MP, 'components'), ['.js']).concat(
    walk(path.join(MP, 'pages'), ['.js'])
  )
  const jsRe = /['"](\/static\/[^'"]+\.(?:webp|png|jpg|jpeg|gif|mp3))['"]/g
  for (const file of jss) {
    const text = fs.readFileSync(file, 'utf8')
    let m
    while ((m = jsRe.exec(text))) {
      const asset = m[1]
      const idx = m.index
      const before = text.slice(Math.max(0, idx - 40), idx)
      if (/mediaUrl\s*\(\s*$/.test(before) || /mediaUrl\s*\(\s*['"`]$/.test(before + text[idx])) {
        // mediaUrl('/static/...') → 云存储，不要求本地存在
        continue
      }
      // require('../../config/media').mediaUrl('/static/...')
      if (/mediaUrl\s*\(\s*$/.test(before)) continue
      const lookback = text.slice(Math.max(0, idx - 80), idx)
      if (lookback.includes('mediaUrl(')) continue
      const full = path.join(MP, asset.replace(/^\//, ''))
      if (!fs.existsSync(full)) {
        errors.push(`${rel(file)}: 引用不存在的资源 ${asset}`)
      }
    }
  }
}

/** 禁止 wxss 本地 url */
function checkWxssNoLocalUrl() {
  const wxsss = walk(MP, ['.wxss'])
  const re = /url\(\s*['"]?(\/[^)'"]+)['"]?\s*\)/g
  for (const file of wxsss) {
    const text = fs.readFileSync(file, 'utf8')
    let m
    while ((m = re.exec(text))) {
      const u = m[1]
      if (u.startsWith('data:') || u.startsWith('https:') || u.startsWith('http:')) continue
      errors.push(
        `${rel(file)}: WXSS 不可引用本地图片 url(${u})，请改用 <image> / base64 / 网络图`
      )
    }
  }
}

/** flex wrap 必须带 gap */
function checkFlexWrapUsesGap() {
  const wxsss = walk(MP, ['.wxss'])
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  for (const file of wxsss) {
    const text = fs.readFileSync(file, 'utf8')
    let match
    while ((match = ruleRe.exec(text))) {
      const selector = match[1].trim().replace(/\s+/g, ' ')
      const body = match[2]
      if (!/flex-wrap\s*:\s*wrap\b/.test(body)) continue
      if (!/\b(?:gap|row-gap|column-gap)\s*:/.test(body)) {
        errors.push(
          `${rel(file)}: ${selector} 使用 flex-wrap: wrap 时必须用 gap 定义均匀间距`
        )
      }
      if (/justify-content\s*:\s*space-between\b/.test(body)) {
        errors.push(
          `${rel(file)}: ${selector} 不要用 space-between 模拟卡片间距，请使用 gap`
        )
      }
    }
  }
}

/** 禁止负 margin 外扩热区，间距交给 flex + gap / 容器尺寸 */
function checkNoNegativeMargin() {
  const files = [
    ...walk(MP, ['.wxss']),
    ...walk(path.join(ROOT, 'docs/design/h5/css'), ['.css']),
  ]
  const re = /\bmargin(?:-(?:top|right|bottom|left))?\s*:\s*[^;{}]*-\d/
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    if (re.test(text)) {
      errors.push(`${rel(file)}: 不得使用负 margin，请用 flex + gap 或容器 padding/尺寸`)
    }
  }
}

/** 纵向间距只能来自容器 gap：积木本身不得带 margin */
function checkStackSpacingUsesGap() {
  const targets = [
    { file: path.join(MP, 'styles/cards.wxss'), selector: '.block' },
    { file: path.join(ROOT, 'docs/design/h5/css/blocks.css'), selector: '.block' },
  ]
  for (const { file, selector } of targets) {
    if (!fs.existsSync(file)) {
      errors.push(`${rel(file)} 缺失，无法校验积木间距约定`)
      continue
    }
    const text = fs.readFileSync(file, 'utf8')
    const rule = text.match(/(^|\n)([^{}]*\.block[^{}]*)\{([^{}]*)\}/)
    if (rule && /\bmargin(-bottom|-top)?\s*:/.test(rule[3])) {
      errors.push(
        `${rel(file)}: ${selector} 不得用 margin 撑纵向间距，请交给容器的 gap`
      )
    }
  }

  const gapOwners = [
    { file: path.join(MP, 'components/app-shell/app-shell.wxss'), selector: '.app-shell__body' },
    { file: path.join(MP, 'pages/home/home.wxss'), selector: '.home-page__shell' },
    { file: path.join(ROOT, 'docs/design/h5/css/shell.css'), selector: '.shell' },
  ]
  for (const { file, selector } of gapOwners) {
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const rule = text.match(
      new RegExp(`\\${selector}\\s*\\{([^{}]*)\\}`)
    )
    if (!rule || !/\b(?:gap|row-gap)\s*:/.test(rule[1])) {
      errors.push(`${rel(file)}: ${selector} 需要用 gap 定义纵向积木间距`)
    }
  }
}

/** 页面横向安全区只由 shell 提供，顶层网格不得再次左右缩进 */
function checkContentUsesFullShellWidth() {
  const targets = [
    { file: path.join(ROOT, 'docs/design/h5/css/pages.css'), selector: '.word-grid' },
    { file: path.join(ROOT, 'docs/design/h5/css/pages.css'), selector: '.sticker-grid' },
    { file: path.join(MP, 'styles/learning.wxss'), selector: '.word-grid' },
    { file: path.join(MP, 'subpkg/shop/shop.wxss'), selector: '.sticker-grid' },
  ]

  for (const { file, selector } of targets) {
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rule = text.match(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`))
    if (!rule) {
      errors.push(`${rel(file)}: 找不到 ${selector}，无法校验横向范围`)
      continue
    }
    const body = rule[1]
    if (/\bpadding(?:-left|-right)?\s*:/.test(body)) {
      errors.push(`${rel(file)}: ${selector} 不得设置左右 padding，横向安全区由 shell 统一提供`)
    }
    if (!/\bgap\s*:\s*(?:30(?:px|rpx)|var\(--gap-grid\))/.test(body)) {
      errors.push(`${rel(file)}: ${selector} 三列卡片应使用 --gap-grid（30px/rpx）`)
    }
  }
}

/** 组件宿主节点没有宽度：百分比宽度必须写在页面里参与排列的节点上 */
function checkComponentRootWidth() {
  const dir = path.join(MP, 'components')
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const wxss = path.join(dir, name, `${name}.wxss`)
    if (!fs.existsSync(wxss)) continue
    const text = fs.readFileSync(wxss, 'utf8')
    const rule = text.match(new RegExp(`\\.${name}\\s*\\{([^{}]*)\\}`))
    if (!rule) continue
    if (/width\s*:\s*calc\([^;]*%/.test(rule[1])) {
      errors.push(
        `${rel(wxss)}: .${name} 不能用百分比 calc 定宽，组件宿主节点无宽度，请把宽度放到页面里参与排列的节点上`
      )
    }
  }
}

/** 首页两列宽度：H5 与小程序必须落在各自参与排列的节点上 */
function checkHomeTwoColumnSync() {
  const pairs = [
    {
      file: path.join(ROOT, 'docs/design/h5/css/home.css'),
      selector: '.module',
      unit: 'px',
    },
    {
      file: path.join(MP, 'pages/home/home.wxss'),
      selector: '.home-modules__cell',
      unit: 'rpx',
    },
  ]
  for (const { file, selector, unit } of pairs) {
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rule = text.match(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`))
    const expected = new RegExp(
      `width\\s*:\\s*(?:var\\(--col-2\\)|calc\\(\\(100% - (?:30${unit}|var\\(--gap-grid\\))\\)\\s*/\\s*2\\))`
    )
    if (!rule || !expected.test(rule[1])) {
      errors.push(
        `${rel(file)}: ${selector} 需要用 var(--col-2) 或 calc((100% - 30${unit}) / 2) 定首页两列宽度`
      )
    }
  }
}

/** 相对路径 require 必须能解析到真实文件（层级写错时模拟器会报 module is not defined） */
function checkRelativeRequires() {
  const reqRe = /require\(['"](\.[^'"]+)['"]\)/g
  for (const file of walk(MP, ['.js'])) {
    const text = fs.readFileSync(file, 'utf8')
    let m
    reqRe.lastIndex = 0
    while ((m = reqRe.exec(text))) {
      const spec = m[1]
      let target = path.resolve(path.dirname(file), spec)
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index.js')
      }
      if (!path.extname(target)) target = `${target}.js`
      if (!fs.existsSync(target)) {
        errors.push(`${rel(file)}: require('${spec}') 找不到文件`)
      }
    }
  }
}

/** 主包不得夹带仅被分包使用的内容脚本 / 未使用 JS */
function checkMainPackageContentOwnership() {
  const stickersMain = path.join(MP, 'content/stickers.js')
  const stickersShop = path.join(MP, 'subpkg/shop/content/stickers.js')
  if (fs.existsSync(stickersMain)) {
    errors.push('content/stickers.js 只能放在 subpkg/shop/content/，主包不得包含仅被积分商城使用的脚本')
  }
  if (!fs.existsSync(stickersShop)) {
    errors.push('subpkg/shop/content/stickers.js 缺失')
  }
  const shop = path.join(MP, 'subpkg/shop/shop.js')
  if (fs.existsSync(shop)) {
    const text = fs.readFileSync(shop, 'utf8')
    if (/require\(['"]\.\.\/\.\.\/\.\.\/content\/stickers['"]\)/.test(text)) {
      errors.push('shop.js 仍引用主包 content/stickers，请改为 ./content/stickers')
    }
  }

  // 主包 JS 必须能从 pages/components/app 到达，否则开发者工具会报「主包未使用的 JS」
  const reqRe = /require\(['"]([^'"]+)['"]\)/g
  const mainJs = new Set()
  walk(MP, ['.js']).forEach((file) => {
    const relPath = path.relative(MP, file).split(path.sep).join('/')
    if (!relPath.startsWith('subpkg/')) mainJs.add(relPath)
  })
  const queue = ['app.js']
  walk(path.join(MP, 'pages'), ['.js']).forEach((f) => queue.push(path.relative(MP, f).split(path.sep).join('/')))
  walk(path.join(MP, 'components'), ['.js']).forEach((f) => queue.push(path.relative(MP, f).split(path.sep).join('/')))
  const visited = new Set()
  while (queue.length) {
    const cur = queue.pop()
    if (visited.has(cur)) continue
    visited.add(cur)
    const abs = path.join(MP, cur)
    if (!fs.existsSync(abs)) continue
    const text = fs.readFileSync(abs, 'utf8')
    let m
    reqRe.lastIndex = 0
    while ((m = reqRe.exec(text))) {
      const spec = m[1]
      if (!spec.startsWith('.')) continue
      let target = path.resolve(path.dirname(abs), spec)
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index.js')
      }
      if (!path.extname(target)) target = `${target}.js`
      if (!fs.existsSync(target)) continue
      const relPath = path.relative(MP, target).split(path.sep).join('/')
      if (relPath.startsWith('subpkg/') || visited.has(relPath)) continue
      queue.push(relPath)
    }
  }
  // 与微信开发者工具一致：仅分包引用的主包 JS 仍算「主包未使用」
  for (const file of [...mainJs].sort()) {
    if (!visited.has(file)) {
      errors.push(`${file}: 主包未使用的 JS，请移入分包或并入主包可达模块（开发者工具代码质量）`)
    }
  }
}

/**
 * 代码包内不得放 webp：本地 webp 在真机（尤其 iOS）不渲染，
 * image 的 webp 属性只对网络资源生效，模拟器却能正常显示，极易漏测。
 */
function checkNoLocalWebp() {
  const found = walk(MP, ['.webp'])
  for (const file of found) {
    errors.push(`${rel(file)}: 代码包内禁止 webp，请转为 png/jpg（真机不渲染本地 webp）`)
  }
  const refs = walk(MP, ['.js', '.wxml', '.wxss']).filter((file) =>
    /\.webp\b/.test(fs.readFileSync(file, 'utf8'))
  )
  for (const file of refs) {
    errors.push(`${rel(file)}: 仍引用 .webp，请改为 .png`)
  }
}

/**
 * 代码包内文件名必须是纯 ASCII。
 * 小程序按字面量查代码包内路径，中文文件名一经百分号编码就 readFile:fail，
 * 而开发者工具有时能放过，只在真机炸；素材一律用 ASCII slug。
 */
function checkAsciiAssetNames() {
  const stack = [MP]
  while (stack.length) {
    const dir = stack.pop()
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const full = path.join(dir, name)
      // eslint-disable-next-line no-control-regex
      if (/[^\x20-\x7e]/.test(name)) {
        errors.push(`${rel(full)}: 代码包内文件名必须是纯 ASCII（真机 readFile 查不到编码后的路径）`)
      }
      if (fs.statSync(full).isDirectory()) stack.push(full)
    }
  }
}

/** 点读音频路径必须真实存在：缺文件只有真机点读才报错，静态挡住 */
function checkAudioRefs() {
  const jss = walk(MP, ['.js'])
  const re = /['"](\/(?:static|subpkg)\/[^'"]+\.(?:mp3|wav))['"]/g
  for (const file of jss) {
    const text = fs.readFileSync(file, 'utf8')
    let m
    re.lastIndex = 0
    while ((m = re.exec(text))) {
      const asset = m[1]
      if (!fs.existsSync(path.join(MP, asset.replace(/^\//, '')))) {
        errors.push(`${rel(file)}: 引用不存在的音频 ${asset}`)
      }
    }
  }
}

/** 文件所属分包 */
function fileSubpackage(file) {
  const posix = rel(file).split(path.sep).join('/')
  const m = posix.match(/^miniprogram\/subpkg\/([^/]+)\//)
  return m ? m[1] : 'main'
}

/**
 * 真机不能跨分包读本地 png/mp3。模拟器能显示，所以必须静态拦住。
 * 分包文件禁止写其它包的 /subpkg/X/static；也禁止 /subpkg/${var}/static 这种跨包拼接。
 */
function checkCrossSubpackageMedia() {
  const files = walk(MP, ['.js', '.wxml', '.wxss'])
  const litRe = /['"`](\/subpkg\/([a-z0-9-]+)\/static\/[^'"`\s]+)['"`]/g
  const dynRe = /\/subpkg\/\$\{[^}]+}\/static\//
  for (const file of files) {
    const pkg = fileSubpackage(file)
    const posix = rel(file).split(path.sep).join('/')
    // 词库/路由助手只存路径数据，实际读文件的是归属分包里的页面
    if (/\/(lib|content)\//.test(posix)) continue
    const text = fs.readFileSync(file, 'utf8')
    if (pkg !== 'main') {
      if (dynRe.test(text)) {
        errors.push(
          `${rel(file)}: 分包内禁止动态拼接其它分包的 static（真机跨包读本地图/音频会失败）`
        )
      }
      litRe.lastIndex = 0
      let m
      while ((m = litRe.exec(text))) {
        if (m[2] !== pkg) {
          errors.push(
            `${rel(file)}: 引用了分包 ${m[2]} 的本地资源 ${m[1]}，当前在 ${pkg}。真机无法跨分包读取。`
          )
        }
      }
      continue
    }
    if (!posix.startsWith('miniprogram/pages/') && !posix.startsWith('miniprogram/components/')) {
      continue
    }
    if (dynRe.test(text)) {
      errors.push(`${rel(file)}: 主包页面/组件禁止动态拼接分包 static`)
    }
    litRe.lastIndex = 0
    let m
    while ((m = litRe.exec(text))) {
      errors.push(
        `${rel(file)}: 主包页面/组件引用了分包本地资源 ${m[1]}。请把图放到主包 /static/ 或改为打开该分包页面。`
      )
    }
  }
}

/** 核对英语媒体归属 */
function checkEnglishMediaOwnership() {
  const wordsPath = path.join(MP, 'subpkg/english/content/english-words.js')
  const mediaPath = path.join(MP, 'subpkg/english/lib/english-media.js')
  if (!fs.existsSync(wordsPath) || !fs.existsSync(mediaPath)) {
    errors.push('英语词库或 english/lib/english-media.js 缺失')
    return
  }
  const { categories } = require(wordsPath)
  const { mediaOwner } = require(mediaPath)
  const detailPages = [
    ['miniprogram/subpkg/english/detail/detail.js', 'english'],
    ['miniprogram/subpkg/english-fruit/detail/detail.js', 'english-fruit'],
    ['miniprogram/subpkg/english-animal/detail/detail.js', 'english-animal'],
    ['miniprogram/subpkg/english-color/detail/detail.js', 'english-color'],
    ['miniprogram/subpkg/english-body/detail/detail.js', 'english-body'],
    ['miniprogram/subpkg/english-transport/detail/detail.js', 'english-transport'],
    ['miniprogram/subpkg/english-number/detail/detail.js', 'english-number'],
    ['miniprogram/subpkg/english-food/detail/detail.js', 'english-food'],
    ['miniprogram/subpkg/english-nature/detail/detail.js', 'english-nature'],
  ]
  for (const [file, pkg] of detailPages) {
    const abs = path.join(ROOT, file)
    if (!fs.existsSync(abs)) {
      errors.push(`${file}: 英语详情页缺失`)
      continue
    }
    const text = fs.readFileSync(abs, 'utf8')
    if (!text.includes(`createEnglishDetailPage('${pkg}')`)) {
      errors.push(
        `${file}: 必须调用 createEnglishDetailPage('${pkg}')，避免详情页加载其它分包的图/音频`
      )
    }
  }
  if (!Array.isArray(categories)) {
    errors.push('english-words.js 缺少 categories')
    return
  }
  for (const cat of categories) {
    const owner = mediaOwner(cat.id)
    for (const item of cat.items || []) {
      const img = path.join(MP, 'subpkg', owner, 'static', `${item.image}.png`)
      if (!fs.existsSync(img)) {
        errors.push(
          `英语词图缺失: subpkg/${owner}/static/${item.image}.png（${cat.id}/${item.word}）`
        )
      }
      const thumb = path.join(MP, 'subpkg/english/static/list', `${item.image}.png`)
      if (!fs.existsSync(thumb)) {
        errors.push(
          `英语列表缩略图缺失: subpkg/english/static/list/${item.image}.png（列表必须用本包 128px 小图）`
        )
      }
      for (const key of ['audio', 'sentenceAudio']) {
        const src = item[key]
        if (!src) continue
        const m = String(src).match(/^\/subpkg\/([^/]+)\/static\//)
        if (m && m[1] !== owner) {
          errors.push(
            `英语音频分包不一致: ${cat.id}/${item.word} ${key} 在 ${m[1]}，应在 ${owner}`
          )
        }
      }
    }
  }
}

const ENGLISH_CATS = ['fruit', 'animal', 'color', 'body', 'transport', 'number', 'food', 'nature']

/** 分类包词库只含本类；运行时 JS/WXML 必须与枢纽源文件一致 */
function checkEnglishRuntimeCopies() {
  const src = {
    media: path.join(MP, 'subpkg/english/lib/english-media.js'),
    page: path.join(MP, 'subpkg/english/lib/english-detail-page.js'),
    wxml: path.join(MP, 'subpkg/english/detail/detail.wxml'),
    json: path.join(MP, 'subpkg/english/detail/detail.json'),
  }
  for (const [key, file] of Object.entries(src)) {
    if (!fs.existsSync(file)) {
      errors.push(`英语源文件缺失: ${path.relative(ROOT, file)}`)
      return
    }
  }
  const srcText = {
    media: fs.readFileSync(src.media, 'utf8'),
    page: fs.readFileSync(src.page, 'utf8'),
    wxml: fs.readFileSync(src.wxml, 'utf8'),
    json: fs.readFileSync(src.json, 'utf8'),
  }
  for (const cat of ENGLISH_CATS) {
    const pkg = path.join(MP, `subpkg/english-${cat}`)
    const pairs = [
      ['media', path.join(pkg, 'lib/english-media.js')],
      ['page', path.join(pkg, 'lib/english-detail-page.js')],
      ['wxml', path.join(pkg, 'detail/detail.wxml')],
      ['json', path.join(pkg, 'detail/detail.json')],
    ]
    for (const [key, file] of pairs) {
      if (!fs.existsSync(file)) {
        errors.push(`english-${cat}: 缺少 ${path.relative(pkg, file)}，请跑 node scripts/sync_english_runtime.js`)
        continue
      }
      if (fs.readFileSync(file, 'utf8') !== srcText[key]) {
        errors.push(
          `english-${cat}: ${path.basename(file)} 与 english 源文件不一致，请跑 node scripts/sync_english_runtime.js`
        )
      }
    }
    const wordsFile = path.join(pkg, 'content/english-words.js')
    if (!fs.existsSync(wordsFile)) {
      errors.push(`english-${cat}: 缺少 content/english-words.js`)
      continue
    }
    const { categories } = require(wordsFile)
    if (!Array.isArray(categories) || categories.length !== 1 || categories[0].id !== cat) {
      errors.push(`english-${cat}: 词库只能包含 ${cat} 一类，请跑 node scripts/sync_english_runtime.js`)
    }
  }
}

/** H5 审查稿必须与小程序共享同一套 flex+gap 网格约定 */
function checkH5FlexGapSync() {
  const h5CssDir = path.join(ROOT, 'docs/design/h5/css')
  if (!fs.existsSync(h5CssDir)) {
    errors.push('docs/design/h5/css 缺失，无法校验 H5↔小程序样式同步')
    return
  }
  const cssFiles = walk(h5CssDir, ['.css'])
  const joined = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
  const required = [
    { name: '.word-grid', re: /\.word-grid\s*\{[^}]*\bgap\s*:/s },
    { name: '.sticker-grid', re: /\.sticker-grid\s*\{[^}]*\bgap\s*:/s },
    { name: '.duo', re: /\.duo\s*\{[^}]*\bgap\s*:/s },
    { name: '.options', re: /\.options\s*\{[^}]*\bgap\s*:/s },
    { name: '.detail-pair', re: /\.detail-pair\s*\{[^}]*\bgap\s*:/s },
    { name: '.modules', re: /\.modules\s*\{[^}]*\bgap\s*:/s },
    { name: '.count-stage', re: /\.count-stage\s*\{[^}]*(?:gap|row-gap|column-gap)\s*:/s },
  ]
  for (const item of required) {
    if (!item.re.test(joined)) {
      errors.push(
        `H5 未同步 flex+gap：${item.name} 缺少 gap（请同步 docs/design/h5/css 与 miniprogram 样式）`
      )
    }
  }
  if (/不用\s*grid\s*\/\s*gap|避\s*gap|不用 gap/.test(joined)) {
    errors.push('H5 CSS 仍残留「不用 gap」旧约束注释，请删除并改为 flex + gap')
  }
}

/** 微信单包上限 2MB；预留下余量，避免临近上限时素材一加就炸 */
const PACKAGE_SOFT_LIMIT = 1.85 * 1024 * 1024
const PACKAGE_HARD_LIMIT = 2 * 1024 * 1024
/** 开发者工具代码质量：主包应小于 1.5MB */
const MAIN_QUALITY_LIMIT = 1.45 * 1024 * 1024

/** 目录体积 */
function dirBytes(dir) {
  let total = 0
  if (!fs.existsSync(dir)) return 0
  /** 遍历目录累加体积 */
  function walkAll(d) {
    for (const name of fs.readdirSync(d)) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const full = path.join(d, name)
      const st = fs.statSync(full)
      if (st.isDirectory()) walkAll(full)
      else total += st.size
    }
  }
  walkAll(dir)
  return total
}

/** 主包体积 */
function mainPackageBytes() {
  let total = 0
  for (const name of fs.readdirSync(MP)) {
    if (name === 'subpkg' || name.startsWith('.')) continue
    const full = path.join(MP, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) total += dirBytes(full)
    else total += st.size
  }
  return total
}

/** 核对分包体积预算 */
function checkPackageSizeBudgets() {
  const app = readJson(path.join(MP, 'app.json'))
  if (!app || !Array.isArray(app.subPackages)) {
    errors.push('app.json 缺少 subPackages')
    return
  }
  const packages = [
    { name: 'main', bytes: mainPackageBytes() },
    ...app.subPackages.map((pkg) => ({
      name: pkg.name || pkg.root,
      bytes: dirBytes(path.join(MP, pkg.root)),
    })),
  ]
  for (const pkg of packages) {
    const mb = (pkg.bytes / 1024 / 1024).toFixed(2)
    if (pkg.name === 'main' && pkg.bytes > MAIN_QUALITY_LIMIT) {
      errors.push(
        `${pkg.name}: 体积 ${mb}MB 超过开发者工具代码质量 1.5MB 上限（主包图需再缩小或外置）`
      )
    } else if (pkg.bytes > PACKAGE_HARD_LIMIT) {
      errors.push(`${pkg.name}: 体积 ${mb}MB 超过微信 2MB 硬上限`)
    } else if (pkg.bytes > PACKAGE_SOFT_LIMIT) {
      warnings.push(`${pkg.name}: 体积 ${mb}MB 超过 1.85MB 软上限，请继续压缩或再拆包`)
    }
  }
  if (fs.existsSync(path.join(MP, 'subpkg/common'))) {
    errors.push('subpkg/common 已废弃：praise-sun / media-card 应在主包 components/')
  }
}

/** 云函数入口 */
function main() {
  const jsons = walk(MP, ['.json']).filter((f) => {
    const name = path.basename(f)
    return !['app.json', 'sitemap.json', 'project.config.json', 'project.private.config.json'].includes(name)
      && !name.endsWith('.config.json')
  })

  for (const jsonPath of jsons) {
    const raw = fs.readFileSync(jsonPath, 'utf8')
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    // 页面或组件：有 wxml 配对
    if (fs.existsSync(jsonPath.replace(/\.json$/, '.wxml'))) {
      checkPageOrComponent(jsonPath)
    } else if (parsed.component || parsed.usingComponents) {
      // 无 wxml 的纯配置略过
    }
  }

  checkStaticRefs()
  checkWxssNoLocalUrl()
  checkFlexWrapUsesGap()
  checkNoNegativeMargin()
  checkStackSpacingUsesGap()
  checkContentUsesFullShellWidth()
  checkComponentRootWidth()
  checkHomeTwoColumnSync()
  checkRelativeRequires()
  checkMainPackageContentOwnership()
  checkNoLocalWebp()
  checkAsciiAssetNames()
  checkAudioRefs()
  checkCrossSubpackageMedia()
  checkEnglishMediaOwnership()
  checkEnglishRuntimeCopies()
  checkH5FlexGapSync()
  checkPackageSizeBudgets()

  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} 警告：`)
    warnings.forEach((w) => console.log(`  - ${w}`))
  }

  if (errors.length) {
    console.error(`\n✖ ${errors.length} 失败：`)
    errors.forEach((e) => console.error(`  - ${e}`))
    console.error('\n小程序静态检查未通过。')
    process.exit(1)
  }

  console.log(`\n✔ 小程序静态检查通过（扫描 ${jsons.length} 个 json，无阻断错误）`)
}

main()
