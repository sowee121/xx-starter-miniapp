# 嘻嘻启蒙乐园

面向幼儿园宝宝的微信原生亲子互动小程序。

晨间草地主题、黏土软萌与低饱和配色，保护幼儿视觉。古诗点读、识字组词、数物与简易加减、英语字母与单词、单韵母、昼夜日历；每日任务攒星换小动物贴纸，在游玩中完成认知探索。基于**微信原生小程序 + 云函数**；幼儿学习流程只增星、不扣分，无广告/付费；家长区可主动清除数据。

页内名称 **嘻嘻启蒙乐园**；微信后台创建/搜索名 **嘻宝星屋**（见 [`docs/apply/miniprogram-intro.md`](docs/apply/miniprogram-intro.md)）。

题库与视觉定稿：[`docs/design/CONTENT.md`](docs/design/CONTENT.md) · 分期：[`docs/design/PLAN.md`](docs/design/PLAN.md)

---

## 功能矩阵

| 模块 | 说明 |
| --- | --- |
| 古诗 | 6 首；逐句点读 + 全文朗读（全文播完发星） |
| 识字 | 生活常见字 96（八类各 12）；点读与组词 |
| 算术 | 枢纽：数一数 / 算一算（结果 1～10）；答对发星 + 行内反馈音 |
| 英语 | 枢纽：字母表 26 大写点读 + 字母歌 / 单词 96（八类各 12）+ 超短句；字母名或单词播完发星 |
| 拼音 | 仅 `a o e i u ü`；点读按拼音韵母（TTS 用注音 ㄚ/ㄛ/ㄜ/ㄧ/ㄨ/ㄩ） |
| 日历 · 任务 · 贴纸 | 页内打卡；每日随机目标；星星换 24 款动物贴纸 |
| 家长区 | 首页欢迎卡（「宝贝，你好呀」「一起快乐学习吧～」）进入；音量三档 + 长按 3 秒清除每日任务/学习记录/星星/贴纸 |

---

## 文档导航

| 我想… | 去这里 |
| --- | --- |
| 跑起来 / 装依赖 | 本文「快速开始」「命令速查」 |
| 改前端页面、组件、样式 | [`miniprogram/README.md`](miniprogram/README.md) |
| 改云函数、查接口与集合 | [`cloudfunctions/README.md`](cloudfunctions/README.md) |
| 传图片/音频到云存储 | [`cloud-assets/README.md`](cloud-assets/README.md) |
| 用 CI 预览 / 上传 / 部署 | [`docs/ci-miniprogram.md`](docs/ci-miniprogram.md) |
| 查题库、音色、配色定稿 | [`docs/design/CONTENT.md`](docs/design/CONTENT.md) |
| 查分期与待办 | [`docs/design/PLAN.md`](docs/design/PLAN.md) |
| H5 视觉审查稿 | `docs/design/h5/`（只出静态 UI，交互只在小程序做） |
| 小程序申请 / 上架文案 | [`docs/apply/miniprogram-intro.md`](docs/apply/miniprogram-intro.md) |

---

## 快速开始

### 环境要求

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| 微信开发者工具 | 稳定版 | 导入项目、预览、上传；自动化部署需开启**服务端口** |
| Node.js | 18+（当前 24.x） | `scripts/`、静态检查、`miniprogram-ci` |
| Python | 3.9+ | `scripts/*.py` 素材处理、edge-tts 批量出音频 |
| Python 包 | `Pillow`、`numpy`、`edge-tts` | 抠图/归一化、像素处理、点读 TTS |

### 步骤

1. 微信开发者工具导入**本仓库根目录**（不要选 `miniprogram/`）
2. 使用正式 AppID `wx61ad70ac766e4a04`（测试号不可用云开发）
3. 开通云开发 → 环境 ID 写入 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`（当前 `cloudbase-d7gygre2uc80dcd42`）
4. 云函数：按 [`cloudfunctions/README.md`](cloudfunctions/README.md)（**手动**绑环境 + 上传，或 **自动化** `npm run cloud:deploy`）
5. 编译预览（建议清一次缓存）；Console 调 `getProfile` / `initDb` 确认集合

```bash
npm install
npm run test:cloud # 云函数本地单元测试（Mock，不访问云端）
npm test           # 小程序静态检查（先自动同步英语分类包，再验 H5↔小程序 flex+gap、禁止包内 webp）
```

`npm test` 会先把英语枢纽的运行时拷到 8 个分类包（内容没变不写盘）。`mp:preview` / `mp:upload` 会先跑 `npm test`；`cloud:deploy` / `cloud:ci-deploy` / `cloud:init` 会先跑 `test:cloud`。清媒体、压音频、传云存储仍须手跑，避免误改资源或误传。

### 命令速查

| 命令 | 作用 | 前置钩子 |
| --- | --- | --- |
| `npm run format` | Prettier 格式化小程序 / 云函数 / scripts / H5 | — |
| `npm run sync:english` | 单独同步英语分类包运行时 | — |
| `npm run assets:sync-images` | `docs/design/atoms` → 分包图片同步 | Python |
| `npm run assets:optimize-png` | PNG 压缩 | Python |
| `npm run assets:trim-audio` / `audio-16k` | 音频裁剪（首尾静音）/ 降到 16kbps | Python |
| `npm run assets:purge` / `assets:restore` | 切云存储后清代码包媒体 / 还原 | — |
| `npm run assets:upload` / `assets:ci-upload` | 云存储上传（`tcb` / `miniprogram-ci`） | — |
| `npm test` | 小程序静态检查（`scripts/check_miniprogram.js`） | 内嵌英语运行时同步 |
| `npm run test:cloud` | 云函数本地单测（Mock 云开发 SDK，不联网） | — |
| `npm run cloud:deploy [-- 函数名…]` | 开发者工具 CLI 部署云函数 | 先 `test:cloud` |
| `npm run cloud:init` | 只部署 `initDb` / `login` / `addStars` | 先 `test:cloud` |
| `npm run cloud:ci-deploy` / `cloud:ci-init` | `miniprogram-ci` 部署（可不打开工具） | 先 `test:cloud` |
| `npm run mp:preview` / `mp:upload` | CI 预览二维码 / 上传体验版 | 先 `npm test` |

---

## 仓库结构

```
.
├── miniprogram/          # 小程序前端：主包 + 17 个分包
├── cloudfunctions/       # 11 个云函数源码（本地源码，非线上）
├── cloud-assets/         # 云存储上传源：static/（主包）+ subpkg/（分包）
├── docs/
│   ├── design/           # CONTENT / PLAN / h5 审查稿 / atoms 素材 / CSS tokens
│   ├── apply/            # 小程序申请文案
│   └── ci-miniprogram.md # miniprogram-ci 预览 / 上传 / 部署
├── scripts/              # 静态检查、云函数部署、CI 预览/上传、素材处理、英语分包同步
└── .cursor/
    ├── rules/            # 项目业务规范（样式同步、分包媒体、生图、云函数部署…）
    └── skills/           # edge-tts-batch（点读 TTS）+ CloudBase 官方 skills
```

| 路径 | 用途 |
| --- | --- |
| `miniprogram/` | 小程序前端 |
| `cloudfunctions/` | 云函数源码与[手动/自动化部署](cloudfunctions/README.md) |
| `cloud-assets/` | 云存储上传源与[手动/自动化上传](cloud-assets/README.md) |
| `docs/design/` | CONTENT / PLAN / H5 审查稿 / atoms / CSS tokens |
| `docs/` | 需求原文、验收清单、申请文案（`apply/`） |
| `.cursor/rules/` | 项目硬约束（改动前先读：注释、H5 样式同步、分包媒体、生图、云函数部署、git 流程） |
| `.cursor/skills/` | 点读 TTS、小程序/云开发 Agent skills |

### 分包一览

主包只放 `home` / `parent` 两页 + 通用组件与共享资源，业务板块全部拆包（`app.json` 共 17 个分包）：

| 分包 | 页面 | 说明 |
| --- | --- | --- |
| `poem` | `poem/poem`、`detail/detail` | 古诗列表 + 点读详情 |
| `hanzi` | `list/list`、`detail/detail` | 识字列表 + 点读详情 |
| `math` | `hub/hub`、`count/count`、`calc/calc` | 算术枢纽：数一数 / 算一算 |
| `english` | `hub/hub`、`list/list`、`detail/detail` | 英语枢纽（字母表 + 单词） |
| `english-fruit` … `english-nature` | `detail/detail`（各 1 页） | 8 个单词分类包，媒体自带、运行时由 `english` 同步 |
| `english-abc` | `list/list`、`detail/detail` | 字母表 26 大写点读 |
| `pinyin` | `list/list`、`detail/detail` | 6 个单韵母 |
| `calendar` | `index` | 月历热力 + 打卡 |
| `task` | `list` | 每日任务 |
| `shop` | `shop` | 积分商城（24 款贴纸） |

首页预下载 `task` / `shop` / `calendar` / `math`；英语枢纽页预下载 `english-abc`（`preloadRule` 由 `npm test` 校验总量 ≤ 2MB）。

---

## 开发注意（摘要）

细节已拆到子文档，此处只列硬约束：

**图片** — 代码包禁止 webp（真机空白、工具正常）；统一 PNG。素材：`docs/design/atoms/` → `scripts/chroma_to_png.py` / `scripts/normalize_atoms.py`。

**样式** — 视觉基准 `docs/design/h5/`；改布局/色调须与 `miniprogram/**/*.wxss` **同批同步**（规则：`.cursor/rules/h5-miniapp-style-sync.mdc`）。H5 **只出静态 UI**，点读与点击只做小程序（`.cursor/rules/h5-static-review.mdc`）。Token：`docs/design/h5/css/tokens.css` ↔ `miniprogram/styles/tokens.wxss`（1px = 1rpx）；正文字号最小 28px/28rpx。卡面色统一为 `tone-*` 全站主题 token、按颜色命名（家长区/枢纽/贴纸/首页六卡全复用，见 [CONTENT §3](docs/design/CONTENT.md)）。

**点读** — `miniprogram/utils/audio.js`；主点读发星走 `utils/read-award.js`；播放钮主包组件 `components/play-button`。音频文件名必须纯 ASCII slug，`npm test` 会拦。音色与语速：古诗/识字/英语词句为晓晓或 Emma **`-30%`**；拼音韵母为晓辰 **`-10%`**；字母名为 Jenny **`-10%`**（详见 [CONTENT §2.10](docs/design/CONTENT.md)）。**拼音**喂注音「ㄚㄛㄜㄧㄨㄩ」；**字母 Z** 念 `zee`。真机无声时查：`setInnerAudioOption`、家长区音量。TTS 见 [edge-tts skill](.cursor/skills/edge-tts-batch/SKILL.md)。

**反馈** — 任务/兑换用弹层 `praise-sun`；算术对错用行内 feedback-bar + 共享音效；禁止 Toast。

**星星** — `miniprogram/utils/stars.js` 不加乐观计数：以云函数确认的**权威余额**为准，成功单调采纳（只增不减）；清零/扣星（epoch 变化）后迟到的旧加星响应整笔作废，防旧值顶回；失败入本地队列、云通畅自动补账（幂等 `clientId`）。顶栏在「本单学习星」与「任务奖励星」任一确认后都会刷新；任务奖励星在微任务中发起，保证请求顺序 = 业务顺序（先答对加星、后任务达成发奖励）。

### `npm test` 会拦什么

`scripts/check_miniprogram.js` 是提交前唯一门禁，覆盖：

| 类别 | 规则 |
| --- | --- |
| 组件 | wxml 用到的自定义标签必须在 json 的 `usingComponents` 注册，且不得注册未用组件 |
| 资源 | wxml/js 引用的 `/static/...` 图片音频必须存在；wxss 不得 `url()` 本地图片 |
| 布局 | `flex-wrap: wrap` 必须配 `gap`；同一规则内出现 `space-between` 直接拦（非 wrap 行内两端对齐可用，须与 `gap` 并存）；禁止负 margin；纵向间距由容器 `gap` 提供，`.block` 自身不得带 margin；顶层网格（`.word-grid` / `.sticker-grid`）不得加左右 padding |
| 同步 | H5 审查稿 ↔ 小程序共享同一套 flex+gap 网格；首页两列宽度、`--gap-grid` 三列网格同步 |
| 分包 | 禁止跨分包引用本地 png/mp3（含动态拼接）；英语分类包媒体归属正确、运行时与枢纽源文件一致 |
| 规范 | 组件宿主不得用百分比 `calc` 定宽；相对 `require` 可解析；主包无「未使用 JS」、无仅分包使用的内容脚本 |
| 素材 | 代码包内禁止 webp；文件名必须纯 ASCII |
| 体积 | 主包 1.45MB（工具代码质量线）、单包 2MB 硬上限、1.85MB 软告警 |
| 预加载 | `preloadRule` 必配，同一来源包内预下载合计 ≤ 2MB |

---

## 云开发文档入口

| 能力 | 文档 | 手动 | 自动化 |
| --- | --- | --- | --- |
| 云函数 / 集合 | [`cloudfunctions/README.md`](cloudfunctions/README.md) | 右键绑环境 + 上传并部署 | `cloud:deploy`（工具 CLI）或 `cloud:ci-deploy`（miniprogram-ci） |
| 云存储媒体 | [`cloud-assets/README.md`](cloud-assets/README.md) | 控制台上传 | `assets:upload`（tcb）或 `assets:ci-upload`（miniprogram-ci） |
| 云函数测试 | [`cloudfunctions/README.md`](cloudfunctions/README.md) | 不适用 | `npm run test:cloud`（Mock 云开发 SDK） |
| 小程序 CI（miniprogram-ci） | [`docs/ci-miniprogram.md`](docs/ci-miniprogram.md) | 开发者工具上传 / 预览 | 已接：`mp:preview` / `mp:upload` / `cloud:ci-deploy` / `assets:ci-upload` |

默认 `USE_CLOUD = false`（免费套餐常改不了「所有人可读」）。加星失败会本地兜底并入队，**下次云通畅时自动冲刷同步**（幂等 `clientId`）；**涨星 ≠ 当时已写入云**。

云函数（均已部署，与本地对齐）：`login`、`getProfile`、`getProgress`、`addStars`、`checkinTask`、`dailyTasks`、`completeProgress`、`bumpHeat`、`exchangeReward`、`resetProfile`、`initDb`。`addStars` 原因白名单见 [`cloudfunctions/README.md`](cloudfunctions/README.md#云函数-api-参考)；`dailyTasks` 提供 `sync/get/reset`（每日任务云端为准，含家长区重置）。热力格子写入 `users.heatDays`，换机登录后合并。

---

## 当前进度

| 项 | 状态 |
| --- | --- |
| 八大板块业务页 + TTS | 已落地 |
| 首页六宫格（`tone-*` 彩色入口卡） | 已落地 |
| 每日任务（数量每日随机 + 云端同步）+ 日历打卡按钮 | 已落地 |
| 反馈闭环（弹层 / feedback-bar / 音效） | 已落地 |
| 家长区（音量三档 + 四类数据长按 3 秒清除） | 已落地 |
| 云存储切 `cloud://` | 未开（`USE_CLOUD = false`） |
| 云函数 | 已全量部署并与本地对齐；`addStars` 含 `letter_done` |
| 云端为唯一数据源 | 已落地（星星/贴纸/进度/每日任务/热力均为云端权威，本地仅快照 + 失败队列兜底；音量等设备偏好仍本地） |

---

## 排障速查

| 现象 | 优先排查 |
| --- | --- |
| 真机图片空白（工具正常） | webp 混入 / 文件名非 ASCII / 跨分包引用 |
| 真机点读无声 | 家长区音量档位、`setInnerAudioOption`、音频路径存在性（`npm test` 会拦） |
| 涨星后数字回落或不变 | 云端权威余额 + 单调采纳；失败已入本地队列，联网后自动冲刷 |
| 云函数 `FUNCTION_NOT_FOUND` | 未部署或环境绑错；用 `npm run cloud:deploy` 重传 |
| `DATABASE_COLLECTION_NOT_EXIST` | 集合未建 → Console 调 `initDb` |
| 主包体积告警 | `npm run assets:optimize-png`；或把大图迁到云存储后 `assets:purge` |
| 英语分类页改了不生效 | 改 `subpkg/english/lib/*` 与 `detail/detail.{wxml,json}`，`npm test` 会自动同步到 8 个分类包 |
