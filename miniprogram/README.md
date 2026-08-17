# 小程序前端

媒体与云存储说明见仓库根目录 `README.md`（「云开发文档入口」）和 [`../cloud-assets/README.md`](../cloud-assets/README.md)（**手动 / 自动化**）。

云函数创建、绑环境、上传部署见 [`../cloudfunctions/README.md`](../cloudfunctions/README.md)（**手动 / 自动化**）。

小程序 CI（预览 / 上传体验包 / 云函数 / 云存储）见 [`../docs/ci-miniprogram.md`](../docs/ci-miniprogram.md)。

题库与每日任务定稿见 [`../docs/design/CONTENT.md`](../docs/design/CONTENT.md)；分期状态见 [`../docs/design/PLAN.md`](../docs/design/PLAN.md)。

- 路径开关：`config/media.js` 的 `USE_CLOUD`（默认 `false`，走本地）
- 环境 ID：`config/cloud.js` 的 `CLOUD_ENV`
- 每日任务：`utils/daily-tasks.js`（数量每天随机）
- 点读：`utils/audio.js`（真机注意静音键与中文路径编码）
- 云函数本地测试：`npm run test:cloud`
- 云函数部署：`cloud:deploy`（工具 CLI）或 `cloud:ci-deploy`（miniprogram-ci）
- 云存储上传：`assets:upload`（tcb）或 `assets:ci-upload`（miniprogram-ci）
- 小程序上传：`npm run mp:upload`（默认 `1.0.0` / `upload: <时间>`；可 `-- 1.0.1 '备注'`）
