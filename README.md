# 嘻嘻启蒙乐园

面向 2–3 岁半宝宝的微信原生亲子互动小程序。

晨间草地主题、黏土软萌与低饱和配色，保护幼儿视觉。古诗点读、识字组词、数物与简易加减、英语短句、单韵母、昼夜日历；每日任务攒星换小动物贴纸，在游玩中完成认知探索。基于**微信原生小程序 + 云函数**；幼儿学习流程只增星、不扣分，无广告/付费；家长区可主动清除数据。

| 模块 | 说明 |
| --- | --- |
| 古诗 | 6 首；逐句点读 + 全文朗读（全文播完发星） |
| 识字 | 古诗库 21 + 生活库 30；点读与组词 |
| 算术 | 数一数 / 算一算（结果 1～5）；答对发星 + 行内反馈音 |
| 英语 | 20 词 + 超短句；词句双点读 |
| 拼音 | 仅 `a o e i u ü`；点读按拼音韵母（TTS 用啊/喔/鹅/衣/乌/迂） |
| 日历 · 任务 · 贴纸 | 页内打卡；每日随机目标；星星换贴纸 |
| 家长区 | 欢迎卡进入；音量 + 长按清除学习记录/星星/贴纸 |

题库与视觉定稿：[`docs/design/CONTENT.md`](docs/design/CONTENT.md) · 分期：[`docs/design/PLAN.md`](docs/design/PLAN.md)

---

## 快速开始

1. 微信开发者工具导入**本仓库根目录**（不要选 `miniprogram/`）
2. 使用正式 AppID（测试号不可用云开发）
3. 开通云开发 → 将环境 ID 写入 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`
4. 云函数：按 [`cloudfunctions/README.md`](cloudfunctions/README.md)（**手动**绑环境 + 上传，或 **自动化** `npm run cloud:deploy`）
5. 编译预览（建议清一次缓存）；Console 调 `getProfile` / `initDb` 确认集合

```bash
npm install
npm run test:cloud # 云函数本地单元测试（Mock，不访问云端）
npm test           # 小程序静态检查（含 H5↔小程序 flex+gap、禁止包内 webp）
```

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

**图片** — 代码包禁止 webp（真机空白、工具正常）；统一 PNG。素材：`docs/design/atoms/` → `chroma_to_png` / `normalize_atoms`。须关闭「忽略未使用的文件」（已配 `ignoreDevUnusedFiles: false`）。

**样式** — 视觉基准 `docs/design/h5/`；改布局/色调须与 `miniprogram/**/*.wxss` **同批同步**（规则：`.cursor/rules/h5-miniapp-style-sync.mdc`）。Token：`h5/css/tokens.css` ↔ `styles/tokens.wxss`（1px = 1rpx）；正文字号最小 28px/28rpx。

**点读** — `utils/audio.js`；主点读发星走 `utils/read-award.js`；播放钮主包组件 `components/play-button`。音频文件名必须纯 ASCII slug，`npm test` 会拦。**拼音单韵母**须用汉字「啊喔鹅衣乌迂」合成，勿直接喂 `a/o/e…`（易念成英文）。真机无声时查：`setInnerAudioOption`、家长区音量。TTS 见 [edge-tts skill](.cursor/skills/edge-tts-batch/SKILL.md)。

**反馈** — 任务/兑换用弹层 `praise-sun`；算术对错用行内 soft-note + 共享音效；禁止 Toast。

**云开发文档入口**

| 能力 | 文档 | 手动 | 自动化 |
| --- | --- | --- | --- |
| 云函数 / 集合 | [`cloudfunctions/README.md`](cloudfunctions/README.md) | 右键绑环境 + 上传并部署 | `cloud:deploy`（工具 CLI）或 `cloud:ci-deploy`（miniprogram-ci） |
| 云存储媒体 | [`cloud-assets/README.md`](cloud-assets/README.md) | 控制台上传 | `assets:upload`（tcb）或 `assets:ci-upload`（miniprogram-ci） |
| 云函数测试 | [`cloudfunctions/README.md`](cloudfunctions/README.md) | 不适用 | `npm run test:cloud`（Mock 云开发 SDK） |
| 小程序 CI（miniprogram-ci） | [`docs/ci-miniprogram.md`](docs/ci-miniprogram.md) | 开发者工具上传 / 预览 | 已接：`mp:preview` / `mp:upload` / `cloud:ci-deploy` / `assets:ci-upload` |

默认 `USE_CLOUD = false`（免费套餐常改不了「所有人可读」）。加星失败会本地兜底并入队，**下次云通畅时自动冲刷同步**（幂等 `clientId`）；**涨星 ≠ 当时已写入云**。

---

## 当前进度

| 项 | 状态 |
| --- | --- |
| 八大板块业务页 + TTS | 已落地 |
| 每日任务（数量每日随机）+ 日历打卡按钮 | 已落地 |
| 反馈闭环（弹层 / soft-note / 音效） | 已落地 |
| 家长区（音量 + 清除） | 已落地 |
| 云存储切 `cloud://` | 未开（`USE_CLOUD = false`） |
| 云函数 | 已全量部署；login / 加星 / 兑换 / 任务打卡 / 清除已接通 |
| 云端为唯一数据源 | 进行中（加星/进度失败本地队列兜底，云通畅后自动同步） |
