# 小程序前端

媒体与云存储说明见仓库根目录 `README.md`（「云存储与代码质量」）和 `cloud-assets/README.md`。

云函数创建 / 绑定环境 / 上传部署见 [`../cloudfunctions/README.md`](../cloudfunctions/README.md)。

题库与每日任务定稿见 [`../docs/design/CONTENT.md`](../docs/design/CONTENT.md)；分期状态见 [`../docs/design/PLAN.md`](../docs/design/PLAN.md)。

- 路径开关：`config/media.js` 的 `USE_CLOUD`（默认 `false`，走本地）
- 环境 ID：`config/cloud.js` 的 `CLOUD_ENV`
- 每日任务：`utils/daily-tasks.js`（数量每天随机）
- 点读：`utils/audio.js`（真机注意静音键与中文路径编码）
- 批量上传媒体：在仓库根目录执行 `npx tcb login` 后 `npm run assets:upload`
