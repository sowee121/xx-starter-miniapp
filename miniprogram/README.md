# 小程序前端

媒体与云存储说明见仓库根目录 [`README.md`](../README.md)（「云开发文档入口」）和 [`../cloud-assets/README.md`](../cloud-assets/README.md)（**手动 / 自动化**）。

云函数创建、绑环境、上传部署见 [`../cloudfunctions/README.md`](../cloudfunctions/README.md)（**手动 / 自动化**）。

小程序 CI（预览 / 上传体验包 / 云函数 / 云存储）见 [`../docs/ci-miniprogram.md`](../docs/ci-miniprogram.md)。

题库、发星、反馈、家长区定稿见 [`../docs/design/CONTENT.md`](../docs/design/CONTENT.md)；分期状态见 [`../docs/design/PLAN.md`](../docs/design/PLAN.md)。

## 关键入口

| 用途 | 路径 |
| --- | --- |
| 媒体开关 | `config/media.js` → `USE_CLOUD`（默认 `false`，走本地） |
| 云环境 ID | `config/cloud.js` → `CLOUD_ENV` |
| 设计 token | `styles/tokens.wxss`（与 H5 `docs/design/h5/css/tokens.css` 对齐） |
| 每日任务 | `utils/daily-tasks.js`（`SCHEMA = 8`、数量每天随机、日历打卡） |
| 英语入口 | `subpkg/english/hub/hub`（字母表 / 单词） |
| 字母表 | `subpkg/english-abc/list/list`（点读发星 `reason: letter_done`） |
| 点读 | `utils/audio.js` |
| 主点读发星 | `utils/read-award.js` |
| 拼音 TTS | `python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --force --only pinyin`（合成文案：ㄚㄛㄜㄧㄨㄩ） |
| 字母 TTS | `python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --only alphabet`（字母名；Z=`zed`） |
| 反馈弹层 / 行内 | `utils/feedback.js`、`content/feedback.js`、`components/praise-sun`（主包） |
| 列表媒体卡 | `components/media-card`（主包） |
| 播放钮 | `components/play-button`（主包；各详情页共用） |
| 其它主包组件 | `app-shell`、`custom-header`、`star-bar`、`big-button`、`home-feature-card`、`home-module-card` |
| 家长区 | `pages/parent/`（首页欢迎卡进入；音量三档 + 长按 3 秒清除） |

## 常用命令

- 云函数本地测试：`npm run test:cloud`
- 小程序静态检查：`npm test`
- 本地预编译（去注释、压缩 JS）：`npm run build` → `.ci-output/miniprogram`
- 云函数部署：`npm run cloud:deploy`（工具 CLI）或 `npm run cloud:ci-deploy`（miniprogram-ci）
- 云存储上传：`npm run assets:upload`（tcb）或 `npm run assets:ci-upload`（miniprogram-ci）
- 小程序上传：`npm run mp:upload`（默认 `1.0.0` / `upload: <时间>`；可 `-- 1.0.1 '备注'`）
