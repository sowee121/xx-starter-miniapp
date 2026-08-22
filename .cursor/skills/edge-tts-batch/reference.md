# edge-tts 批量导出 — 参考

## 目录结构

```
miniprogram/
└── subpkg/
    ├── poem/
    │   ├── content/poems.js
    │   └── static/audio/               # yong-e-line-1.mp3 ...
    ├── hanzi/
    │   ├── content/hanzi.js            # categories[].items
    │   └── static/audio/               # e-9e45.mp3, e-9e45-word-1.mp3 ...
    ├── english/
    │   ├── content/english.js
    │   └── static/audio/
    ├── english-abc/
    │   ├── content/alphabet.js
    │   └── static/audio/               # 字母名 a.mp3 … z.mp3
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
| 英文字母名 | `letters[n].audio` |

写入值是**小程序运行时绝对路径**，如 `/subpkg/poem/static/audio/yong-e-line-1.mp3`，页面直接用。

## 文件名规则（硬约束：纯 ASCII）

| 模块 | 文件名 |
|------|--------|
| 古诗 | `{id}-line-{n}.mp3`、`{id}-full.mp3` |
| 汉字 | `{pinyin}-{码点}.mp3`、`{pinyin}-{码点}-word-{n}.mp3` |
| 英语 | `{word}.mp3`、`{word}-sentence.mp3` |
| 拼音 | `{letter}.mp3`（`ü` → `umlaut-u.mp3`；合成文案为啊/喔/鹅/衣/乌/迂，避免拉丁字母被念成英文） |
| 字母表 | `{letter}.mp3`（小写 `a.mp3`…`z.mp3`；W=`double u`，Z=`zed`） |

小程序按字面量查代码包内路径，中文文件名一旦被百分号编码就永远 `readFile:fail`。汉字用「拼音 + Unicode 码点」是因为拼音会重码（爸/八 都是 `ba`），码点保证唯一且与字一一对应。`generate_audio.py` 的 `gen()` 会在非 ASCII 名字上直接退出，`npm test` 也会扫代码包文件名兜底。

定稿**无白话**：不要新增 `plain` / `plainAudio`。若旧数据仍带 `plain`，脚本可能生成 plain 音频，产品侧应逐步清掉。

## 小程序端播放

统一用 `miniprogram/utils/audio.js`：

- `wx.setInnerAudioOption({ obeyMuteSwitch: false })`（`app.js` / `ensureAudioOption`）
- 代码包内路径**不做**百分号编码，只对 `http(s)` 地址编码
- `stop` 后短延迟再设 `src` 并 `play`（避免真机静音失败）

页面 `onUnload` 时调用 `audioUtil.stop()`，避免跨页叠音。

点读页把 `onError: feedback.audioFallback(this)` 传给 `audioUtil.play`：缺字段可以提前拦，但取不到文件只有播放时才暴露，必须落到「语音准备中～」的软提示。

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

**拼音听起来像英文字母**
中文音色收到孤立拉丁字母 `a`/`o`/`e`… 时常念英文字母名。必须用 `PINYIN_SPEAK`（啊/喔/鹅/衣/乌/迂）合成，再 `--force --only pinyin`。手动调试：

```bash
edge-tts -v zh-CN-XiaoxiaoNeural --rate=-10% -t "啊" --write-media /tmp/a.mp3
# 错误示范（勿用）：-t "a"
afplay /tmp/a.mp3
```

**连接失败 / 429**
edge-tts 走微软在线接口，有频率限制。脚本已重试，稍后用 `--only` 重跑即可；避免并行多个进程。

**`readFile:fail ... %E5%85%A5.mp3 not found`**
路径里出现 `%XX` 说明素材文件名不是 ASCII，或播放前被 `encodeURI` 过。两侧都要修：文件名改 ASCII slug，`utils/audio.js` 只给网络地址编码。

**替换为真人录音**
保持内容文件中 `audio` 路径不变，用同名 MP3 覆盖对应分包目录下的文件即可，代码无需改动。

**内容文件解析失败**
报「必须是严格 JSON」时，检查是否手写了 `//` 注释、尾逗号或单引号。脚本只在解析成功后才会写文件，报错时原文件不受影响。

**新增模块**
在 `generate_audio.py` 顶部 `MODULES` 加一项，并实现对应 `do_<kind>` 方法。
