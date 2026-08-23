# 嘻嘻启蒙乐园 · 内容与视觉定稿（2026-08-22）

> 本文件与 [PLAN.md](./PLAN.md)、`docs/design/content/*.json`、`docs/design/h5/` 审查稿一致。  
> **已用户确认可作开发基准**；后续改内容先改本文件与 JSON，再重生成 H5。
> 工程实现以 `miniprogram/` 为准；样式须与 H5 **同批双向同步**（见仓库 `.cursor/rules/h5-miniapp-style-sync.mdc`）。
> 2026-08-21 增量：拼音点读 TTS 合成文案锁定为「啊喔鹅衣乌迂」（见 §2.5）。
> 2026-08-22 增量：英语先进枢纽，再选字母表（26 大写点读）或单词 96（见 §2.4）。

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
- **整首诗**在封面大卡放圆形播放钮（`play-button` lg）：点卡或点钮播全文；播放中再点即停止（三角换成 `stop.png`）；点读单句会打断长播；中途停止不加星、不计任务
- **长播复位**：进页、离开、后退、回首页、微信切后台/关掉、来电等音频打断时一律停播，按钮回到播放三角；中途打断不加星

### 2.2 识字

| 类 | 数量 | 排序 | 展示 |
| --- | --- | --- | --- |
| 数字 / 颜色 / 动物 / 家人 / 身体 / 自然 / 方位 / 出行 | 各 12，共 96 | 分类按好认先学；类内按关联性 + 常见连读序（见 `hanzi.json`）；数字为一～十 + 百千 | 列表：上 emoji 下汉字；详情：系统 emoji + 积木大字 |

- 去掉「古诗里的字」分库；首页直达分类列表（对齐英语）
- 每字 2 个极简口语组词；详情用**系统 emoji** 表意，不强制逐字黏土大图
- 详情上下翻只在同类内

### 2.3 算术

| 玩法 | 题量 | 配图规则 |
| --- | --- | --- |
| 数一数 | 固定苹果图 + 1～10 数量 | 尽量每行数量相同：**1/2/3 单行，4=2×2，5=3+2（末行居中），6=3×2，7=4+3（末行居中），8=4×2，9=3×3，10=5×2**；选项升序；单图随数量缩放 |
| 算一算 | 每次随机加减（结果 1～10） | **固定** `dog.png`（狗拿算盘）；**选项升序**；题目数字每次随机 |

水果图：只用 `english-fruit-apple`（与英语分包同原子，算术包内只留这一张，避免 12 张水果重复占分包体积）

### 2.4 英语（字母表 + 96 词 · 八类各 12）

首页英语先进枢纽（对齐算术）：**字母表** / **单词**。拼音仍是独立板块（单韵母），不与英文字母表混入口。

#### 2.4.1 字母表（26 大写）

`A`–`Z`；一图一字母；详情仅 **黏土字母图 + 字母名音标 + 播放**，无例词、无句子。

- 点读念 **字母名**（A=/eɪ/，B=/biː/…），不是自然拼读音；音标体例跟词库英式 IPA 对齐（O `/əʊ/`、Z `/zed/`）
- 词图：纯黏土大写 `english-letter-{a…z}.png`，法式马卡龙色（草莓粉、柠檬、开心果等，26 色各不相同），透明底；与拼音草木/果色小写区分
- 详情切题用底栏左右黏土箭头（`arrow.png` 一图翻转），不做 26 格石子径
- **字母歌**：列表末张 `word-card is-song` 圆形播放钮；音频 `/subpkg/english-abc/static/audio/alphabet-song.mp3`；只播放，不加星、不计每日任务条数；播放中再点即停止并恢复三角；离开页面或小程序中断时同样停播并复位按钮
- TTS：`en-US-AnaNeural` 念字母名；Z 合成文案为 `zed`（勿喂中文 TTS）。重生成：`python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --only alphabet`
- 字母表页、字母图、字母音频同在分包 `english-abc`（微信不允许跨分包引用图片）；枢纽 A 图放在 `english` 包内

#### 2.4.2 单词（96 词 · 八类各 12）

数字 · 颜色 · 动物 · 身体 · 水果 · 食物 · 自然 · 交通；一词一句；词/句双点读；详情展示中文释义；专用黏土词图（可复用既有动物/手等原子）

- **词图命名**：一律 `english-{分类}-{名称}`，分类取题库 id（`number/color/animal/body/fruit/food/nature/transport`）。字母表为 `english-letter-{a…z}`。同词异义靠分类区分：颜色 `english-color-orange`，水果 `english-fruit-orange`
- **排序**：分类序与识字同原则（好认先学），固定为上列；类内按英文单词 A–Z 落盘（**数字类例外**：按 one→nine 后接 ten / hundred / thousand）；列表与详情 trail 直接遍历，不再二次排序
- 水果 `orange`（橙子）与颜色 `orange`（橙色）同形异义，两类各保留一处；颜色词音频文件名为 `orange-color.mp3`，详情用 `?word=&cat=` 区分
- **数字**：`one`…`nine`、`ten`、`hundred`、`thousand`；词图为纯黏土阿拉伯数字 `english-number-{one…nine,ten,hundred,thousand}.png`（十/百/千画 10 / 100 / 1000）；媒体在 `english-more`
- **媒体分包**（单包 ≤2MB）：`english`（水果/动物/颜色 + 枢纽 A 图）· `english-extra`（身体/交通）· `english-more`（数字/食物/自然）· `english-abc`（字母表页 + 字母图 + 字母音频 + 字母歌）
- **共享 UI**：`praise-sun` / `media-card` / 播放钮等放主包 `components/`（勿再放 `subpkg/common`，避免跨分包组件未加载）
- **页面背景**：天空用 token 渐变；底部用定稿草地裁切后的 JPEG（`meadow.jpg`）。夜景用 CSS 压暗 + 蓝紫罩，不再另出夜景草地


### 2.5 拼音（仅 6 单韵母）

`a o e i u ü` → `atoms/pinyin-{a,o,e,i,u,umlaut-u}.png`  

- **纯黏土字母**，马卡龙草木/果陶（a开心果、o青柠、e芒果、i天蓝、u蓝莓紫、ü覆盆子）、透明底；**不用**动物拿字卡
- 详情展示单韵母 **发音音标**（a `/ɑ/`、o `/o/`、e `/ɤ/`、i `/i/`、u `/u/`、ü `/y/`）  
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

每次完整学习立即奖励 **1 颗星星**：算术答对一题、单字点读播完、单词点读播完、字母名点读播完、单韵母点读播完、整首古诗全文音频播完。逐句古诗、组词、英语句子和字母歌点读不单独发星。

点读详情（古诗 / 识字 / 英语 / 拼音）**同一次进入该页只发 1 星**，反复点读同一内容不再加星；退出后再进可再发 1 星。算术仍是**每答对一题 +1**，与是否换题、是否停留在同一页无关。

单次奖励在播放结束或答对后先更新本地展示，再异步写入云端，不阻塞页面；与每日任务首次完成时发放的任务奖励相互独立。

实现：`miniprogram/utils/read-award.js`（`playPrimaryAndAward` / `playPreview`）+ `stars.awardVisitStar`。

### 2.7 每日任务（自动流转）

每天固定 6 条（一模块一条），**自由学习，不限定当天必须学哪一首诗、哪个字、哪个字母或单词、哪个拼音**；任意不同内容累计达到数量即可。**点读类任务以主点读音频完整播放完成计**（古诗=全文朗读；识字=单字；英语=字母名或单词，点任务进枢纽；拼音=韵母）；逐句/组词/句子/字母歌点读不计进度。

数量**每天首次打开时随机生成**，写入本地后当日不变：

| 任务 | 数量范围 | 完成条件 | 星星 |
| --- | --- | --- | --- |
| 读 N 首古诗 | 1～2 | 听完整首不同诗（全文音频播完） | N+1 |
| 认 N 个汉字 | 1～5 | 单字点读播完任意 N 个不同汉字 | N |
| 做 N 道算术题 | 1～5 | 数一数/算一算累计答对 N 题 | N |
| 学 N 个英语 | 1～5 | 字母名或单词点读播完任意 N 个不同条目（字母歌不计） | N |
| 读 N 个拼音 | 1～5 | 韵母点读播完任意 N 个不同韵母 | N |
| 日历打卡 | 1（固定） | 日历页点击「打卡」，每天一次 | +1 |

任务页样式不变：勾选仅展示状态，点击行跳转学习；不可手动点勾完成。任务奖励用固定 `clientId`：`daily-${date}-${taskId}`，与单次学习加星幂等互不覆盖。

实现：`miniprogram/utils/daily-tasks.js`（当前 `SCHEMA = 8`；变更会清空当日进度并重新抽数）。H5 审查页为固定示例日，非当日随机结果。任务名统一「学 N 个英语」；点任务进枢纽，字母表与单词都可完成该条。

### 2.8 反馈与音效

| 场景 | 形态 | 说明 |
| --- | --- | --- |
| 每日任务首次完成发星 | 弹层 `praise-sun` | 文案「宝贝真棒」+ 任务名；按钮「继续学」（日历打卡用「好的」）；禁 Toast |
| 贴纸兑换成功 / 失败 | 同弹层，`exchange` / `softFail` 变体 | 成功按钮「收下啦」，失败「再看看」；失败语气仍温柔正向 |
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

- H5 审查目录：`docs/design/h5/index.html`（约 **21** 页静态帧；反馈合页、日历合页、拼音详情合页，不再拆多状态散页）
- 原子素材：`docs/design/atoms/`（一图一主体、透明底；去背用 `scripts/chroma_to_png.py`）
- **素材纪律**（详见 PLAN §2.1.2、`.cursor/rules/image-asset-generation.mdc`）：
  - 能 CSS 解决的不生图；定稿原子默认只读；未明确要求禁止调生图工具
  - 必须生图时先按 **`frontend-design`** skill，再原子→去背→归档→合成
  - **播放钮**：绿底 `--btn-play` + 鼓边 `--shadow-play` + 奶油小三角 `play.png`；禁止整钮合成图；三角原子铺满画布，绿钮内默认 `translateX(4)`、小钮 `translateX(2)` 做 ▶ 视觉居中
  - **长播停止**：古诗封面圆钮与字母歌卡片播放中换成奶油黏土方块 `stop.png`（同材质同体量）；停止、播完、离开页面或小程序中断后都恢复三角
- 列表媒体缩略图统一 **`--radius-thumb: 28`**（与卡内插图同档）；古诗封面统一为 4:3 横版黏土棚拍（左动物右诗意），禁止浮岛底座与旧图混用
- 背景：天空渐变 + 底部黏土草地实图（`meadow-hill`）；夜景用 CSS 罩层，不另出图
- 设计 token：`docs/design/h5/css/tokens.css` ↔ `miniprogram/styles/tokens.wxss`（1px = 1rpx）
  - 字号下限 `--font-nav: 28`（亦用于导航）；正文默认 `--font-body: 34`；禁用态 `--opacity-disabled: 0.68`
  - 答题选中 `--tone-picked` / `--ring-picked`（蜜黄高亮）；答对 `--tone-ok` / `--ring-ok`（叶绿）
  - **鹅卵石面**：普通圆弧，不用 squircle。`--radius-card: 56` 大卡（首页全部卡片、通栏、详情）；`--radius-tile: 48` 内页小卡片（字卡/双卡/任务行）；`--radius-bar: 40` 矮条；`--radius-thumb: 28` 卡内图（`≈ card − pad-card`）；鼓边 `--shadow-clay*`；石子径 `--trail-*` / `--shadow-trail*`；通用切题导航 `trail-nav`（见 PLAN §2.1.1）
  - 胶囊 **`--radius-pill: 999`**（chip、星条、气泡）
- 热区：默认 ≥ **152rpx**，紧凑点读 `--tap-min-compact`（128rpx）；导航回首页 / chip / 家长槽等见 PLAN §2.2 例外
- 反馈弹层 `praise-sun` 允许（非营销弹窗）；禁 Toast
- 字体：H5 首页可用 Yuanti；小程序 PingFang（平台差，非 sync bug）
- 详情主卡（拼音/英语/识字 `.detail-big`）：卡内 `justify-content: center` + `gap`；主图 / 字母图按 H5；**padding 不动**；页底草地留白保留；古诗 hero 4:3 不动

---

## 4. 工程对照路径

| 用途 | 路径 |
| --- | --- |
| 结构化题库（设计源） | `docs/design/content/{poems,hanzi,math,english,alphabet,pinyin}.json` |
| H5 生成器 | `scripts/generate_h5_inner_pages.py` |
| 设计 token | `docs/design/h5/css/tokens.css`、`miniprogram/styles/tokens.wxss` |
| 小程序古诗 | `miniprogram/subpkg/poem/content/poems.js`（6 首、无 plain） |
| 小程序识字 | `miniprogram/subpkg/hanzi/content/hanzi.js`（`categories` 八类） |
| 小程序英语 | 枢纽 `subpkg/english/hub/`；单词 `subpkg/english/content/english.js`；字母表 `subpkg/english-abc/`（页 + `content/alphabet.js` + 图/音频） |
| 小程序拼音 | `subpkg/pinyin/content/pinyin.js` |
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
