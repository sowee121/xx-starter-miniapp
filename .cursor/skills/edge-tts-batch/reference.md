# edge-tts 批量导出 — 参考

## 目录结构

```
miniprogram/
└── subpkg/
    ├── poem/
    │   ├── content/poems.js
    │   └── static/audio/               # yong-e-line-1.mp3 ...
    ├── hanzi/
    │   ├── content/hanzi.js            # poem[] + life[]
    │   └── static/audio/               # 鹅.mp3, 鹅-白鹅.mp3 ...
    ├── english/
    │   ├── content/english.js
    │   └── static/audio/
    └── pinyin/
        ├── content/pinyin.js           # vowels[]
        └── static/audio/
```

原生小程序里，`app.json` 声明 `"root": "subpkg/poem"` 后，该目录下的一切（含 `static/` 与 `content/`）都计入这个分包；`miniprogram/static/` 计入主包。没有打包器重排，所见即所得——这是把音频放进分包的关键。

（历史分包名 `hanzi-poem` / `hanzi-life` / `misc` 已废弃，勿再引用。）

## 内容文件格式

内容文件是 CommonJS 模块，不是 `.json`：

```javascript
module.exports = {
  "poems": [ ... ]
}
```

**原因**：原生小程序 `require('./x.json')` 会被解析器追加 `.js` 后缀，报 `module 'x.json.js' is not defined`，无法可靠加载裸 JSON。

脚本用 `read_content()` 剥掉 `module.exports = ` 前缀（也容忍结尾分号）后按 JSON 解析，用 `write_content()` 写回时重新套上包装。因此 **`module.exports = ` 后面必须是严格 JSON**：双引号、无尾逗号、无 `//` 注释。违反时脚本会报明确错误并退出，不会写坏文件。要加备注就放一个 `_note` 字段。

## 写回字段

| 来源 | 写入字段 |
|------|---------|
| 古诗逐句原文 | `lines[n].audio` |
| 古诗全文 | `fullAudio` |
| 汉字 | `audio` |
| 组词 | `wordAudios[]`（与 `words[]` 同序） |
| 英语单词 | `audio` |
| 英语短句 | `sentenceAudio` |
| 拼音韵母 | `vowels[n].audio` |

写入值是**小程序运行时绝对路径**，如 `/subpkg/poem/static/audio/yong-e-line-1.mp3`，页面直接用。

定稿**无白话**：不要新增 `plain` / `plainAudio`。若旧数据仍带 `plain`，脚本可能生成 plain 音频，产品侧应逐步清掉。

## 小程序端播放

统一用 `miniprogram/utils/audio.js`：

- `wx.setInnerAudioOption({ obeyMuteSwitch: false })`（`app.js` / `ensureAudioOption`）
- 路径 `encodeURI`（识字中文文件名）
- `stop` 后短延迟再设 `src` 并 `play`（避免真机静音失败）

页面 `onUnload` 时调用 `audioUtil.stop()`，避免跨页叠音。

## 手动单条调试

```bash
edge-tts -v zh-CN-XiaoxiaoNeural --rate=-10% \
  -t "鹅鹅鹅，曲项向天歌。" --write-media /tmp/test.mp3
afplay /tmp/test.mp3        # macOS 试听
```

查看可用音色：

```bash
edge-tts --list-voices | grep -E "zh-CN|en-US"
```

## 体积超标处理

单文件超限时批量转码（会覆盖原文件，先备份）：

```bash
find miniprogram/subpkg -name "*.mp3" -exec sh -c \
  'ffmpeg -y -loglevel error -i "$1" -ac 1 -ar 22050 -b:a 24k "$1.tmp" \
   && mv "$1.tmp" "$1"' _ {} \;
```

仍然超预算时的处理顺序：

1. 精简内容条目
2. 分包拆分（当前识字已合并为 `subpkg/hanzi`；勿再拆回旧双包 unless 体积逼迫）
3. 最后手段：该分包的音频改上云存储，内容文件里存 `cloud://` fileID

## 常见问题

**连接失败 / 429**
edge-tts 走微软在线接口，有频率限制。脚本已重试，稍后用 `--only` 重跑即可；避免并行多个进程。

**中文文件名**
脚本保留中文文件名（如 `鹅-白鹅.mp3`）。开发者工具常能播，**iOS 真机**须经 `encodeURI`（已在 `utils/audio.js`）。

**替换为真人录音**
保持内容文件中 `audio` 路径不变，用同名 MP3 覆盖对应分包目录下的文件即可，代码无需改动。

**内容文件解析失败**
报「必须是严格 JSON」时，检查是否手写了 `//` 注释、尾逗号或单引号。脚本只在解析成功后才会写文件，报错时原文件不受影响。

**新增模块**
在 `generate_audio.py` 顶部 `MODULES` 加一项，并实现对应 `do_<kind>` 方法。
