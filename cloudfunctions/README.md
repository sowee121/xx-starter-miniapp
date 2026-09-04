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

---

## 集合

| 集合 | 用途 | 谁创建 |
| --- | --- | --- |
| `users` | 用户档案（星星、贴纸、热力 `heatDays` 等） | `initDb` 或首次 `login` / `getProfile` |
| `star_logs` | 加星流水（`_id` 即客户端 `clientId`） | 同上 |
| `progress` | 学习进度 | 同上 |
| `task_logs` | 任务打卡 | 同上 |
| `reward_logs` | 贴纸兑换 | 同上 |
| `daily_tasks` | 每日任务当天文档（任务列表/进度/已发星状态，openid+date 一条） | 同上，或首次 `dailyTasks` get |
| `app_meta` | 全局元信息：`reset` 文档存重置纪元 `resetAt`（`initDb reset` 写入，每日任务据此作废各设备旧本地缓存，实现真全清） | `initDb reset` 自动建 |

集合**不必**在控制台手建；调 `initDb` 或首次登录相关函数即可 `createCollection`（已存在则跳过）。`app_meta` 仅由 `initDb reset` 自动建，其余流程不需要它。

### `users` 主要字段

| 字段 | 说明 |
| --- | --- |
| `_openid` | 归属用户；**云函数 `add` 不会自动注入，必须显式写入** |
| `stars` | 星星余额 |
| `stickers` / `badges` | 已兑换贴纸 id 数组 / 徽章 |
| `heatDays` | `{ 'YYYY-MM-DD': 次数 }`，热力图数据（云端保留 12 个月） |
| `starsResetAt` | 清星时间戳；早于它的在途加星请求整笔作废 |
| `heatResetAt` | 清热力时间戳；早于它的在途 `bumpHeat` 写入直接丢弃 |
| `updatedAt` | 更新时间 |

> 三个「必须显式写 `_openid`」的地方：`completeProgress`、`checkinTask`、`dailyTasks` 的 `sync` 新增分支。漏写会静默产生「按 openid 永远查不到」的空壳文档。

### 跨端常量（改一端必须同步另一端）

| 常量 | 云端 | 小程序端 |
| --- | --- | --- |
| 每日任务模板结构版本 | `dailyTasks/index.js` 的 `SCHEMA = 10` | `miniprogram/utils/daily-tasks.js` 的 `SCHEMA = 10` |
| 每日任务模板 | `dailyTasks/index.js` 的 `TEMPLATES` | `miniprogram/utils/daily-tasks.js` 的 `TEMPLATES` |
| 热力保留月数 | `bumpHeat/index.js` 的 `KEEP_MONTHS = 12` | `miniprogram/utils/activity.js` 的 `KEEP_MONTHS = 12` |
| 贴纸价目 | `exchangeReward/index.js` 的 `REWARDS` | `miniprogram/subpkg/shop/content/stickers.js` |

---

## 云函数 API 参考

所有函数统一 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`，身份取 `cloud.getWXContext().OPENID`，错误处理统一返回 `{ ok: false, error: 'invalid_params' }` 形态（客户端 `utils/cloud.js` 只认 `ok`）。

| 函数 | 入参 | 返回 | 说明 |
| --- | --- | --- | --- |
| `initDb` | — 或 `{ mode: 'reset' \| 'whoami' }` | `{ ok, results[] }` \| `{ ok, openid }` | **owner-only**：非 `OWNER_OPENIDS` 白名单（`initDb/index.js`）一律 `forbidden`。默认按需建 6 个集合（已存在记 `exists`）；`mode: 'reset'` 清空业务集合全部文档并在 `app_meta` 写重置纪元（各设备每日任务本地缓存随后自动作废，见「开发环境重置」）；`mode: 'whoami'` 回显调用者 openid（首次 owner 锁定用，见「初始化集合」） |
| `login` | — | `{ ok, profile, serverDate, weekday }` | 首个入口：建集合 + 幂等建档 |
| `getProfile` | — | `{ ok, profile, serverDate, weekday, todayTasks: [] }` | 读档案，不存在则建；`todayTasks` 保留字段恒为空数组 |
| `getProgress` | `{ module? }` | `{ ok, items: [{ module, itemId, done }] }` | 只返回 `done: true` 的记录；传 `module` 则按模块过滤；分页读取上限 500 |
| `completeProgress` | `{ module, itemId }` | `{ ok }` | 缺参返回 `invalid_params`；已存在则更新，不存在则新建（显式写 `_openid`） |
| `addStars` | `{ clientId, delta, reason, ref? }` | `{ ok, stars, duplicated, stale? }` | 见下方「加星」小节 |
| `checkinTask` | `{ taskId }` | `{ ok, duplicated, date }` | 当天 `task_logs` 里追加打卡；同 `taskId` 重复打卡返回 `duplicated: true` |
| `dailyTasks` | `{ action: 'get' \| 'sync' \| 'reset', date?, seed?, day? }` | `{ ok, action, day?, resetAt? }` | `get`：无则生成（seed 有效且不早于重置纪元时沿用客户端结果，避免双随机漂移），返回附全局 `resetAt`；`sync`：整体 upsert（last-write-wins），早于重置纪元的旧本地拒收（回 `ignored: true`）；`reset`：删当天 `daily_tasks` 文档 + 当天 `task_logs` |
| `bumpHeat` | `{ day, count, since }` | `{ ok, heatDays, stale? }` | `day` 必须 `YYYY-MM-DD`，`count` 取 0–99；同日只增不减；`since < heatResetAt` 时整笔丢弃并回 `stale` |
| `exchangeReward` | `{ rewardId }` | `{ ok, stars, stickerId }` | 见下方「兑换」小节 |
| `resetProfile` | `{ scope: 'progress' \| 'stars' \| 'stickers' }` | `{ ok, scope, … }` | 家长区清除；见下方「重置」小节 |

### 加星 `addStars`

- **幂等**：`star_logs` 的 `_id` 直接取客户端 `clientId`；先 `add`（已存在则忽略），再用条件 `update` 认领 `credited: false` → `true`，只有认领成功才 `_.inc(delta)`。连点不会重复加。
- **上限**：单次 `delta` 必须 `1 ≤ delta ≤ 6`（`MAX_DELTA = 6`，拼音每日任务最多 6 个韵母）。
- **reason 白名单**（不在表内一律 `invalid_params`）：

  | reason | 用途 | 客户端是否已用 |
  | --- | --- | --- |
  | `answer_ok` | 通用答对 | 预留 |
  | `poem_done` | 古诗全文播完 | ✅ `subpkg/poem/detail` |
  | `char_done` | 识字点读 | ✅ `subpkg/hanzi/detail` |
  | `word_done` | 英语单词点读 | ✅ `subpkg/english*/detail` |
  | `letter_done` | 英文字母名点读 | ✅ `subpkg/english-abc/detail` |
  | `pinyin_done` | 拼音韵母点读 | ✅ `subpkg/pinyin/detail` |
  | `math` | 算术答对 | ✅ `subpkg/math/quiz-flow` |
  | `daily_task` | 每日任务奖励 | ✅ `utils/daily-tasks.js` |
  | `task_done` | 通用任务完成 | 预留 |
  | `calendar_done` | 日历打卡 | 预留（当前日历走 `checkinTask`） |

  客户端新增 reason 必须同时加进这张表，否则线上全部 `invalid_params`。

- **清零作废**：`clientId` 需携带真实发起时刻。普通加星为 `${Date.now()}-xxx`；每日任务为 `daily-{13 位时间戳}-{日期}-{taskId}`。`issuedAt < starsResetAt` 时返回 `{ ok: true, duplicated: true, stale: true }`，不发星。

### 兑换 `exchangeReward`

- 价目 `REWARDS` 24 款：2 星 9 款、4 星 5 款、6 星 6 款、8 星 3 款、10 星 1 款（独角兽）。
- 预读只用于给友好错误（`invalid_reward` / `no_user` / `not_enough_stars` / `sticker_owned`）；真正的扣减是**条件更新**：`stars >= cost` 且 `stickers` 不含该 id 才执行，`updated === 0` 时返回 `exchange_conflict`。连点/多设备并发只扣一次。
- 成功后写 `reward_logs` 并返回最新余额。

### 重置 `resetProfile`

| scope | 动作 |
| --- | --- |
| `progress` | 删 `progress` 全部文档 + `users.heatDays = {}` + 写 `heatResetAt`（学习记录与热力一起清） |
| `stars` | `users.stars = 0` + 写 `starsResetAt` + 删 `star_logs`（贴纸与兑换记录不动） |
| `stickers` | `users.stickers = []` / `badges = []` + 删 `reward_logs`（积分不动） |

写入一律用 `where({ _openid })` + `_.set` 覆盖**同 openid 的全部**文档，不用 `doc(user._id)`：竞态下可能短暂存在多条，只更新一条会残留旧值。

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

> 新增函数后建议同步：本文「已有函数」清单与 API 参考表、本目录 `README` 的 `cloud:init` 无需要改（它只部署 `initDb` / `login` / `addStars`），但 `scripts/test_cloudfunctions.js` **应补一条用例**。

### 5. 初始化集合（手动）

在开发者工具调试器 Console：

```js
wx.cloud.callFunction({ name: 'initDb' }).then(console.log).catch(console.error)
```

或直接调 `getProfile` / `login`（会按需建表）。
也可在控制台对单个函数点 **云端测试**。

**owner 锁定（已完成）**：`initDb` 只放行 `OWNER_OPENIDS` 白名单（`initDb/index.js` 顶部，保留 `'test-openid'` 勿删，本地单测依赖）。当前已含开发者本人 openid，仅本人可调用，他人一律返回 `{ ok: false, error: 'forbidden' }`。需要更换 / 新增 owner 时，先用自己的微信在模拟器/真机登录，再执行：

```js
wx.cloud.callFunction({ name: 'initDb', data: { mode: 'whoami' } }).then(console.log)
```

把返回的 `openid` 填入 `OWNER_OPENIDS` 数组（保留 `'test-openid'` 勿删，本地单测依赖），重新部署 `initDb` 即完成锁定。`whoami` 无副作用，仅回显调用者自身的 openid。

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

| 用例 | 覆盖点 |
| --- | --- |
| `initDb` 建集合与 owner 鉴权 | 六个集合全部 `created`；`whoami` 回显自身 openid 且无副作用；非 owner 调 `reset` 被 `forbidden` 且不清库；owner `reset` 清空业务集合并写 `app_meta` 重置纪元 |
| `login` 与 `getProfile` 用户档案 | 首次建档、已有用户读取、日期返回 |
| `addStars` 参数校验与幂等 | 参数拒绝、加星、`clientId` 幂等去重、清零标记 `starsResetAt` 作废清零前在途请求（`daily-时间戳-日期-taskId` 携带真实发起时刻）、`letter_done` 合法 / 未知 reason 拒绝 |
| `completeProgress` 与 `checkinTask` | 参数拒绝、首次完成、重复完成不重复建档、首次打卡、同任务重复打卡 |
| `dailyTasks` 生成/幂等/同步/重置 | 六模块生成、同 openid+date 多条保留首条、`sync` upsert、`reset` 只删当天 `daily_tasks` 与当天 `task_logs` |
| `dailyTasks` 重置纪元防旧本地回写 | reset 后旧 seed 被忽略全新生成、旧本地 `sync` 拒收（`ignored`）、新本地正常采用 seed |
| `bumpHeat` 按日只增不减 | 参数拒绝、按日只增不减、覆盖写入 `users.heatDays` |
| `exchangeReward` 校验与扣星 | 非法奖励、无用户、余额不足、贴纸兑换 |
| `exchangeReward` 并发只扣一次 | 并发连点只扣一次 |
| `resetProfile` 分作用域重置 | `progress` 只清进度、`stars` 只清积分、`stickers` 只清贴纸（作废旧加星队列） |
| 落库记录均带 `_openid` | 所有集合的新记录都必须带 `_openid`（云函数 `add` 不会自动注入） |

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

其它可用探针：

```js
wx.cloud.callFunction({ name: 'dailyTasks', data: { action: 'get' } }).then(console.log)
wx.cloud.callFunction({ name: 'addStars', data: { clientId: `${Date.now()}-test`, delta: 1, reason: 'math' } }).then(console.log)
wx.cloud.callFunction({ name: 'addStars', data: { clientId: `${Date.now()}-test`, delta: 1, reason: 'hack' } }).then(console.log) // 应 ok:false / invalid_params
```

**涨星 ≠ 云已通**：`miniprogram/utils/stars.js` 失败会写本地队列。

---

## 脏数据与自愈

| 问题 | 根因 | 修复 |
| --- | --- | --- |
| `users` 空壳堆积（226 条） | `getOrCreateUser` 并发「先查后插」竞态：两个请求都查不到、各 `add` 一条 | `getOrCreateUser` 幂等：同 openid 多条时**先把分散字段合并进首条**（`stars` 相加——clientId 幂等保证不双计；贴纸/徽章并集去重；热力逐日取大；resetAt 取新）再删除其余，下次调用自动收敛 |
| 热力 `heatDays` 清不掉 | `update({ heatDays: {} })` 携带的空对象被云端忽略，清空不生效 | 改用 `_.set({})` + `where({ _openid })` 覆盖同 openid 全部文档 |
| `progress` / `task_logs` 空壳（39 + 10 条） | `add` 未写 `_openid` 的文档按 `_openid` 查询永远匹配不到 | 所有 `add` 均显式写 `_openid`；存量已清理 |

涉及幂等 `getOrCreateUser` 的函数：`login` / `getProfile` / `addStars` / `bumpHeat` / `resetProfile`。
`exchangeReward` 读档处同款合并：多档时先合并再判断余额/贴纸，无档仍返回 `no_user`。
`bumpHeat` 写热力用 `where` + `_.set` 覆盖全部文档，避免多文档时残留旧热力。

**并发写入三条铁律**

1. 建档/更新统一走 `where({ _openid })`，需要覆盖空对象/空数组时用 `_.set`
2. 余额扣减用**条件更新**（`stars: _.gte(cost)`）而不是「先读后写」
3. 幂等靠业务键做 `_id`（`star_logs`）或条件认领（`credited`）

**开发环境重置**（会删掉所有用户数据；**owner-only**，未完成上方首次启用锁定前调 `reset` 会被 `forbidden`）：

```js
wx.cloud.callFunction({ name: 'initDb', data: { mode: 'reset' } }).then(console.log)
```

reset 会清空 6 个业务集合的全部文档，并在 `app_meta` 写入新的重置纪元。各设备下一次打开小程序时，每日任务检测到本地缓存早于纪元即整份作废（任务重新随机、进度归零），已清空的数据不会被旧本地缓存回写复活——「清库」即「各设备全清」。

---

## 新增云函数（SOP）

1. 建目录 `cloudfunctions/<name>/`，含 `index.js` 与 `package.json`（依赖 `wx-server-sdk`）
2. 函数体：先校验参数（缺参返回 `{ ok: false, error: 'invalid_params' }`），再按 `_openid` 读写
3. 所有 `add` 显式写 `_openid`；所有覆盖写用 `where({ _openid })` + `_.set`
4. 涉及客户端的常量（模板、版本、价目）与小程序端同步递增
5. 在 `scripts/test_cloudfunctions.js` 补一条用例（参数拒绝 + 正常路径 + 幂等/并发）
6. `npm run test:cloud` 通过后 `npm run cloud:deploy -- <name>`
7. 补齐本文「已有函数」与「云函数 API 参考」两处

---

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 控制台云函数列表为空 | 本地有码未上传 → 手动 §3 或自动化 §2 |
| 「请在 … 选择一个云环境」 | 对 **`cloudfunctions` 根目录**右键选环境 |
| CLI `41002 appid missing` | 改用 `npm run cloud:deploy`（带 `--appid` + `--paths`） |
| `tcb` 授权后仍无身份 | 用 Console 调函数，不必强依赖 `tcb fn invoke` |
| 上传成功但小程序仍调不通 | 核对 `CLOUD_ENV`、工具当前环境、控制台是否同一 env |
| `addStars` 一直 `invalid_params` | `clientId` 缺失、`reason` 不在白名单、或 `delta` 不在 1～6 |
| 清了学习记录热力还在 | 检查 `resetProfile` 是否用 `_.set({})`；旧数据在途写入靠 `heatResetAt` 丢弃 |
| 同 openid 出现多条 `users` | 幂等 `getOrCreateUser` 会自愈：先把分散字段合并进首条（`stars` 相加）再删除多余文档，下次调用自动收敛 |
