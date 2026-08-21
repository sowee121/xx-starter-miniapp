# 嘻嘻启蒙乐园 · 内容与视觉定稿（2026-08-21）

> 本文件与 [PLAN.md](./PLAN.md)、`docs/design/content/*.json`、`docs/design/h5/` 审查稿一致。  
> **已用户确认可作开发基准**；后续改内容先改本文件与 JSON，再重生成 H5。
> 工程实现以 `miniprogram/` 为准；样式须与 H5 **同批双向同步**（见仓库 `.cursor/rules/h5-miniapp-style-sync.mdc`）。
> 2026-08-21 增量：拼音点读 TTS 合成文案锁定为「啊喔鹅衣乌迂」（见 §2.5）。

---

## 1. 命名

| 用途 | 名称 |
| --- | --- |
| 页内 / 产品内部 | 嘻嘻启蒙乐园 |
| 微信后台创建 / 搜索展示 | 嘻宝星屋 |
| 申请简介 | 见 `docs/apply/miniprogram-intro.md` |
| 服务类目 | 工具 → 信息查询 |

---

## 2. 题库定稿

内容源：`docs/design/content/`。拼音**仅单韵母**，不加声母/拼读。

### 2.1 古诗（6 首 · 无白话字段）

`yong-e` 咏鹅 · `jing-ye-si` 静夜思 · `min-nong` 悯农 · `chun-xiao` 春晓 · `deng-guan-que-lou` 登鹳雀楼 · `wang-lu-shan-pu-bu` 望庐山瀑布  

- 逐句点读 + 全文朗读；**六首统一 4 行**（一句一行）；数据与 UI **均无 `plain` 白话**  
- 封面：`atoms/poem-*.png`（统一 4:3 横版黏土场景；6 首 6 动物：鹅/猫/牛/鸟/狐狸/熊猫；不用浮岛）

### 2.2 识字

| 库 | 数量 | 排序 | 展示 |
| --- | --- | --- | --- |
| 古诗库 | 21 | 笔画升序，同笔画按拼音 | 积木字卡 |
| 生活库 | 30 | **一～十数值序在前**；其后：人→大小→口手心目耳→妈爸→上下门→山木火云石田→车；**无「鱼」** | 积木字卡 |

- 每字 2 个极简组词；详情用**系统 emoji** 表意（约 84px），不强制逐字黏土大图  
- 分库入口：`hanzi-hub-poem.png`（兔+书）、`hanzi-hub-life.png`（猫+「人」字卡）

### 2.3 算术

| 玩法 | 题量 | 配图规则 |
| --- | --- | --- |
| 数一数 | 每次随机水果 + 1～10 数量 | 每行列数 = 10 的约数中 ≤ 数量的最大者（**3=2+1，4=2+2，7=5+2，10=5+5**）；选项升序；单图随数量缩放 |
| 算一算 | 每次随机加减（结果 1～5） | **固定** `dog.png`（狗拿算盘）；**选项升序**；题目数字每次随机 |

水果池：`apple-english` / `banana-english` / `orange-english` / `grape-english`

### 2.4 英语（20 词 · 五类各 4）

水果 · 动物 · 颜色 · 身体 · 交通；一词一句；词/句双点读；专用黏土词图（可复用既有动物/手等原子）

### 2.5 拼音（仅 6 单韵母）

`a o e i u ü` → `atoms/pinyin-{a,o,e,i,u,umlaut-u}.png`  

- **纯黏土字母**，鼠尾草绿、透明底；**不用**动物拿字卡  
- 无声母、无复韵母、无拼读  
- 点读音频：`miniprogram/subpkg/pinyin/static/audio/{letter}.mp3`（`ü` → `umlaut-u.mp3`）  
- **合成规则**（`generate_audio.py` 的 `PINYIN_SPEAK`）：中文 TTS **禁止**直接喂拉丁字母（易念成英文字母名）；按小学单韵母读法用同韵母汉字：

| 字母 | 合成文案 | 音频文件 |
| --- | --- | --- |
| a | 啊 | `a.mp3` |
| o | 喔 | `o.mp3` |
| e | 鹅 | `e.mp3` |
| i | 衣 | `i.mp3` |
| u | 乌 | `u.mp3` |
| ü | 迂 | `umlaut-u.mp3` |

重生成：`python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --force --only pinyin`

### 2.6 单次学习奖励

每次完整学习立即奖励 **1 颗星星**：算术答对一题、单字点读播完、单词点读播完、单韵母点读播完、整首古诗全文音频播完。逐句古诗、组词和英语句子点读不单独发星。

点读详情（古诗 / 识字 / 英语 / 拼音）**同一次进入该页只发 1 星**，反复点读同一内容不再加星；退出后再进可再发 1 星。算术仍是**每答对一题 +1**，与是否换题、是否停留在同一页无关。

单次奖励在播放结束或答对后先更新本地展示，再异步写入云端，不阻塞页面；与每日任务首次完成时发放的任务奖励相互独立。

实现：`miniprogram/utils/read-award.js`（`playPrimaryAndAward` / `playPreview`）+ `stars.awardVisitStar`。

### 2.7 每日任务（自动流转）

每天固定 6 条（一模块一条），**自由学习，不限定当天必须学哪一首诗、哪个字、哪个单词或哪个拼音**；任意不同内容累计达到数量即可。**点读类任务以主点读音频完整播放完成计**（古诗=全文朗读；识字=单字；英语=单词；拼音=韵母）；逐句/组词/句子点读不计进度。

数量**每天首次打开时随机生成**，写入本地后当日不变：

| 任务 | 数量范围 | 完成条件 | 星星 |
| --- | --- | --- | --- |
| 读 N 首古诗 | 1～2 | 听完整首不同诗（全文音频播完） | N+1 |
| 认 N 个汉字 | 1～5 | 单字点读播完任意 N 个不同汉字 | N |
| 做 N 道算术题 | 1～5 | 数一数/算一算累计答对 N 题 | N |
| 学 N 个单词 | 1～5 | 单词点读播完任意 N 个不同单词 | N |
| 读 N 个拼音 | 1～5 | 韵母点读播完任意 N 个不同韵母 | N |
| 日历打卡 | 1（固定） | 日历页点击「打卡」，每天一次 | +1 |

任务页样式不变：勾选仅展示状态，点击行跳转学习；不可手动点勾完成。任务奖励用固定 `clientId`：`daily-${date}-${taskId}`，与单次学习加星幂等互不覆盖。

实现：`miniprogram/utils/daily-tasks.js`（当前 `SCHEMA = 5`；变更会清空当日进度并重新抽数）。H5 审查页为固定示例日，非当日随机结果。

### 2.8 反馈与音效

| 场景 | 形态 | 说明 |
| --- | --- | --- |
| 每日任务首次完成发星 | 弹层 `praise-sun` | 文案「宝贝真棒」+ 任务名；禁 Toast |
| 贴纸兑换成功 / 失败 | 同弹层，`exchange` / `softFail` 变体 | 失败语气仍温柔正向 |
| 算术答对 / 再试 | 行内 `soft-note` + 音效 | `answer-correct.mp3` / `answer-wrong.mp3` |
| 点读音频缺失 | 行内 soft-note | 「语音准备中～」 |

文案与音频入口：`miniprogram/content/feedback.js`；编排：`miniprogram/utils/feedback.js`。H5 审查：`docs/design/h5/shared/feedback.html`。

### 2.9 家长区（非学习模块）

从首页欢迎卡进入。提供：

1. **音量**：静音 / 小 / 大，预览音 `volume-preview.mp3`；提示「调节点读和答题音量大小」
2. **清除**（长按 3 秒，文案统一用「清除」）：学习记录、星星积分、已兑换贴纸（不可恢复）

幼儿学习流程仍**只增星、不扣分**；清除仅家长主动触发，走云函数 `resetProfile`。

---

## 3. 视觉与素材定稿要点

- H5 审查目录：`docs/design/h5/index.html`（约 **20** 页静态帧；反馈合页、日历合页、拼音详情合页，不再拆多状态散页）
- 原子素材：`docs/design/atoms/`（一图一主体、透明底；去背用 `scripts/chroma_to_png.py`）
- 列表媒体缩略图统一圆角；古诗封面统一为 4:3 横版黏土棚拍（左动物右诗意），禁止浮岛底座与旧图混用
- 背景：草地贴底 + 天空渐变 + mask 淡出；夜景用独立 `meadow-night` + 夜色 token
- 设计 token：`docs/design/h5/css/tokens.css` ↔ `miniprogram/styles/tokens.wxss`（1px = 1rpx）；正文字号最小 `--font-nav: 28px/28rpx`；禁用态透明度 `--opacity-disabled: 0.68`
- 热区：默认 ≥ **152rpx**，紧凑点读钮可用 `--tap-min-compact`（128rpx）

---

## 4. 工程对照路径

| 用途 | 路径 |
| --- | --- |
| 结构化题库（设计源） | `docs/design/content/{poems,hanzi,math,english,pinyin}.json` |
| H5 生成器 | `scripts/generate_h5_inner_pages.py` |
| 设计 token | `docs/design/h5/css/tokens.css`、`miniprogram/styles/tokens.wxss` |
| 小程序古诗 | `miniprogram/subpkg/poem/content/poems.js`（6 首、无 plain） |
| 小程序识字 | `miniprogram/subpkg/hanzi/content/hanzi.js`（`poem` + `life`） |
| 小程序英语 / 拼音 | `subpkg/english/content/english.js`、`subpkg/pinyin/content/pinyin.js` |
| 点读 TTS 批量 | `.cursor/skills/edge-tts-batch/`（拼音 `PINYIN_SPEAK`：啊喔鹅衣乌迂） |
| 每日任务 | `miniprogram/utils/daily-tasks.js` |
| 点读播放 | `miniprogram/utils/audio.js` |
| 主点读发星 | `miniprogram/utils/read-award.js` |
| 反馈弹层 / 行内 | `miniprogram/utils/feedback.js`、`components/praise-sun`、`components/play-button` |
| 家长区 | `miniprogram/pages/parent/` |
| 云环境 ID | `miniprogram/config/cloud.js` → `CLOUD_ENV` |
| 云函数部署 | [`cloudfunctions/README.md`](../../cloudfunctions/README.md) |
| 申请素材 | `docs/apply/` |

重生成 H5：

```bash
python3 scripts/generate_h5_inner_pages.py
```
