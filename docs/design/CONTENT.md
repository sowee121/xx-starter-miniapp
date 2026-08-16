# 嘻嘻启蒙乐园 · 内容与视觉定稿（2026-08-17）

> 本文件与 [PLAN.md](./PLAN.md)、`docs/design/content/*.json`、`docs/design/h5/` 审查稿一致。  
> **已用户确认可作开发基准**；后续改内容先改本文件与 JSON，再重生成 H5。
> 工程实现以 `miniprogram/` 为准；样式须与 H5 **同批双向同步**（见仓库 `.cursor/rules/h5-miniapp-style-sync.mdc`）。

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

### 2.6 每日任务（自动流转）

每天固定 6 条（一模块一条），**自由学习，不限定当天必须学哪一首诗、哪个字、哪个单词或哪个拼音**；任意不同内容累计达到数量即可。

数量**每天首次打开时随机生成**，写入本地后当日不变：

| 任务 | 数量范围 | 完成条件 | 星星 |
| --- | --- | --- | --- |
| 读 N 首古诗 | 1～2 | 点读任意 N 首不同诗 | N+1 |
| 认 N 个汉字 | 1～5 | 点读任意 N 个不同汉字 | N |
| 做 N 道算术题 | 1～5 | 数一数/算一算累计答对 N 题 | N |
| 学 N 个单词 | 1～5 | 点读任意 N 个不同单词 | N |
| 读 N 个拼音 | 1～5 | 点读任意 N 个不同韵母 | N |
| 看一看日历 | 1（固定） | 打开日历页 | +1 |

任务页样式不变：勾选仅展示状态，点击行跳转学习；不可手动点勾完成。

实现：`miniprogram/utils/daily-tasks.js`（`SCHEMA` 变更会清空当日进度并重新抽数）。H5 审查页为固定示例日，非当日随机结果。

---

## 3. 视觉与素材定稿要点

- H5 审查目录：`docs/design/h5/index.html`（约 45 页静态帧）  
- 原子素材：`docs/design/atoms/`（一图一主体、透明底；去背用 `scripts/chroma_to_png.py`）  
- 列表媒体缩略图统一圆角；古诗封面统一为 4:3 横版黏土棚拍（左动物右诗意），禁止浮岛底座与旧图混用  
- 背景：草地贴底 + 天空渐变 + mask 淡出；夜景用独立 `meadow-night` + 夜色 token  

---

## 4. 工程对照路径

| 用途 | 路径 |
| --- | --- |
| 结构化题库（设计源） | `docs/design/content/{poems,hanzi,math,english,pinyin}.json` |
| H5 生成器 | `scripts/generate_h5_inner_pages.py` |
| 小程序古诗 | `miniprogram/subpkg/poem/content/poems.js`（6 首、无 plain） |
| 小程序识字 | `miniprogram/subpkg/hanzi/content/hanzi.js`（`poem` + `life`） |
| 小程序英语 / 拼音 | `subpkg/english/content/english.js`、`subpkg/pinyin/content/pinyin.js` |
| 每日任务 | `miniprogram/utils/daily-tasks.js` |
| 点读播放 | `miniprogram/utils/audio.js` |
| 云环境 ID | `miniprogram/config/cloud.js` → `CLOUD_ENV` |
| 云函数部署 | [`cloudfunctions/README.md`](../../cloudfunctions/README.md) |
| 申请素材 | `docs/apply/` |

重生成 H5：

```bash
python3 scripts/generate_h5_inner_pages.py
```
