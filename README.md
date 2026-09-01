# 嘻嘻启蒙乐园

面向幼儿园宝宝的微信原生亲子互动小程序。

晨间草地主题、黏土软萌与低饱和配色，保护幼儿视觉。古诗点读、识字组词、数物与简易加减、英语字母与单词、单韵母、昼夜日历；每日任务攒星换小动物贴纸，在游玩中完成认知探索。基于**微信原生小程序 + 云函数**；幼儿学习流程只增星、不扣分，无广告/付费；家长区可主动清除数据。

| 模块 | 说明 |
| --- | --- |
| 古诗 | 6 首；逐句点读 + 全文朗读（全文播完发星） |
| 识字 | 生活常见字 96（八类各 12）；点读与组词 |
| 算术 | 枢纽：数一数 / 算一算（结果 1～10）；答对发星 + 行内反馈音 |
| 英语 | 枢纽：字母表 26 大写点读 + 字母歌 / 单词 96 + 超短句；字母名或单词播完发星 |
| 拼音 | 仅 `a o e i u ü`；点读按拼音韵母（TTS 用注音 ㄚ/ㄛ/ㄜ/ㄧ/ㄨ/ㄩ） |
| 日历 · 任务 · 贴纸 | 页内打卡；每日随机目标；星星换贴纸 |
| 家长区 | 首页欢迎卡（「宝贝，你好呀」「一起快乐学习吧～」）进入；音量三档 + 长按 3 秒清除每日任务/学习记录/星星/贴纸 |

页内名称 **嘻嘻启蒙乐园**；微信后台创建/搜索名 **嘻宝星屋**（见 [`docs/apply/miniprogram-intro.md`](docs/apply/miniprogram-intro.md)）。

题库与视觉定稿：[`docs/design/CONTENT.md`](docs/design/CONTENT.md) · 分期：[`docs/design/PLAN.md`](docs/design/PLAN.md)

---

## 快速开始

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

`npm test` 会先把英语枢纽的运行时拷到 8 个分类包（内容没变不写盘）。`npm run build` / `mp:preview` / `mp:upload` 会先跑 `npm test`；`cloud:deploy` / `cloud:ci-deploy` / `cloud:init` 会先跑 `test:cloud`。清媒体、压音频、传云存储仍须手跑，避免误改资源或误传。

---

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| `miniprogram/` | 小程序前端 |
| `cloudfunctions/` | 云函数源码与[手动/自动化部署](cloudfunctions/README.md) |
| `cloud-assets/` | 云存储上传源与[手动/自动化上传](cloud-assets/README.md) |
| `docs/design/` | CONTENT / PLAN / H5 审查稿 / atoms / CSS tokens |
| `docs/` | 需求原文、验收清单、申请文案（`apply/`） |
| `.cursor/skills/` | 点读 TTS、小程序/云开发 Agent skills |

---

## 开发注意（摘要）

细节已拆到子文档，此处只列硬约束：

**图片** — 代码包禁止 webp（真机空白、工具正常）；统一 PNG。素材：`docs/design/atoms/` → `scripts/chroma_to_png.py` / `scripts/normalize_atoms.py`。须在开发者工具关闭「忽略未使用的文件」（`ignoreDevUnusedFiles: false`），否则未被直接引用的图片/音频上传时会被剔除、真机空白；当前 `project.config.json` 为 `true`，需重新关闭。

**样式** — 视觉基准 `docs/design/h5/`；改布局/色调须与 `miniprogram/**/*.wxss` **同批同步**（规则：`.cursor/rules/h5-miniapp-style-sync.mdc`）。H5 **只出静态 UI**，点读与点击只做小程序（`.cursor/rules/h5-static-review.mdc`）。Token：`docs/design/h5/css/tokens.css` ↔ `miniprogram/styles/tokens.wxss`（1px = 1rpx）；正文字号最小 28px/28rpx。卡面色统一为 `tone-*` 全站主题 token、按颜色命名（家长区/枢纽/贴纸/首页六卡全复用，见 [CONTENT §3](docs/design/CONTENT.md)）。

**点读** — `miniprogram/utils/audio.js`；主点读发星走 `utils/read-award.js`；播放钮主包组件 `components/play-button`。音频文件名必须纯 ASCII slug，`npm test` 会拦。音色与语速：古诗/识字/英语词句为晓晓或 Emma **`-30%`**；拼音韵母为晓辰 **`-10%`**；字母名为 Jenny **`-10%`**（详见 [CONTENT §2.10](docs/design/CONTENT.md)）。**拼音**喂注音「ㄚㄛㄜㄧㄨㄩ」；**字母 Z** 念 `zee`。真机无声时查：`setInnerAudioOption`、家长区音量。TTS 见 [edge-tts skill](.cursor/skills/edge-tts-batch/SKILL.md)。

**反馈** — 任务/兑换用弹层 `praise-sun`；算术对错用行内 soft-note + 共享音效；禁止 Toast。

**星星** — `miniprogram/utils/stars.js` 不加乐观计数：以云函数确认的**权威余额**为准，成功单调采纳（只增不减）；清零/扣星（epoch 变化）后迟到的旧加星响应整笔作废，防旧值顶回；失败入本地队列、云通畅自动补账（幂等 `clientId`）。顶栏在「本单学习星」与「任务奖励星」任一确认后都会刷新；任务奖励星在微任务中发起，保证请求顺序 = 业务顺序（先答对加星、后任务达成发奖励）。

**云开发文档入口**

| 能力 | 文档 | 手动 | 自动化 |
| --- | --- | --- | --- |
| 云函数 / 集合 | [`cloudfunctions/README.md`](cloudfunctions/README.md) | 右键绑环境 + 上传并部署 | `cloud:deploy`（工具 CLI）或 `cloud:ci-deploy`（miniprogram-ci） |
| 云存储媒体 | [`cloud-assets/README.md`](cloud-assets/README.md) | 控制台上传 | `assets:upload`（tcb）或 `assets:ci-upload`（miniprogram-ci） |
| 云函数测试 | [`cloudfunctions/README.md`](cloudfunctions/README.md) | 不适用 | `npm run test:cloud`（Mock 云开发 SDK） |
| 小程序 CI（miniprogram-ci） | [`docs/ci-miniprogram.md`](docs/ci-miniprogram.md) | 开发者工具上传 / 预览 | 已接：`mp:preview` / `mp:upload` / `cloud:ci-deploy` / `assets:ci-upload` |

默认 `USE_CLOUD = false`（免费套餐常改不了「所有人可读」）。加星失败会本地兜底并入队，**下次云通畅时自动冲刷同步**（幂等 `clientId`）；**涨星 ≠ 当时已写入云**。

云函数（均已部署，与本地对齐）：`login`、`getProfile`、`getProgress`、`addStars`、`checkinTask`、`dailyTasks`、`completeProgress`、`bumpHeat`、`exchangeReward`、`resetProfile`、`initDb`。`addStars` 原因白名单含 `letter_done`（字母点读）；`dailyTasks` 提供 `sync/get/reset`（每日任务云端为准，含家长区重置）。热力格子写入 `users.heatDays`，换机登录后合并。

---

## 当前进度

| 项 | 状态 |
| --- | --- |
| 八大板块业务页 + TTS | 已落地 |
| 首页六宫格（`tone-*` 彩色入口卡） | 已落地 |
| 每日任务（数量每日随机 + 云端同步）+ 日历打卡按钮 | 已落地 |
| 反馈闭环（弹层 / soft-note / 音效） | 已落地 |
| 家长区（音量三档 + 四类数据长按 3 秒清除） | 已落地 |
| 云存储切 `cloud://` | 未开（`USE_CLOUD = false`） |
| 云函数 | 已全量部署并与本地对齐；`addStars` 含 `letter_done` |
| 云端为唯一数据源 | 已落地（星星/贴纸/进度/每日任务/热力均为云端权威，本地仅快照 + 失败队列兜底；音量等设备偏好仍本地） |
