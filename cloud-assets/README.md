# 运行时媒体（云存储）

与根目录 `README.md`「开发注意 · 云存储」配套。本目录是**上传源**；线上 FileID 由 `miniprogram/config/media.js` 拼成：

```
cloud://cloudbase-d7gygre2uc80dcd42.636c-cloudbase-d7gygre2uc80dcd42-1469407935/...
```

图片一律 **PNG**，不要放 webp——本地 webp 在真机不渲染（详见根 README「图片格式」）。

**免费套餐通常无法改存储权限**（只能创建者可读，CLI 报 `FreePackageDenied`），真机其他用户会看不到云图。因此默认 **`USE_CLOUD = false`**，继续用代码包本地路径。代码质量「图片音频合计 > 200K」可能未通过，属建议项，一般不拦上传。

环境 ID 须与 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`、以及 `package.json` 里 `assets:*` 的 `-e` 一致。换环境时三处一起改，并核对 `media.js` 的 `CLOUD_BUCKET`。

云**函数**部署见 [`../cloudfunctions/README.md`](../cloudfunctions/README.md)。

---

## 怎么选流程

| 场景 | 推荐 |
| --- | --- |
| 偶尔传几个文件、在控制台核对路径 | **手动** |
| 已 `tcb login`、日常批量同步 | **`npm run assets:upload`（tcb）** |
| 无 tcb 登录、与 `mp:upload` 同一套私钥 | **`npm run assets:ci-upload`（miniprogram-ci）** |
| 免费套餐、尚未能设「所有用户可读」 | 可上传备云，但保持 `USE_CLOUD = false` |

---

## 一、手动流程

1. 打开开发者工具 → **云开发 → 存储**
2. 按线上目录结构上传（与 `cloud-assets/static`、`cloud-assets/subpkg` 对应）
3. 在控制台确认 FileID / 路径与 `media.js` 拼接规则一致
4. **不要**在免费套餐下把 `USE_CLOUD` 改为 `true`

适合核对个别资源；大批量请用自动化。

---

## 二、自动化流程

在**仓库根目录**执行（不是本目录）。

### A. tcb（原路径）

```bash
npm install
npx tcb login          # 浏览器扫码；过期再执行
npm run assets:upload
```

实际执行：

```bash
npx tcb storage upload ./cloud-assets/static static -e cloudbase-d7gygre2uc80dcd42 --times 3
npx tcb storage upload ./cloud-assets/subpkg subpkg -e cloudbase-d7gygre2uc80dcd42 --times 3
```

### B. miniprogram-ci（与小程序/云函数 CI 同私钥）

```bash
# 需 secrets/private.<appid>.key（见 docs/ci-miniprogram.md）
npm run assets:ci-upload              # static + subpkg
node scripts/ci_upload_storage.js static
node scripts/ci_upload_storage.js subpkg
```

脚本：[`scripts/ci_upload_storage.js`](../scripts/ci_upload_storage.js) → `ci.cloud.uploadStorage`  
远端前缀仍为 `static/`、`subpkg/`，与 `media.js` 一致。

| 命令 | 鉴权 | 何时用 |
| --- | --- | --- |
| `assets:upload` | `tcb login` | 已有腾讯云登录态 |
| `assets:ci-upload` | 小程序代码上传私钥 | 无 tcb、或与 `mp:upload` / `cloud:ci-deploy` 一条链路 |

上传成功后：免费套餐下**保持** `USE_CLOUD = false`，不要 `purge`。

### 以后若开通可改权限的套餐

1. 云开发 → 存储 → 权限 →「所有用户可读，仅创建者可写」
2. `miniprogram/config/media.js` 的 `USE_CLOUD` 改为 `true`
3. `npm run assets:purge`（代码包媒体压到 <200KB）

### 命令一览

```bash
npm run assets:upload      # tcb：本目录 → 云存储
npm run assets:ci-upload   # miniprogram-ci：同上路径约定
npm run assets:purge       # 仅 USE_CLOUD=true 时使用
npm run assets:restore     # 从本目录拷回 miniprogram
```

### Agent 约定

- `assets:upload`：上传前确认已 `tcb login`；失败时提示用户扫码
- `assets:ci-upload`：确认私钥存在；失败时不要编造已上传成功
- 默认**不**改 `USE_CLOUD`、**不**执行 `assets:purge`，除非用户确认存储 ACL 已放开
- 与云函数部署分开：函数用 `cloud:deploy` / `cloud:ci-deploy`，媒体用本目录脚本
