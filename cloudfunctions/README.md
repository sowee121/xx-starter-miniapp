# 云函数与云数据库

`cloudfunctions/` 只是**本地源码**。控制台列表为空 = 尚未上传；小程序调用会失败（积分等会走本地兜底，表面不易察觉）。

## 环境约定（三处必须一致）

| 位置 | 字段 |
| --- | --- |
| `miniprogram/config/cloud.js` | `CLOUD_ENV` |
| `project.config.json` | `cloudfunctionRoot: "cloudfunctions/"` |
| 开发者工具「当前环境」 | 与上面同一 envId |

当前 envId：`cloudbase-d7gygre2uc80dcd42`  
AppID：`wx61ad70ac766e4a04`（见 `project.config.json`）

已有函数：`login`、`getProfile`、`getProgress`、`addStars`、`checkinTask`、`completeProgress`、`bumpHeat`、`exchangeReward`、`resetProfile`、`initDb`、`dailyTasks`

| 集合 | 用途 | 谁创建 |
| --- | --- | --- |
| `users` | 用户档案（星星、贴纸、热力 `heatDays` 等） | `initDb` 或首次 `login` / `getProfile` |
| `star_logs` | 加星流水 | 同上 |
| `progress` | 学习进度 | 同上 |
| `task_logs` | 任务打卡 | 同上 |
| `reward_logs` | 贴纸兑换 | 同上 |
| `daily_tasks` | 每日任务当天文档（任务列表/进度/已发星状态，openid+date 一条） | 同上，或首次 `dailyTasks` get |

集合**不必**在控制台手建；调 `initDb` 或首次登录相关函数即可 `createCollection`（已存在则跳过）。

`addStars` 原因白名单（须与客户端 `reason` 一致）：`poem_done`、`char_done`、`word_done`、`letter_done`、`pinyin_done`、`math`、`daily_task`。其中 `letter_done` 对应字母表点读（`subpkg/english-abc`）；日历打卡走 `checkinTask`，不走 `addStars`。

云**存储**图片见 [`../cloud-assets/README.md`](../cloud-assets/README.md)，与云函数是两回事。

---

## 怎么选流程

| 场景 | 推荐 |
| --- | --- |
| 第一次开通环境、绑环境、看清控制台 | **手动** |
| 改完代码要批量上传、给 Agent / CI 用 | **自动化**（优先） |
| `tcb fn invoke` 登录失败 | 改用开发者工具 Console 调函数（见下文自检） |

Agent 处理本仓库云开发任务时，优先读项目内 `.cursor/skills/miniprogram-development` 与 `cloud-functions`，部署走下方自动化命令，**不要**再用 `--project --names`（会报 `41002 appid missing`）。

---

## 一、手动流程

适合：首次配置、排查环境、不想开 CLI 端口时。

### 1. 前置

1. 正式 AppID 导入**仓库根目录**（不是 `miniprogram/`；测试号不可用云开发）
2. 工具栏打开 **云开发**，确认环境已开通（新建后约等 10 分钟）
3. 环境 ID 写入 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`
4. 确认 `project.config.json` 已有 `"cloudfunctionRoot": "cloudfunctions/"`（本仓库已配）

### 2. 绑定云环境（上传前必做）

未绑环境时会报：

> 请在编辑器云函数根目录（cloudfunctionRoot）选择一个云环境

操作：

1. 左侧文件树点中 **`cloudfunctions` 文件夹本身**（不要点子目录）
2. **右键** → **当前环境** / **切换环境** / **选择环境**
3. 选与 `CLOUD_ENV` 相同的环境
4. 选好后该目录图标通常会变成云朵样式

右键没有「当前环境」时：先点工具栏 **云开发** 进一次控制台，或 **项目 → 重新打开**。

### 3. 上传并部署

对每个函数目录（如 `cloudfunctions/login`）：

1. **右键**该目录
2. 选 **上传并部署：云端安装依赖**（推荐；本仓库依赖 `wx-server-sdk`，本地通常没有 `node_modules`）
3. 等待成功

全部传完后：**云开发 → 云函数** 应能看到对应名称。改某个函数后，只对该函数再上传一次即可。

### 4. 新建云函数（可选）

1. 确认已完成第 2 步
2. 右键 **`cloudfunctions`** → **新建 Node.js 云函数** → 输入名称
3. 编辑 `index.js` / `package.json` 后按第 3 步上传

也可只在本地建文件夹 + `index.js` + `package.json`，再右键上传（云端没有时会一并创建）。

### 5. 初始化集合（手动）

在开发者工具调试器 Console：

```js
wx.cloud.callFunction({ name: 'initDb' }).then(console.log).catch(console.error)
```

或直接调 `getProfile` / `login`（会按需建表）。
也可在控制台对单个函数点 **云端测试**。

---

## 二、自动化流程（推荐日常 / Agent）

适合：代码已就绪、环境已绑好、批量部署。

### 1. 前置

- 微信开发者工具**保持打开**
- **设置 → 安全设置 → 服务端口** 已开启
- `CLOUD_ENV` / AppID / 工具当前环境一致

### 2. 一键部署

仓库脚本会调用开发者工具 CLI，并**强制传入 `--appid` + `--paths`**（避免 `41002`）：

```bash
# 仓库根目录
npm run cloud:deploy          # 开发者工具 CLI：部署全部
npm run cloud:init            # 开发者工具 CLI：initDb / login / addStars
node scripts/deploy_cloud_functions.js login getProfile   # 指定若干个

# 不打开开发者工具时，用 miniprogram-ci（需 secrets 私钥，与 mp:upload 相同）
npm run cloud:ci-deploy       # CI：部署全部
npm run cloud:ci-init         # CI：initDb / login / addStars
node scripts/ci_deploy_cloud_functions.js login getProfile
```

| 命令 | 实现 | 前置 |
| --- | --- | --- |
| `cloud:deploy` / `cloud:init` | 微信开发者工具 CLI | 工具打开 + 服务端口 |
| `cloud:ci-deploy` / `cloud:ci-init` | `miniprogram-ci` → `ci.cloud.uploadFunction` | 上传私钥；可不打开工具 |

二者都传 `--remote-npm-install` / `remoteNpmInstall: true`（云端装依赖，不传本地 `node_modules`）。

等价于：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --appid wx61ad70ac766e4a04 \
  --env cloudbase-d7gygre2uc80dcd42 \
  --paths \
    /绝对路径/xx-starter-miniapp/cloudfunctions/login \
    /绝对路径/xx-starter-miniapp/cloudfunctions/getProfile \
  --remote-npm-install \
  --lang zh
```

**禁止**仅用 `--project --names`（签名缺 appid → `41002`）。

### 3. 初始化集合（自动化侧）

部署 `initDb` 后，在开发者工具 Console 调用（见上一节第 5 步）。
`npx tcb fn invoke` 依赖腾讯云账号登录，本仓库**不默认**走这条；登录失效时请用 Console / 云端测试。

### 4. Agent 约定

| 步骤 | 做法 |
| --- | --- |
| 部署 | 改完即部署：`npm run cloud:deploy -- <函数名>`；失败再 `cloud:ci-deploy` |
| 建表 | 提醒用户在 Console 调 `initDb` / `getProfile`，或引导手动云端测试 |
| 本地测试 | `cloud:deploy` / `cloud:ci-deploy` 会先自动跑 `npm run test:cloud` |
| 文档与 skill | `.cursor/skills/miniprogram-development`、`cloud-functions`、`cloudbase-cli` |
| 存储媒体 | 见 `cloud-assets/README.md` 自动化节（`tcb login` + `npm run assets:upload`） |

---

## 三、云函数自动化测试（不访问云端）

每次修改 `cloudfunctions/*/index.js` 后，在仓库根目录执行：

```bash
npm run test:cloud
```

测试脚本为 [`../scripts/test_cloudfunctions.js`](../scripts/test_cloudfunctions.js)，会 Mock `wx-server-sdk` 和内存数据库：

- 不需要登录开发者工具或 `tcb`
- 不读取或写入真实云数据库
- 不会部署云函数

当前覆盖：

| 业务 | 覆盖点 |
| --- | --- |
| `initDb` | 五个集合创建结果 |
| `login` / `getProfile` | 首次建档、已有用户读取、日期返回 |
| `addStars` | 参数拒绝、加星、`clientId` 幂等去重、清零标记 `starsResetAt` 作废清零前在途请求（`daily-时间戳-日期-taskId` 携带真实发起时刻）、`letter_done` 合法 / 未知 reason 拒绝 |
| `completeProgress` | 参数拒绝、首次完成、重复完成不重复建档 |
| `bumpHeat` | 参数拒绝、按日只增不减、覆盖写入 `users.heatDays` |
| `checkinTask` | 参数拒绝、首次打卡、同任务重复打卡 |
| `exchangeReward` | 非法奖励、无用户、余额不足、贴纸兑换、并发连点只扣一次 |
| `resetProfile` | 家长区清除：`progress` 只清进度、`stars` 只清积分、`stickers` 只清贴纸（作废旧加星队列） |
| 落库归属 | 所有集合的新记录都必须带 `_openid`（云函数 `add` 不会自动注入） |

本地通过只说明业务分支与 SDK 调用形态正确；仍须做下方的**云端自检**，确认环境、权限和已部署函数均正确。

推荐日常顺序：

```bash
npm run cloud:deploy    # 会先自动跑 test:cloud
npm run mp:upload       # 会先自动跑 npm test
```

---

## 部署后自检（两种流程共用）

```js
wx.cloud.callFunction({ name: 'getProfile' }).then(console.log).catch(console.error)
```

| 结果 | 含义 |
| --- | --- |
| 有业务结果（如 `ok: true`） | 通 |
| `FUNCTION_NOT_FOUND` | 未部署或环境绑错 |
| `DATABASE_COLLECTION_NOT_EXIST` | 集合未建 → 调 `initDb` |
| `cloud init error` / `invalid scope` | 环境未就绪或 `CLOUD_ENV` 填错 |

**涨星 ≠ 云已通**：`miniprogram/utils/stars.js` 失败会写本地队列。

---

## 脏数据与自愈

历史踩过的坑（均已修复，留档备忘）：

| 问题 | 根因 | 修复 |
| --- | --- | --- |
| `users` 空壳堆积（226 条） | `getOrCreateUser` 并发「先查后插」竞态：两个请求都查不到、各 `add` 一条；早年版本 `add` 漏写 `_openid` | 新版 `getOrCreateUser` 幂等：同 openid 多条时保留第一条、删除其余，下次调用自动自愈 |
| 热力 `heatDays` 清不掉 | 旧版 `resetProfile` 用 `update({ heatDays: {} })`，**空对象被云端忽略**，`heatResetAt` 写了但热力残留 | 改用 `_.set({})` + `where({ _openid })` 覆盖同 openid 全部文档 |
| `progress` / `task_logs` 空壳（39 + 10 条） | 历史版本 `add` 漏写 `_openid`，按用户查询永远匹配不到 | 当前所有 `add` 均显式写 `_openid`；存量用清理脚本 |

涉及幂等 `getOrCreateUser` 的函数：`login` / `getProfile` / `addStars` / `bumpHeat` / `resetProfile`。
`bumpHeat` 写热力用 `where` + `_.set` 覆盖全部文档，避免多文档时残留旧热力。

**存量脏数据清理脚本**（默认只审计，`--apply` 才写库）：

```bash
node scripts/purge_dirty_data.js          # 审计：报告空壳 / 重复 _openid / heatDays 残留
node scripts/purge_dirty_data.js --apply  # 执行清理
```

---

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 控制台云函数列表为空 | 本地有码未上传 → 手动 §3 或自动化 §2 |
| 「请在 … 选择一个云环境」 | 对 **`cloudfunctions` 根目录**右键选环境 |
| CLI `41002 appid missing` | 改用 `npm run cloud:deploy`（带 `--appid` + `--paths`） |
| `tcb` 授权后仍无身份 | 用 Console 调函数，不必强依赖 `tcb fn invoke` |
| 上传成功但小程序仍调不通 | 核对 `CLOUD_ENV`、工具当前环境、控制台是否同一 env |
