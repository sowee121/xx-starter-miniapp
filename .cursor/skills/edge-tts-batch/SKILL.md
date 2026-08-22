---
name: edge-tts-batch
description: >-
  Batch-generate point-read MP3 audio for 嘻嘻启蒙乐园 with edge-tts, writing into
  per-subpackage static dirs so each WeChat subpackage stays under 2MB. Use when
  generating TTS audio, batch exporting MP3, updating poem/hanzi/english/pinyin
  audio, or when the user mentions edge-tts, 点读, 批量导出, or 语音合成.
---

# edge-tts 批量导出点读音频

为「嘻嘻启蒙乐园」微信原生小程序生成点读 MP3。音频**按分包输出**，避免堆进主包撑爆 2MB 限制。

内容文件是 `content/*.js`，格式为 `module.exports = <严格 JSON>`——原生小程序的模块解析器会给 `require` 的路径追加 `.js` 后缀，无法可靠加载裸 `.json` 文件。脚本会剥掉这层包装当 JSON 处理，写回时再套上。

## 前置条件

```bash
python3 -m pip install -r .cursor/skills/edge-tts-batch/scripts/requirements.txt
```

音色与语速（在 `scripts/generate_audio.py` 顶部常量可改）：

| 项 | 值 |
|----|-----|
| 中文 | `zh-CN-XiaoxiaoNeural` |
| 英文 | `en-US-AnaNeural` |
| 语速 | `-10%`（低幼放慢） |

## 执行

```bash
# 生成缺失音频
python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py

# 全部重生成
python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --force

# 只处理某些模块（名称与脚本 MODULES 键一致）
python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --only poems
python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --only hanzi,english
python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --force --only pinyin
python3 .cursor/skills/edge-tts-batch/scripts/generate_audio.py --only alphabet
```

脚本结束会打印各模块音频体积与预算对比。

## 模块与路径映射

| 模块 | 内容文件 | 音频输出 | 运行时前缀 |
|------|---------|----------|-----------|
| `poems` | `miniprogram/subpkg/poem/content/poems.js` | `miniprogram/subpkg/poem/static/audio/` | `/subpkg/poem/static/audio` |
| `hanzi` | `miniprogram/subpkg/hanzi/content/hanzi.js`（`categories[].items`） | 同分包 `static/audio/` | `/subpkg/hanzi/static/audio` |
| `english` | `miniprogram/subpkg/english/content/english.js`（`categories[].items`） | 同分包 `static/audio/` | `/subpkg/english/static/audio` |
| `pinyin` | `miniprogram/subpkg/pinyin/content/pinyin.js`（`vowels`） | 同分包 `static/audio/` | `/subpkg/pinyin/static/audio` |
| `alphabet` | `miniprogram/subpkg/english-abc/content/alphabet.js`（`letters`） | `miniprogram/subpkg/english-abc/static/audio/` | `/subpkg/english-abc/static/audio` |

脚本会把生成的运行时路径**写回内容文件**，页面直接读字段播放，无需拼路径。

## 内容文件结构

每个文件都是 `module.exports = { ... }`，下面只列 `module.exports` 后面那个对象。**必须是严格 JSON**：双引号、无尾逗号、无 `//` 注释，否则脚本解析会报错。需要写说明就加一个 `_note` 字段。

### poems.js

**无白话**：定稿不生成、不展示 `plain` / `plainAudio`。若内容里仍残留 `plain`，脚本会顺带生成 plain 音频，但产品侧不应再写入。

```javascript
module.exports = {
  "poems": [
    {
      "id": "yong-e",
      "title": "咏鹅",
      "lines": [
        { "text": "鹅鹅鹅，" },
        { "text": "曲项向天歌。" }
      ],
      "fullText": "鹅鹅鹅，曲项向天歌。白毛浮绿水，红掌拨清波。"
    }
  ]
}
```

产出：`{id}-line-{n}.mp3`、`{id}-full.mp3`

### hanzi.js（categories 八类）

```javascript
module.exports = {
  "categories": [
    {
      "id": "number",
      "title": "数字",
      "items": [
        { "char": "一", "pinyin": "yi", "words": ["一个", "一起"] }
      ]
    }
  ]
}
```

产出：`{pinyin}-{码点}.mp3`、`{pinyin}-{码点}-word-{n}.mp3`，如 `yi-4e00.mp3`、`yi-4e00-word-1.mp3`。

**文件名一律 ASCII**：小程序按字面量查代码包内路径，中文文件名一经百分号编码就 `readFile:fail`（开发者工具有时能放过，真机必炸）。拼音会重码（爸/八 都是 `ba`），所以补上汉字 Unicode 码点保证唯一。`words[]` 与 `wordAudios[]` 同序，序号从 1 开始。

### english.js

```javascript
module.exports = {
  "categories": [
    {
      "id": "fruit",
      "title": "水果",
      "items": [
        { "word": "apple", "sentence": "An apple." }
      ]
    }
  ]
}
```

产出：`{word}.mp3`、`{word}-sentence.mp3`

### pinyin.js

```javascript
module.exports = {
  "vowels": [
    { "letter": "a", "asset": "pinyin-a", "hint": "张大嘴巴，a a a" }
  ]
}
```

产出：`{letter}.mp3`（`ü` → `umlaut-u.mp3`）

**发音源文（硬约束）**：不能把 `a/o/e/i/u/ü` 拉丁字母直接丢给中文 TTS——`zh-CN-*` 常把孤立拉丁字母念成**英文字母名**。脚本常量 `PINYIN_SPEAK` 用小学单韵母读法汉字：

| letter | 合成文案 | 文件 |
|--------|---------|------|
| a | 啊 | `a.mp3` |
| o | 喔 | `o.mp3` |
| e | 鹅 | `e.mp3` |
| i | 衣 | `i.mp3` |
| u | 乌 | `u.mp3` |
| ü | 迂 | `umlaut-u.mp3` |

改映射或纠音后必须 `--force --only pinyin` 重生成，并真机抽听。

### alphabet.js

```javascript
module.exports = {
  "letters": [
    { "letter": "A", "phonetic": "/eɪ/", "image": "english-letter-a" }
  ]
}
```

产出：`{letter}.mp3`（小写文件名，如 `a.mp3`）。合成英文字母名（`en-US-AnaNeural`）；W 文案 `double u`，Z 文案 `zed`（见脚本 `ALPHABET_SPEAK`）。

## 体积红线

音频必须控制在分包预算内（单个分包上限 2MB，还要留给图片和代码）：

| 用途 | 单文件上限 |
|------|-----------|
| 单字 / 单词 / 韵母 | 15KB |
| 词组 / 短句 / 诗句 | 30KB |
| 全诗朗读 | 80KB |

若超标，用 ffmpeg 统一转码：

```bash
ffmpeg -i in.mp3 -ac 1 -ar 22050 -b:a 24k out.mp3
```

## 生成后检查

1. 抽听 3～5 个 MP3，确认发音清晰、无截断；**拼音须确认是韵母音，不是英文字母名**
2. 确认内容文件中 `audio` 字段已写入且以 `/subpkg/` 开头
3. 确认写回后的文件仍以 `module.exports = ` 开头（脚本会自动保持）
4. 跑 `npm test`：会校验代码包内文件名纯 ASCII，且内容文件里的音频路径真实存在
5. 核对脚本输出的体积报告，超预算的模块先转码再提交
6. `du -sh miniprogram/subpkg/*/` 自查，P6 前用微信开发者工具「代码依赖分析」复核官方口径
7. **真机**试听；开发者工具正常不代表 iOS 有声

## 限流与重试

内置单条最多重试 5 次、指数退避、条间隔 0.3s。大批量失败时稍后用 `--only` 重跑对应模块即可。

## Agent 工作流

1. 确认或补齐对应分包的 `content/*.js` 文本字段（保持严格 JSON）
2. 运行 `generate_audio.py`（必要时 `--only` 限定范围）
3. 汇报生成数量、失败项、各模块体积
4. 提醒在真机试听并检查分包体积

字段细节与排错见 [reference.md](reference.md)。
