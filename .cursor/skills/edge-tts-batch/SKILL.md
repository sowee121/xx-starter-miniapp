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
```

脚本结束会打印各模块音频体积与预算对比。

## 模块与路径映射

| 模块 | 内容文件 | 音频输出 | 运行时前缀 |
|------|---------|----------|-----------|
| `poems` | `miniprogram/subpkg/poem/content/poems.js` | `miniprogram/subpkg/poem/static/audio/` | `/subpkg/poem/static/audio` |
| `hanzi` | `miniprogram/subpkg/hanzi/content/hanzi.js`（`poem` + `life` 两库） | 同分包 `static/audio/` | `/subpkg/hanzi/static/audio` |
| `english` | `miniprogram/subpkg/english/content/english.js`（`categories[].items`） | 同分包 `static/audio/` | `/subpkg/english/static/audio` |
| `pinyin` | `miniprogram/subpkg/pinyin/content/pinyin.js`（`vowels`） | 同分包 `static/audio/` | `/subpkg/pinyin/static/audio` |

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

### hanzi.js（单分包两库）

```javascript
module.exports = {
  "poem": [
    { "char": "鹅", "words": ["白鹅", "大鹅"] }
  ],
  "life": [
    { "char": "人", "words": ["大人", "小人"] }
  ]
}
```

产出：`{char}.mp3`、`{char}-{word}.mp3`（中文文件名；真机播放须经 `utils/audio.js` 的 `encodeURI`）

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

产出：`{letter}.mp3`（`ü` 等特殊字母按脚本规则命名，如 `umlaut-u.mp3`）

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

1. 抽听 3～5 个 MP3，确认发音清晰、无截断
2. 确认内容文件中 `audio` 字段已写入且以 `/subpkg/` 开头
3. 确认写回后的文件仍以 `module.exports = ` 开头（脚本会自动保持）
4. 核对脚本输出的体积报告，超预算的模块先转码再提交
5. `du -sh miniprogram/subpkg/*/` 自查，P6 前用微信开发者工具「代码依赖分析」复核官方口径
6. **真机**试听（尤其识字中文文件名）；开发者工具正常不代表 iOS 有声

## 限流与重试

内置单条最多重试 5 次、指数退避、条间隔 0.3s。大批量失败时稍后用 `--only` 重跑对应模块即可。

## Agent 工作流

1. 确认或补齐对应分包的 `content/*.js` 文本字段（保持严格 JSON）
2. 运行 `generate_audio.py`（必要时 `--only` 限定范围）
3. 汇报生成数量、失败项、各模块体积
4. 提醒在真机试听并检查分包体积

字段细节与排错见 [reference.md](reference.md)。
