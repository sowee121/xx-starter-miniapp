# miniprogram-ci 能力说明（本仓库）

官方文档：[miniprogram-ci 概述](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)

`miniprogram-ci` 是从微信开发者工具抽离的编译 / 上传模块，可在**不打开开发者工具 GUI** 的情况下完成上传、预览、云函数等操作。本仓库通过 Node 脚本封装常用能力；鉴权统一使用「小程序代码上传密钥」。

> 日常改 UI、看 Console、联调模拟器：仍优先用微信开发者工具 / Nightly `wechatide`。  
> CI 适合：一键预览码、上传开发版→设体验版、无 GUI 部署云函数、GitHub Actions。

---

## 1. 官方能力一览 × 本仓库状态

| 官方能力 | 对应开发者工具 | 本仓库 | 命令 / 说明 |
| --- | --- | --- | --- |
| 上传代码 | 上传 | **已接入** | `npm run mp:upload` → 公众平台「开发版本」；再手动「选为体验版」 |
| 预览代码 | 预览 | **已接入** | `npm run mp:preview` → `.ci-output/preview-qrcode.jpg` |
| 构建 npm | 工具 → 构建 npm | **暂不需要** | 无 `miniprogram_npm` / 业务侧构建 npm 流程 |
| 上传云函数 | 云开发 → 上传云函数 | **已接入** | `npm run cloud:ci-deploy` / `cloud:ci-init`（与 `cloud:deploy` 工具 CLI 并行） |
| 上传云托管 | 云托管上传 | **不适用** | 本项目无云托管 / CloudRun |
| 上传云存储 | 云开发文件管理 | **已接入** | `npm run assets:ci-upload`（与 `assets:upload` tcb 并行） |
| 静态托管上传 | 静态网站托管 | **不适用** | 本项目无 Web 静态托管站 |
| 代理 | — | **按需** | 公司网 / 代理异常时用 `ci.proxy` 或环境变量 |
| 最近上传 sourceMap | — | **可扩展** | 体验/开发版线上排错时再加脚本 |
| Node 脚本调用 | — | **已采用** | `scripts/ci_*.js` |
| 命令行调用 | — | **未封装** | 可用全局 `miniprogram-ci` CLI；与脚本等价 |

---

## 2. 已接入能力（怎么用）

### 2.1 公共约定

| 项 | 值 |
| --- | --- |
| 依赖 | `devDependencies.miniprogram-ci` |
| 公共封装 | [`scripts/ci_lib.js`](../scripts/ci_lib.js) |
| AppID | `project.config.json` → `wx61ad70ac766e4a04` |
| 项目路径 | 仓库根（含 `project.config.json`，`miniprogramRoot: miniprogram/`） |
| 私钥（勿入库） | `secrets/private.wx61ad70ac766e4a04.key` |
| 云环境 | `miniprogram/config/cloud.js` → `CLOUD_ENV` |

**一次性准备**

1. 公众平台 → **管理 → 开发管理 → 开发设置 → 小程序代码上传** → 下载密钥  
2. 保存到 `secrets/private.wx61ad70ac766e4a04.key`（已在 `.gitignore`）  
3. IP 白名单：可开可关；关则任意出口可上传，密钥保管要更严  
4. `npm install`

### 2.2 上传代码 → 体验版

```bash
npm run test:cloud && npm test   # 推荐
npm run mp:upload                # 默认 version=1.0.0
npm run mp:upload -- 1.0.1 '加星修复'
npm run mp:upload -- --version 1.0.1 --desc '加星修复'
```

脚本：[`scripts/ci_upload.js`](../scripts/ci_upload.js) → `ci.upload`  
优先级：**命令行参数 > 环境变量 `MP_CI_*` > 默认**（`version=1.0.0`，`desc=upload: <本地时间>`）。

上传成功后：

**公众平台 → 管理 → 版本管理 → 开发版本 → 选对应版本 → 选为体验版**

> `miniprogram-ci` **不能**一步写成体验版。

### 2.3 预览代码

```bash
npm run mp:preview
MP_CI_PAGE=pages/home/home npm run mp:preview
```

脚本：[`scripts/ci_preview.js`](../scripts/ci_preview.js) → `ci.preview`  
二维码：`.ci-output/preview-qrcode.jpg`（预览版，不进体验版列表）

### 2.4 上传云函数

```bash
npm run cloud:ci-deploy    # cloudfunctions/ 下全部
npm run cloud:ci-init      # initDb login addStars
node scripts/ci_deploy_cloud_functions.js login getProfile
```

脚本：[`scripts/ci_deploy_cloud_functions.js`](../scripts/ci_deploy_cloud_functions.js) → `ci.cloud.uploadFunction`  
`remoteNpmInstall: true`（云端装依赖，不传本地 `node_modules`）

#### 与 `cloud:deploy` 对照

| 命令 | 实现 | 前置 |
| --- | --- | --- |
| `npm run cloud:deploy` | 微信开发者工具 CLI | 工具打开 + 服务端口 |
| `npm run cloud:ci-deploy` | miniprogram-ci | 上传私钥；可不打开工具 |

云函数部署细节另见 [`cloudfunctions/README.md`](../cloudfunctions/README.md)。

### 2.5 上传云存储

```bash
npm run assets:ci-upload                         # cloud-assets/static + subpkg
node scripts/ci_upload_storage.js static
node scripts/ci_upload_storage.js subpkg
```

脚本：[`scripts/ci_upload_storage.js`](../scripts/ci_upload_storage.js) → `ci.cloud.uploadStorage`  
远端路径约定与 `tcb` 版一致：`static/`、`subpkg/`。

| 命令 | 鉴权 | 何时用 |
| --- | --- | --- |
| `npm run assets:upload` | `tcb login` | 已有腾讯云登录态 |
| `npm run assets:ci-upload` | 小程序上传私钥 | 与 `mp:upload` / `cloud:ci-deploy` 同一链路 |

免费套餐请保持 `USE_CLOUD=false`。详情见 [`cloud-assets/README.md`](../cloud-assets/README.md)。

### 2.6 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `MP_CI_PRIVATE_KEY_PATH` | `secrets/private.<appid>.key` | 私钥路径 |
| `MP_CI_ROBOT` | `1` | CI 机器人 1～30 |
| `MP_CI_VERSION` | `1.0.0` | 仅小程序 `upload` |
| `MP_CI_DESC` | `upload: 2026/8/17 12:30:00`（本地时间） | 预览 / 上传备注；可命令行或环境变量覆盖 |
| `MP_CI_PAGE` | 无 | 预览启动页 |
| `MP_CI_QUERY` | 无 | 预览启动参数 |
| `CLOUD_ENV` | 读自 `cloud.js` | 云函数 CI 上传可覆盖 |

### 2.7 推荐本地流水线

```text
改代码 → npm run test:cloud && npm test
      →（如有函数变更）npm run cloud:ci-deploy
      →（如有媒体变更）npm run assets:ci-upload   # 或 assets:upload
      → npm run mp:upload
      → 公众平台：选为体验版
```

临时真机看一眼：`npm run mp:preview`。

### 2.8 GitHub Actions（可选）

草稿：[`.github/workflows/mp-upload.yml`](../.github/workflows/mp-upload.yml)（`workflow_dispatch`）  
Secret：`MP_CI_PRIVATE_KEY` = 私钥全文。Actions 出口 IP 不固定，白名单场景建议自托管 Runner。

---

## 3. 可扩展能力（尚未封装）

按对本项目的优先级：

### 3.1 高优先级（有真实场景）

| 能力 | API | 建议用法 |
| --- | --- | --- |
| **sourceMap** | `ci.getDevSourceMap` | 体验版 / 开发版报错时，按 `robot` 拉最近上传的 map，解压对照堆栈；可加 `npm run mp:sourcemap` |
| **代理** | `ci.proxy(url)` 或 `HTTPS_PROXY` | CI/公司网出现 `tunneling socket` / `403` 时配置；本机直连一般不用 |

### 3.2 中 / 低优先级

| 能力 | 原因 |
| --- | --- |
| **静态托管上传** | 本项目无 Web 静态托管站 |
| **构建 npm** | 未使用需构建的 npm 组件包 |
| **云托管上传** | 后端是云函数，不是云托管 |
| **命令行全局 CLI** | 已有 npm scripts；需要时再补示例即可 |

### 3.3 扩展时注意

- 密钥权限大，扩展脚本同样走 `ci_lib.createProject()`，勿把私钥写进仓库  
- 云存储 / 云函数上传成功 ≠ 客户端已切到云路径（媒体开关在 `media.js`）  
- `miniprogram-ci` 有时进程不自动退出，脚本末尾宜 `process.exit(code)`  

---

## 4. 场景选型速查

| 场景 | 推荐 |
| --- | --- |
| 改页面、看 Console、模拟器 | 微信开发者工具 |
| 本机工具开着传云函数 | `npm run cloud:deploy` |
| 无 GUI 传云函数 | `npm run cloud:ci-deploy` |
| 出体验包 | `npm run mp:upload` → 公众平台设体验版 |
| 临时真机预览 | `npm run mp:preview` |
| 云存储媒体 | `assets:upload`（tcb）或 `assets:ci-upload`（miniprogram-ci） |
| Agent / Nightly 自动化 | `wechatide`（见 `.cursor/skills/miniprogram-development`） |

---

## 5. 安全

- `secrets/**`、`*.key`、`.ci-output/` 已在 `.gitignore`  
- 私钥丢失只能在公众平台重置  
- 关闭 IP 白名单更方便，但密钥泄露风险更高  

---

## 6. 相关文件

| 路径 | 作用 |
| --- | --- |
| `scripts/ci_lib.js` | Project / 私钥 / 编译设置 |
| `scripts/ci_upload.js` | 上传小程序代码 |
| `scripts/ci_preview.js` | 预览二维码 |
| `scripts/ci_deploy_cloud_functions.js` | CI 上传云函数 |
| `scripts/ci_upload_storage.js` | CI 上传云存储 |
| `scripts/deploy_cloud_functions.js` | 工具 CLI 上传云函数（非 ci） |
| `.github/workflows/mp-upload.yml` | Actions 上传草稿 |
| `cloudfunctions/README.md` | 云函数手动 / 自动化总说明 |
| `cloud-assets/README.md` | 云存储（tcb / CI 双路径） |
