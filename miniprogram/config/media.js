/**
 * 媒体地址。
 *
 * 免费云环境无法把云存储改成「所有用户可读」时，必须走本地代码包路径，
 * 否则真机其他账号看不到图。云文件已上传保留；开通可改权限的套餐后，
 * 把 USE_CLOUD 改为 true 即可切回 cloud://，再执行 npm run assets:purge。
 */
const { CLOUD_ENV } = require('./cloud')

/** 从临时链接域名解析出的存储桶 ID（与控制台 FileID 一致） */
const CLOUD_BUCKET = '636c-cloudbase-d7gygre2uc80dcd42-1469407935'

const CLOUD_PREFIX = `cloud://${CLOUD_ENV}.${CLOUD_BUCKET}`

/**
 * 免费套餐改不了存储 ACL → 默认 false（本地）。
 * 付费/可设「所有用户可读」后改为 true，并 purge 代码包媒体。
 */
const USE_CLOUD = false

/** 仍建议留在主包内的壳层图（USE_CLOUD=true 且 purge 后生效） */
const LOCAL_KEEP = new Set([
  '/static/shared/play.png',
  '/static/shared/home-clay.png',
  '/static/shared/star.png',
  '/static/shared/check.png',
  '/static/icons/home.png',
])

function normalizePath(input) {
  if (!input) return ''
  if (/^(cloud:|https?:|wxfile:|data:)/.test(input)) return input
  return input.startsWith('/') ? input : `/${input}`
}

/** 本地路径 → 可用 src */
function mediaUrl(input) {
  const path = normalizePath(input)
  if (!path || /^(cloud:|https?:|wxfile:|data:)/.test(path)) return path
  if (!USE_CLOUD) return path
  if (LOCAL_KEEP.has(path)) return path
  return `${CLOUD_PREFIX}${path}`
}

module.exports = {
  USE_CLOUD,
  CLOUD_ENV,
  CLOUD_BUCKET,
  CLOUD_PREFIX,
  LOCAL_KEEP,
  mediaUrl,
}
