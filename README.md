# 嘻嘻的启蒙乐园

面向 **2 岁半零基础低幼** 的微信原生小程序（WXML / WXSS / JS）。微信后台展示名：**嘻宝星屋**。

晨间草地柔光 + 全站黏土软萌素材，超大热区、低饱和护眼。学习只增星、不扣分，无负面反馈、无广告/付费弹窗。

### 功能特色

| 板块 | 亮点 |
| --- | --- |
| 古诗 | 6 首入门诗；逐句点读 + 全文朗读；4:3 黏土场景封面 |
| 识字 | 古诗库 21 + 生活库 30；点读与组词；emoji 辅助表意 |
| 算术 | 「数一数」水果拼接、「算一算」1～5 加减；只选对错温柔鼓励 |
| 英语 | 20 词（水果/动物/颜色/身体/交通）+ 超短句；词句双点读 |
| 拼音 | 仅单韵母 a o e i u ü；纯黏土字母点读 |
| 日历 | 日期、星期、昼夜场景 |
| 每日任务 | 六模块自由累计；数量每天随机；完成自动攒星 |
| 积分商城 | 星星兑换黏土动物贴纸（无勋章） |

题库与视觉定稿见 [`docs/design/CONTENT.md`](docs/design/CONTENT.md)，分期规划见 [`docs/design/PLAN.md`](docs/design/PLAN.md)。

## 本地预览

1. 用微信开发者工具「导入项目」，选择**本仓库根目录**（不是 `miniprogram/`）
2. 填入正式 AppID（测试号不可用云开发 / 体验版）
3. 开通云开发免费体验环境，等待约 10 分钟后，把环境 ID 填进 `miniprogram/config/cloud.js` 的 `CLOUD_ENV`
4. 将本地云函数绑定同一环境并上传（见下方「云函数」与 [`cloudfunctions/README.md`](cloudfunctions/README.md)）
5. 首次预览前建议清缓存再编译

## 图片格式（重要）

**代码包内禁止使用 webp。** 小程序本地 webp 在真机（尤其 iOS）不渲染，`image` 的 `webp` 属性只对网络图生效；而开发者工具用 Chromium，模拟器一切正常，非常容易漏测——表现是真机所有图空白且无报错。

- 包内图片统一 **PNG**（256 色自适应调色板，保留透明），体积与原 webp 基本持平。
- `npm test` 会拦截包内 webp 文件和代码里残留的 `.webp` 引用。
- 新素材从 `docs/design/atoms/` 走 `scripts/chroma_to_png.py` + `scripts/normalize_atoms.py`，产出即为 PNG。

另外，图片路径多经 `mediaUrl(\`/static/...\`)` 拼接，静态分析认不出引用，因此详情 → 本地设置里的 **「忽略未使用的文件」必须关闭**（本仓库已置 `ignoreDevUnusedFiles: false`），否则预览包会漏打静态资源。

## 点读音频（真机）

播放统一走 `miniprogram/utils/audio.js`（`InnerAudioContext` 单例）。

真机无声、开发者工具正常时，优先核对：

1. 启动时已调 `wx.setInnerAudioOption({ obeyMuteSwitch: false })`（实例上的 `obeyMuteSwitch` 自基础库 2.3.0 起无效；`app.js` 会调用）
2. 识字等**中文文件名**路径已 `encodeURI`（iOS 必需）
3. 家长区音量未被调成 0

批量生成 TTS：见 [`.cursor/skills/edge-tts-batch/SKILL.md`](.cursor/skills/edge-tts-batch/SKILL.md)。

## 云存储与代码质量（注意事项）

微信代码质量有一条建议：**代码包内全部图片+音频合计 &lt; 200KB**（不是单文件限制）。完整媒体约 2MB，要过这项通常需把大图放到云存储，再用 `cloud://` 引用。

当前策略（免费套餐限制）：

- 媒体源副本在 `cloud-assets/`，可用下方「自动上传」步骤传到云环境（已上传过可跳过）。
- **免费云环境往往无法把存储权限改成「所有用户可读」**（控制台/CLI 都会被拒，报错如 `FreePackageDenied`）。权限若是「仅创建者可读写」，则只有上传者账号能看到云图，其他微信号会空白。
- 因此 `miniprogram/config/media.js` 里默认 **`USE_CLOUD = false`**，图片继续走代码包本地路径，保证预览和真机正常。
- 代码质量里「图片和音频 &gt; 200K」可能显示未通过——这是**建议项，一般不拦上传**；主包体积、以及「主包勿夹带仅分包使用的 JS」等项仍应保持通过。

以后若套餐允许改权限：

1. 云开发 → 存储 → 权限 → 设为「所有用户可读，仅创建者可写」
2. 将 `USE_CLOUD` 改为 `true`
3. 执行 `npm run assets:purge`（代码包只留壳层小图，合计约 &lt;40KB）

更多细节见 `cloud-assets/README.md`。

### 自动上传到云存储

仓库已配置 `@cloudbase/cli` 与 `npm run assets:upload`，可把 `cloud-assets/` 批量传到当前云环境。

1. 在项目根目录安装依赖（只需一次）：

```bash
npm install
```

2. 登录腾讯云 / 云开发（浏览器扫码，只需一次；过期再登）：

```bash
npx tcb login
```

3. 确认环境 ID 与脚本一致：
   - `miniprogram/config/cloud.js` → `CLOUD_ENV`
   - `package.json` → `assets:upload` 里的 `-e …`
   - 当前环境：`cloudbase-d7gygre2uc80dcd42`

4. 一键上传（`static/` + `subpkg/`，覆盖同名文件）：

```bash
npm run assets:upload
```

等价于：

```bash
npx tcb storage upload ./cloud-assets/static static -e cloudbase-d7gygre2uc80dcd42 --times 3
npx tcb storage upload ./cloud-assets/subpkg subpkg -e cloudbase-d7gygre2uc80dcd42 --times 3
```

5. 上传成功后：**不要**立刻 `purge`，除非已能改存储 ACL 且已把 `USE_CLOUD` 设为 `true`。免费套餐下保持本地路径即可。

换环境或换桶时：同步改 `CLOUD_ENV`、`media.js` 里的 `CLOUD_BUCKET`，以及 `assets:upload` 的 `-e`。

相关命令：`assets:upload` / `assets:purge` / `assets:restore`。

## 云函数：创建与部署

本地 `cloudfunctions/` 不会自动出现在云端。控制台列表为空时，需在开发者工具里：

1. 右键 **`cloudfunctions` 根目录** → 选择当前云环境（与 `CLOUD_ENV` 一致）
2. 对各函数右键 → **上传并部署：云端安装依赖**

完整步骤、自检与常见报错见 **[`cloudfunctions/README.md`](cloudfunctions/README.md)**。

积分相关：`utils/stars.js` 会调 `addStars` / `getProfile`；**失败时写本地并入队**，所以云函数未部署时界面仍可能涨星——不代表云端已通。

## 目录

- `miniprogram/` — 小程序前端
- `cloudfunctions/` — 云函数（源码 + [部署说明](cloudfunctions/README.md)）
- `cloud-assets/` — 运行时媒体上传源（与云存储对应）
- `docs/design/` — [CONTENT.md](docs/design/CONTENT.md) 题库定稿、[PLAN.md](docs/design/PLAN.md)、H5 审查稿、atoms
- `.cursor/skills/edge-tts-batch/` — 点读音频批量生成

## 当前阶段

| 范围 | 状态 |
| --- | --- |
| 壳层 / 八大板块业务页 / 点读 TTS | 已落地（见 CONTENT + H5） |
| 每日任务 | 六条自由累计；数量每天随机（古诗 1～2，其余学习 1～5） |
| 云存储图片 | `USE_CLOUD = false`（免费套餐 ACL 限制） |
| 云函数 | 源码就绪；须在工具内绑定环境并上传后才可云端访问 |
| 云端为唯一数据源 | 未闭环（仍有本地兜底） |

设计与分期细节见 [`docs/design/PLAN.md`](docs/design/PLAN.md)。
