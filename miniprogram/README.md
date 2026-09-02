# 小程序前端

微信原生小程序（无框架），主包只留入口与通用件，业务板块全部走分包。

**相关文档**

- 仓库总览、命令速查、分包一览：[`../README.md`](../README.md)
- 媒体与云存储（`USE_CLOUD` / 上传 / purge）：[`../cloud-assets/README.md`](../cloud-assets/README.md)（**手动 / 自动化**）
- 云函数创建、绑环境、上传部署、接口与集合：[`../cloudfunctions/README.md`](../cloudfunctions/README.md)（**手动 / 自动化**）
- 小程序 CI（预览 / 上传体验包 / 云函数 / 云存储）：[`../docs/ci-miniprogram.md`](../docs/ci-miniprogram.md)
- 题库、发星、反馈、家长区定稿：[`../docs/design/CONTENT.md`](../docs/design/CONTENT.md)；分期状态：[`../docs/design/PLAN.md`](../docs/design/PLAN.md)

---

## 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss   # 启动链、分包与预下载注册、全局样式
├── pages/
│   ├── home/                      # 首页：欢迎卡 + 每日任务 + 六宫格（唯一主包业务页）
│   └── parent/                    # 家长区：音量三档 + 长按 3 秒清除
├── components/                    # 11 个主包通用组件
├── utils/                         # 12 个通用模块（云端、发星、点读、进度、热力…）
├── content/                       # 静态内容配置：mascots / modules / feedback
├── styles/                        # tokens / reset / layout / cards / learning
├── config/                        # cloud.js（envId）、media.js（USE_CLOUD）
├── static/                        # 主包共享图与音频（shared/ icons/ home/）
└── subpkg/                        # 17 个分包，媒体各自随包
```

---

## 页面与分包

主包只有 `pages/home/home` 与 `pages/parent/parent` 两页，其余全在 `app.json` 的 `subPackages` 里：

| 分包 | 页面 | 内容源 |
| --- | --- | --- |
| `poem` | `poem/poem`、`detail/detail` | `subpkg/poem/content/poems.js`（6 首） |
| `hanzi` | `list/list`、`detail/detail` | `subpkg/hanzi/content/hanzi.js`（96 字 · 八类各 12） |
| `math` | `hub/hub`、`count/count`、`calc/calc` | 题目在页面内生成（结果 1～10），共用 `quiz-page.js` |
| `english` | `hub/hub`、`list/list`、`detail/detail` | `subpkg/english/content/english-words.js`（8 类 × 12） |
| `english-fruit` / `-animal` / `-color` / `-body` / `-transport` / `-number` / `-food` / `-nature` | `detail/detail` | 各自 `content/english-words.js` 只含本类；`lib/` 与 `detail/detail.{wxml,json}` 由 `scripts/sync_english_runtime.js` 从 `english` 同步 |
| `english-abc` | `list/list`、`detail/detail` | 26 个大写字母 |
| `pinyin` | `list/list`、`detail/detail` | 6 个单韵母 |
| `calendar` | `index` | 月历热力（`utils/activity.js` 供数） |
| `task` | `list` | 每日任务（`utils/daily-tasks.js`） |
| `shop` | `shop` | 积分商城（`subpkg/shop/content/stickers.js`，24 款） |

> 改英语分类页时只改 `subpkg/english/lib/*` 与 `subpkg/english/detail/detail.{wxml,json}`，`npm test` 会自动同步到 8 个分类包；直接改分类包会被检查拦回。

---

## 关键入口

| 用途 | 路径 |
| --- | --- |
| 媒体开关 | `config/media.js` → `USE_CLOUD`（默认 `false`，走本地） |
| 云环境 ID | `config/cloud.js` → `CLOUD_ENV` |
| 云调用唯一出口 | `utils/cloud.js`（`wx.cloud` 只允许出现在本文件；8s 超时兜底） |
| 设计 token | `styles/tokens.wxss`（与 H5 `docs/design/h5/css/tokens.css` 对齐） |
| 首页入口配置 | `content/modules.js`（八大板块 + 首页六宫格顺序） |
| 吉祥物与首页素材 | `content/mascots.js`（图标、tone 色、首页图） |
| 反馈文案与音效 | `content/feedback.js`（弹层 `LAYERS` / 行内 `INLINE`） |
| 每日任务 | `utils/daily-tasks.js`（`SCHEMA = 10`、数量每天随机、日历打卡） |
| 英语入口 | `subpkg/english/hub/hub`（字母表 / 单词） |
| 字母表 | `subpkg/english-abc/list/list`（点读发星 `reason: letter_done`） |
| 点读 | `utils/audio.js` |
| 主点读发星 | `utils/read-award.js` |
| 星星模型 | `utils/stars.js`（云端权威 + 单调采纳 + epoch 失效；任务奖励星后发、任一确认双刷新） |
| 拼音 TTS | `python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --force --only pinyin`（晓辰 `-10%`；注音 ㄚㄛㄜㄧㄨㄩ） |
| 字母 TTS | `python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --force --only alphabet`（Jenny `-10%`；Z=`zee`） |
| 点读音色/语速 | 见仓库 `docs/design/CONTENT.md` §2.10 |
| 反馈弹层 / 行内 | `utils/feedback.js`、`content/feedback.js`、`components/praise-sun`（主包） |
| 列表媒体卡 | `components/media-card`（主包） |
| 播放钮 | `components/play-button`（主包；各详情页共用） |
| 家长区 | `pages/parent/`（首页欢迎卡进入；音量三档 + 长按 3 秒清除） |

---

## 组件索引（全在主包 `components/`）

| 组件 | 用途 |
| --- | --- |
| `app-shell` | 页面外壳：自定义导航 + 背景草地 + 内容区（纵向 `gap` 由它提供） |
| `custom-header` | 胶囊按钮下方对齐的自定义标题栏（含返回） |
| `star-bar` | 顶栏星星数，订阅 `utils/stars.js` 刷新 |
| `big-button` | 大号主行动按钮，点击节流走 `utils/tap-guard` |
| `media-card` | 列表/详情页通用媒体卡（图 + 标题 + 可选播放钮） |
| `play-button` | 播放/停止切换钮，全局 stop 时会收回三角 |
| `praise-sun` | 任务达成 / 兑换成功的太阳弹层 |
| `home-module-card` | 首页六宫格模块卡（吉祥物 + `tone-*` 面色） |
| `home-feature-card` | 首页任务 / 商城功能卡（进度星槽、行动文案） |
| `activity-month` | 日历页月历热力网格（`title` / `weekdays` / `cells` / `night`） |
| `trail-nav` | 上一题 / 下一题切换（`hasPrev` / `hasNext`，抛 `prev` / `next`） |

组件统一 `styleIsolation: 'apply-shared'`，`tone-*` 卡面色取自 `styles/cards.wxss`。

## utils 索引

| 模块 | 职责 |
| --- | --- |
| `cloud.js` | 唯一允许 `wx.cloud` 的文件；`call()` 带 8s 超时，返回 `{ ok, data, error }`，失败不弹窗 |
| `stars.js` | 星星权威余额：云端确认后单调采纳，失败入队，清零 epoch 后旧响应作废 |
| `retry-queue.js` | 加星失败队列（`star_retry_queue`，上限 200 条） |
| `read-award.js` | 主点读「播完发星」编排：播放 + 发星 + 反馈 + 收回播放钮 |
| `audio.js` | 点读播放；规避 `stop()` 在部分机型误发 `onEnded` |
| `progress.js` | 学习进度：`{ 'module::itemId': true }` + 云端 `completeProgress` / `getProgress` |
| `activity.js` | 按日学习热力；本地先写再同步云端，`KEEP_MONTHS = 12`（须与云端 `bumpHeat` 一致） |
| `daily-tasks.js` | 每日任务：云端为准 + 本地缓存，`SCHEMA = 10`（须与云端 `dailyTasks` 一致） |
| `feedback.js` | 弹层 / 行内 soft-note 调度，动画时长与 `feedback.wxss` 对齐 |
| `page.js` | 跳转与 query 解析；`navigateTo` 栈满自动降级 `redirectTo` |
| `navbar.js` | 状态栏 + 胶囊按钮尺寸，供 `app-shell` / `custom-header` / `star-bar` 对齐 |
| `tap-guard.js` | 点击节流：首次立即执行，窗口内重复点击忽略 |

## 样式体系

| 文件 | 内容 |
| --- | --- |
| `styles/tokens.wxss` | 设计变量（色 / 间距 / 圆角 / 字号），1px = 1rpx 与 H5 `docs/design/h5/css/tokens.css` 对齐 |
| `styles/reset.wxss` | 基础重置；正文字号最小 28rpx |
| `styles/layout.wxss` | 页面骨架（shell / 网格 / 安全区） |
| `styles/cards.wxss` | `tone-*` 卡面色（与 H5 15 色同源，按颜色命名） |
| `styles/learning.wxss` | 学习页共用样式（词卡网格、点读区、选项） |

---

## 数据与状态

- **云端为唯一数据源**：星星 / 贴纸 / 进度 / 每日任务 / 热力都是云端权威，本地只存快照。
- **失败兜底**：所有写操作失败进本地队列（`storage`），云通畅时自动冲刷；幂等键 `clientId` 由各模块自己生成。
- **本地偏好**：音量档位等设备/个人偏好仍只存本地，不同步。
- **家长区清除**：调 `resetProfile`，`progress` / `stars` / `stickers` 三种 scope 各自清，并写入 `heatResetAt` / `starsResetAt` 让在途旧响应作废。

---

## 新增一个学习板块（SOP）

1. `app.json` 注册新分包（页面路径放 `subPackages`），需要时给 `pages/home/home` 加 `preloadRule`
2. `content/modules.js` 加板块条目（id / 标题 / 图标 / `tone` / url），按需加进 `HOME_MODULE_ENTRIES`
3. 题库放 `subpkg/<name>/content/*.js`，图片音频放 `subpkg/<name>/static/`（**不要跨分包引用**）
4. 列表 / 详情复用 `components/media-card` + `components/play-button`，发星走 `utils/read-award.js`
5. 用 `utils/tap-guard` 包住点击，用 `utils/feedback.js` 给反馈（任务用弹层，答题用行内 soft-note）
6. 若接入每日任务：同步改云端 `cloudfunctions/dailyTasks/index.js` 的 `TEMPLATES` 与本仓 `utils/daily-tasks.js`（两处 `SCHEMA` 一起递增）
7. 出音频：`.cursor/skills/edge-tts-batch`（音色 / 语速见 CONTENT §2.10）
8. 跑 `npm test`（会自动同步英语运行时 + 校验分包/体积/资源），再 `npm run mp:upload`

---

## 常用命令

- 云函数本地测试：`npm run test:cloud`（`cloud:deploy` / `cloud:ci-deploy` 会先自动跑）
- 小程序静态检查：`npm test`（会先同步英语分类包）
- 单独同步英语分类包：`npm run sync:english`
- 格式化：`npm run format`
- 云函数部署：`npm run cloud:deploy`（工具 CLI）或 `npm run cloud:ci-deploy`（miniprogram-ci）
- 云存储上传：`npm run assets:upload`（tcb）或 `npm run assets:ci-upload`（miniprogram-ci）
- 小程序上传：`npm run mp:upload`（先 `npm test`；默认 `1.0.0` / `upload: <时间>`；可 `-- 1.0.1 '备注'`）

---

## 开发约定（改动后自检）

- [ ] 布局只用 flex + `gap`；不用负 margin、`space-between` 模拟间距、grid
- [ ] 新图是 PNG，文件名纯 ASCII slug，放在**使用它的那个分包**的 `static/`
- [ ] 组件在页面 json 的 `usingComponents` 注册，且不注册未使用的组件
- [ ] 分享给 H5 的布局改动已同批同步到 `docs/design/h5/`
- [ ] 卡面色用 `tone-*` token，不写死色值
- [ ] 注释：`/** 摘要 */` 只在声明上方、`//` 只在语句上方，`catch` 空块写 `// ignore`（见 `.cursor/rules/code-comment.mdc`）
- [ ] 发星/进度/热力/每日任务都有失败兜底，不阻塞幼儿学习流程
- [ ] `npm test` 通过
