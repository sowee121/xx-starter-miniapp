#!/usr/bin/env node
/**
 * 启动 H5 设计稿本地静态预览服务（零依赖，使用 Node 内置 http）。
 * 以 docs/design/h5 为根目录提供静态文件服务，浏览器可正常解析相对路径的
 * css/、js/ 及各板块子目录。
 *
 * 用法:
 *   node scripts/serve_h5.js             # 默认 http://127.0.0.1:8080
 *   node scripts/serve_h5.js --port 9000 # 自定义端口
 *   node scripts/serve_h5.js --host 0.0.0.0 # 允许局域网访问
 * npm: npm run h5:serve -- --port 9000
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', 'docs', 'design', 'h5')

// 别名目录：H5 通过 ../../atoms/* 引用 docs/design/atoms 下的素材
const ALIASES = {
  '/atoms': path.resolve(__dirname, '..', 'docs', 'design', 'atoms'),
}

function sendFile(filePath, res, label) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 Not Found: ' + (label || filePath))
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(data)
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function parseArgs(argv) {
  const args = { host: '127.0.0.1', port: 8080 }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--host') args.host = argv[++i]
    else if (argv[i] === '--port') args.port = parseInt(argv[++i], 10) || 8080
  }
  return args
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0])

  // 根路径默认 302 跳转到 index.html
  if (urlPath === '/') {
    res.writeHead(302, { Location: '/index.html' })
    res.end()
    return
  }

  // 别名目录：/atoms/* -> docs/design/atoms/*
  for (const [prefix, realBase] of Object.entries(ALIASES)) {
    if (urlPath === prefix || urlPath.startsWith(prefix + '/')) {
      const rest = urlPath.slice(prefix.length)
      const filePath = path.normalize(path.join(realBase, rest))
      if (!filePath.startsWith(realBase)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Forbidden')
        return
      }
      sendFile(filePath, res, urlPath)
      return
    }
  }

  if (urlPath.endsWith('/')) urlPath += 'index.html'

  const filePath = path.normalize(path.join(ROOT, urlPath))
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }
  sendFile(filePath, res, urlPath)
})

const { host, port } = parseArgs(process.argv)
server.listen(port, host, () => {
  console.log(`H5 设计稿预览服务已启动: http://${host}:${port}/`)
  console.log(`根目录: ${ROOT}`)
  console.log('按 Ctrl+C 停止。')
})
