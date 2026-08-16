# 运行时媒体

与根目录 `README.md`「云存储与代码质量」一节配套。本目录是**上传源**；线上 FileID 由 `miniprogram/config/media.js` 拼成：

图片一律 **PNG**，不要放 webp——本地 webp 在真机不渲染（详见根 README「图片格式」）。

`cloud://cloudbase-d7gygre2uc80dcd42.636c-cloudbase-d7gygre2uc80dcd42-1469407935/...`

**免费套餐通常无法改存储权限**（只能创建者可读，CLI 报 `FreePackageDenied`），真机其他用户会看不到云图。因此默认 **`USE_CLOUD = false`**，继续用代码包本地路径。代码质量「图片音频合计 &gt; 200K」可能未通过，属建议项，一般不拦上传。

## 自动上传步骤

在**仓库根目录**执行（不是本目录）：

```bash
# 1. 安装 CLI（只需一次）
npm install

# 2. 登录（浏览器扫码；过期再执行）
npx tcb login

# 3. 上传 static + subpkg 到云环境
npm run assets:upload
```

`assets:upload` 会执行：

```bash
npx tcb storage upload ./cloud-assets/static static -e cloudbase-d7gygre2uc80dcd42 --times 3
npx tcb storage upload ./cloud-assets/subpkg subpkg -e cloudbase-d7gygre2uc80dcd42 --times 3
```

环境 ID 须与 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`、以及 `package.json` 脚本里的 `-e` 一致。换环境时三处一起改，并核对 `media.js` 的 `CLOUD_BUCKET`。

上传成功后：免费套餐下**保持** `USE_CLOUD = false`，不要 `purge`；仅当能设「所有用户可读」后再切云路径。

## 以后若开通可改权限的套餐

1. 云开发 → 存储 → 权限 →「所有用户可读，仅创建者可写」
2. 把 `miniprogram/config/media.js` 的 `USE_CLOUD` 改为 `true`
3. `npm run assets:purge`（代码包媒体压到 &lt;200KB）

## 命令一览

```bash
npm run assets:upload   # 本目录 → 云存储（需先 tcb login）
npm run assets:purge    # 仅 USE_CLOUD=true 时使用
npm run assets:restore  # 从本目录拷回 miniprogram
```
