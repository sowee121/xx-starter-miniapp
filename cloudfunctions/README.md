# 云函数：本地创建与部署

仓库里的 `cloudfunctions/` **只是本地源码**。云开发控制台列表为空时，说明还没上传到云端，小程序调用会失败（积分等会走本地兜底，表面不易察觉）。

当前环境 ID（须三处一致）：

| 位置 | 字段 / 参数 |
| --- | --- |
| `miniprogram/config/cloud.js` | `CLOUD_ENV` |
| `project.config.json` | `cloudfunctionRoot: "cloudfunctions/"` |
| 开发者工具里绑定的「当前环境」 | 与上面同一 envId |

当前 envId：`cloudbase-d7gygre2uc80dcd42`

已有函数：`login`、`getProfile`、`addStars`、`checkinTask`、`completeProgress`、`exchangeReward`

---

## 1. 前置条件

1. 用**正式 AppID** 导入本仓库**根目录**（不是 `miniprogram/`）
2. 顶部打开 **云开发**，确认已开通环境（新建后约等 10 分钟）
3. 把环境 ID 写入 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`
4. `project.config.json` 已声明 `"cloudfunctionRoot": "cloudfunctions/"`（本仓库已配好）

---

## 2. 在编辑器里绑定云环境（必做）

上传前必须先给**云函数根目录**选环境，否则会报：

> 请在编辑器云函数根目录（cloudfunctionRoot）选择一个云环境

操作：

1. 左侧文件树点中 **`cloudfunctions` 文件夹本身**（不要点里面的 `login` 等子目录）
2. **右键** → **当前环境** / **切换环境** / **选择环境**
3. 选与 `CLOUD_ENV` 相同的环境（如 `cloudbase-d7gygre2uc80dcd42`）
4. 选好后，该目录图标通常会变成云朵样式

若右键没有「当前环境」：先点工具栏 **云开发** 进一次控制台，再重试；或 **项目 → 重新打开**。

---

## 3. 部署已有云函数（上传）

对每个函数目录（如 `cloudfunctions/login`）分别：

1. **右键**该目录  
2. 选 **上传并部署：云端安装依赖**（推荐；本仓库函数依赖 `wx-server-sdk`，且本地一般没有 `node_modules`）  
3. 等待成功提示  

六个都传完后，打开 **云开发 → 云函数**，列表应出现对应名称。

修改某个函数后，只需对该函数再执行一次「上传并部署」。

---

## 4. 新建云函数（可选）

1. 确认已完成第 2 步（根目录已绑环境）  
2. 右键 **`cloudfunctions`** → **新建 Node.js 云函数** → 输入名称  
3. 工具会在本地建目录，并在云端创建同名空函数  
4. 编辑 `index.js` / `package.json` 后，再按第 3 步上传部署  

也可只在本地新建文件夹 + `index.js` + `package.json`，再右键上传（云端没有时会一并创建）。

---

## 5. 部署后自检

开发者工具调试器 Console：

```js
wx.cloud.callFunction({ name: 'getProfile' }).then(console.log).catch(console.error)
```

- 返回里有业务结果（如 `ok: true`）→ 通  
- `FUNCTION_NOT_FOUND` → 未部署或环境绑错  
- `cloud init error` / `invalid scope` → 环境未就绪或 `CLOUD_ENV` 填错  

也可在控制台对单个函数点 **云端测试**。

---

## 6. 命令行部署（可选）

需微信开发者工具已开启 **设置 → 安全设置 → 服务端口**，且工具保持打开。

```bash
CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
PROJ="/Users/ww/Projects/Miniprogram/xx-starter-miniapp"   # 按本机路径改
ENV="cloudbase-d7gygre2uc80dcd42"

"$CLI" cloud functions deploy \
  --project "$PROJ" \
  --env "$ENV" \
  --names login getProfile addStars checkinTask completeProgress exchangeReward \
  --remote-npm-install \
  --lang zh
```

日常更推荐第 3 步图形界面上传。

---

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 控制台云函数列表为空 | 本地有代码但未上传，走第 2～3 步 |
| 「请在 … 选择一个云环境」 | 对 **`cloudfunctions` 根目录**右键选环境，不要对子函数目录选 |
| 上传成功但小程序仍调不通 | 核对 `CLOUD_ENV`、工具「当前环境」、控制台是否同一 env |
| 积分仍能涨 | `utils/stars.js` 失败会写本地；不代表云函数已通 |

云**存储**图片上传见仓库根 `README.md`「云存储与代码质量」与 `cloud-assets/README.md`，与云函数部署是两回事。
