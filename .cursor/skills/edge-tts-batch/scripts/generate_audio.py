#!/usr/bin/env python3
"""Batch-generate point-read MP3 for 嘻嘻启蒙乐园 using edge-tts.

Audio is written into per-subpackage static dirs so each WeChat subpackage
stays under its 2MB limit.

Content files are CommonJS modules shaped `module.exports = <strict JSON>`,
because the native WeChat mini program loader cannot require a bare .json file.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("请先安装: python3 -m pip install edge-tts", file=sys.stderr)
    sys.exit(1)

VOICE_ZH = "zh-CN-XiaoxiaoNeural"
VOICE_EN = "en-US-AnaNeural"
# 注音须用台湾音色：晓晓对 ㄛㄜㄧㄨㄩ 会合成失败（无音频）。
VOICE_PINYIN = "zh-TW-HsiaoChenNeural"
RATE = "-10%"  # 低幼放慢语速
MAX_RETRIES = 5
INTER_ITEM_DELAY = 0.3

# 单韵母不能把拉丁字母直接丢给中文 TTS（会念成英文字母名）。
# 用注音符号当源文，让引擎按韵母本身读，而不是汉字词（鹅/额）的口型。
PINYIN_SPEAK = {
    "a": "ㄚ",
    "o": "ㄛ",
    "e": "ㄜ",
    "i": "ㄧ",
    "u": "ㄨ",
    "ü": "ㄩ",
}

# 英文字母名；默认把字母本身喂给英文 TTS。Z 强制英式 zed，W 写成 double u 以免含糊。
ALPHABET_SPEAK = {
    "W": "double u",
    "Z": "zed",
}


# `module.exports = ` 包装：原生小程序 require 不了 .json，内容存成 .js
EXPORT_PREFIX = "module.exports = "

# 每个模块：内容文件位置、音频输出目录、小程序运行时引用前缀
MODULES: dict[str, dict[str, str]] = {
    "poems": {
        "kind": "poems",
        "content": "miniprogram/subpkg/poem/content/poems.js",
        "audio": "miniprogram/subpkg/poem/static/audio",
        "url": "/subpkg/poem/static/audio",
        "voice": VOICE_ZH,
        "budget_mb": "1.5",
    },
    "hanzi": {
        "kind": "hanzi",
        "content": "miniprogram/subpkg/hanzi/content/hanzi.js",
        "audio": "miniprogram/subpkg/hanzi/static/audio",
        "url": "/subpkg/hanzi/static/audio",
        "voice": VOICE_ZH,
        "budget_mb": "1.4",
    },
    "english": {
        "kind": "english",
        "content": "miniprogram/subpkg/english/content/english-words.js",
        "audio": "miniprogram/subpkg/english/static/audio",
        "url": "/subpkg/english/static/audio",
        "voice": VOICE_EN,
        "budget_mb": "1.5",
    },
    "pinyin": {
        "kind": "pinyin",
        "content": "miniprogram/subpkg/pinyin/content/pinyin.js",
        "audio": "miniprogram/subpkg/pinyin/static/audio",
        "url": "/subpkg/pinyin/static/audio",
        "voice": VOICE_PINYIN,
        "budget_mb": "0.8",
    },
    "alphabet": {
        "kind": "alphabet",
        "content": "miniprogram/subpkg/english-abc/content/alphabet.js",
        "audio": "miniprogram/subpkg/english-abc/static/audio",
        "url": "/subpkg/english-abc/static/audio",
        "voice": VOICE_EN,
        "budget_mb": "0.6",
    },
}


def find_project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "miniprogram").is_dir():
            return parent
        if (parent / ".cursor" / "skills").is_dir():
            return parent
    return Path.cwd()


def read_content(path: Path):
    """Load a `module.exports = <strict JSON>` module into a dict."""
    text = path.read_text(encoding="utf-8").strip()
    if text.startswith(EXPORT_PREFIX):
        text = text[len(EXPORT_PREFIX) :]
    text = text.rstrip().rstrip(";")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise SystemExit(
            f"{path} 解析失败：`module.exports = ` 后面必须是严格 JSON"
            f"（双引号、无尾逗号、无 // 注释）。{e}"
        ) from e


def write_content(path: Path, data) -> None:
    body = json.dumps(data, ensure_ascii=False, indent=2)
    path.write_text(f"{EXPORT_PREFIX}{body}\n", encoding="utf-8")


def codepoints(s: str) -> str:
    return "-".join(f"{ord(c):04x}" for c in s)


def slug(s: str) -> str:
    """文件名必须是纯 ASCII：小程序 readFile 按字面量查代码包内路径，
    非 ASCII 文件名一旦被百分号编码就永远 not found。
    纯中文等无 ASCII 可留的输入退化成码点，仍然稳定且唯一。"""
    cleaned = re.sub(r"[^a-z0-9-]+", "-", s.strip().lower()).strip("-")
    return cleaned or codepoints(s.strip()) or "item"


def hanzi_slug(char: str, pinyin: str) -> str:
    """拼音会重码（爸/八 都是 ba），补 Unicode 码点保证唯一且与字一一对应。"""
    base = re.sub(r"[^a-z0-9]+", "", (pinyin or "").lower())
    code = codepoints(char)
    return f"{base}-{code}" if base else code


async def synthesize(text: str, voice: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            await edge_tts.Communicate(text, voice, rate=RATE).save(str(out_path))
            return
        except Exception as e:
            last_err = e
            wait = 0.5 * (2**attempt)
            print(f"  重试 {attempt + 1}/{MAX_RETRIES} ({wait:.1f}s): {e}")
            await asyncio.sleep(wait)
    raise RuntimeError(f"合成失败: {text[:30]!r} -> {out_path}") from last_err


def _trim_tts(path: Path) -> None:
    """裁首尾静音并转到 16kbps。字母歌不裁静音，但会降码率。"""
    scripts = find_project_root() / "scripts"
    if str(scripts) not in sys.path:
        sys.path.insert(0, str(scripts))
    try:
        from trim_package_audio import encode_mp3_16k, trim_mp3_file

        if path.name != "alphabet-song.mp3":
            trim_mp3_file(path)
        encode_mp3_16k(path)
    except Exception as e:
        print(f"  (trim skip) {e}")


class Generator:
    def __init__(self, root: Path, force: bool) -> None:
        self.root = root
        self.force = force
        self.generated = 0
        self.skipped = 0
        self.failed: list[str] = []

    async def gen(
        self, text: str, voice: str, audio_dir: Path, url_prefix: str, name: str
    ) -> str | None:
        """Synthesize one clip, return its miniprogram runtime path."""
        if not text or not text.strip():
            return None
        if not name.isascii():
            raise SystemExit(f"音频文件名必须是 ASCII，收到 {name!r}（小程序 readFile 查不到编码路径）")
        out_path = audio_dir / f"{name}.mp3"
        url = f"{url_prefix}/{name}.mp3"
        if out_path.exists() and not self.force:
            self.skipped += 1
            return url
        try:
            await synthesize(text.strip(), voice, out_path)
            _trim_tts(out_path)
            self.generated += 1
            print(f"  OK {url}")
            await asyncio.sleep(INTER_ITEM_DELAY)
            return url
        except Exception as e:
            self.failed.append(f"{url}: {e}")
            print(f"  FAIL {url}: {e}", file=sys.stderr)
            return None

    # ---- per-kind handlers -------------------------------------------------

    async def do_poems(self, data, voice, audio_dir, url) -> bool:
        changed = False
        for poem in data.get("poems", []):
            pid = poem.get("id") or slug(poem.get("title", "poem"))
            for i, line in enumerate(poem.get("lines", []), start=1):
                got = await self.gen(
                    line.get("speak") or line.get("text", ""),
                    voice,
                    audio_dir,
                    url,
                    f"{pid}-line-{i}",
                )
                if got and line.get("audio") != got:
                    line["audio"] = got
                    changed = True
                if line.get("plain"):
                    got = await self.gen(
                        line["plain"], voice, audio_dir, url, f"{pid}-plain-{i}"
                    )
                    if got and line.get("plainAudio") != got:
                        line["plainAudio"] = got
                        changed = True
            if poem.get("fullText"):
                got = await self.gen(
                    poem["fullText"], voice, audio_dir, url, f"{pid}-full"
                )
                if got and poem.get("fullAudio") != got:
                    poem["fullAudio"] = got
                    changed = True
        return changed

    async def do_chars(self, data, voice, audio_dir, url) -> bool:
        """旧版 chars[]；保留兼容。"""
        changed = False
        for item in data.get("chars", []):
            changed = (await self._fill_char_item(item, voice, audio_dir, url)) or changed
        return changed

    async def _fill_char_item(self, item, voice, audio_dir, url) -> bool:
        changed = False
        char = item.get("char", "")
        if not char:
            return False
        key = hanzi_slug(char, item.get("pinyin", ""))
        got = await self.gen(char, voice, audio_dir, url, key)
        if got and item.get("audio") != got:
            item["audio"] = got
            changed = True
        words = item.get("words", [])
        word_audios = list(item.get("wordAudios", []))
        word_audios = word_audios[: len(words)]
        word_audios += [""] * (len(words) - len(word_audios))
        for idx, word in enumerate(words):
            got = await self.gen(word, voice, audio_dir, url, f"{key}-word-{idx + 1}")
            if got and word_audios[idx] != got:
                word_audios[idx] = got
                changed = True
        if word_audios:
            item["wordAudios"] = word_audios
        return changed

    async def do_hanzi(self, data, voice, audio_dir, url) -> bool:
        """当前结构：{ categories: [{ items: [...] }] }；兼容旧 poem/life。"""
        changed = False
        items = []
        if data.get("categories"):
            for cat in data["categories"]:
                items.extend(cat.get("items", []))
        else:
            for key in ("poem", "life", "chars"):
                items.extend(data.get(key, []))
        for item in items:
            changed = (await self._fill_char_item(item, voice, audio_dir, url)) or changed
        return changed

    async def do_english(self, data, voice, audio_dir, url) -> bool:
        changed = False
        items = data.get("words", [])
        if not items and data.get("categories"):
            items = []
            for cat in data["categories"]:
                items.extend(cat.get("items", []))
        for item in items:
            word = item.get("word", "")
            if not word:
                continue
            key = slug(word)
            # 同形异义词 / 分包路径：以已有 audio 字段为准
            audio_path = item.get("audio") or ""
            item_audio_dir = audio_dir
            item_url = url
            if audio_path:
                key = Path(audio_path).stem
                # /subpkg/english-more/static/audio/x.mp3 → 写到对应分包目录
                rel = audio_path.lstrip("/")
                if rel.startswith("subpkg/"):
                    item_audio_dir = self.root / "miniprogram" / Path(rel).parent
                    item_url = "/" + Path(rel).parent.as_posix()
            got = await self.gen(word, voice, item_audio_dir, item_url, key)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
            if item.get("sentence"):
                got = await self.gen(
                    item["sentence"], voice, item_audio_dir, item_url, f"{key}-sentence"
                )
                if got and item.get("sentenceAudio") != got:
                    item["sentenceAudio"] = got
                    changed = True
        return changed

    async def do_pinyin(self, data, voice, audio_dir, url) -> bool:
        changed = False
        vowels = data.get("vowels") or []
        for item in vowels:
            letter = item.get("letter", "")
            if not letter:
                continue
            speak = PINYIN_SPEAK.get(letter)
            if not speak:
                print(f"  ! 未知韵母 {letter!r}，跳过")
                continue
            file_key = "umlaut-u" if letter == "ü" else letter
            got = await self.gen(speak, voice, audio_dir, url, file_key)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
        return changed

    async def do_alphabet(self, data, voice, audio_dir, url) -> bool:
        changed = False
        for item in data.get("letters", []):
            letter = item.get("letter", "")
            if not letter:
                continue
            speak = ALPHABET_SPEAK.get(letter, letter)
            file_key = letter.lower()
            got = await self.gen(speak, voice, audio_dir, url, file_key)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
        return changed

    async def do_sfx(self, data, voice, audio_dir, url) -> bool:
        changed = False
        for item in data.get("items", []):
            sid, text = item.get("id", ""), item.get("text", "")
            # 无 text 的条目是手工下载的音效（如 star），不做 TTS
            if not sid or not text:
                continue
            got = await self.gen(text, voice, audio_dir, url, sid)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
        return changed

    # ---- driver ----------------------------------------------------------

    async def run_module(self, name: str, cfg: dict[str, str]) -> None:
        content_path = self.root / cfg["content"]
        if not content_path.exists():
            print(f"\n[{name}] 跳过，未找到 {cfg['content']}")
            return
        print(f"\n[{name}] {cfg['content']}")
        data = read_content(content_path)
        handler = getattr(self, f"do_{cfg['kind']}")
        changed = await handler(
            data, cfg["voice"], self.root / cfg["audio"], cfg["url"]
        )
        if changed:
            write_content(content_path, data)
            print(f"  已写回 {cfg['content']}")

    def report_size(self, only: set[str]) -> None:
        print("\n音频体积（分包上限 2MB，含图片与代码）:")
        for name, cfg in MODULES.items():
            if only and name not in only:
                continue
            d = self.root / cfg["audio"]
            if not d.is_dir():
                continue
            total = sum(f.stat().st_size for f in d.rglob("*.mp3"))
            mb = total / 1024 / 1024
            flag = "  <-- 偏大，检查分包预算" if mb > float(cfg["budget_mb"]) else ""
            print(f"  {name:<12} {mb:6.2f} MB (预算 {cfg['budget_mb']} MB){flag}")

    async def run(self, only: set[str]) -> None:
        for name, cfg in MODULES.items():
            if not only or name in only:
                await self.run_module(name, cfg)
        print(
            f"\n完成: 新生成 {self.generated}, 跳过 {self.skipped}, "
            f"失败 {len(self.failed)}"
        )
        self.report_size(only)
        if self.failed:
            print("\n失败列表:", file=sys.stderr)
            for line in self.failed:
                print(f"  {line}", file=sys.stderr)
            sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="edge-tts 批量生成点读 MP3")
    parser.add_argument(
        "--root", type=Path, default=None, help="项目根（含 miniprogram/）"
    )
    parser.add_argument("--force", action="store_true", help="覆盖已存在的 MP3")
    parser.add_argument(
        "--only",
        type=str,
        default="",
        help="仅处理模块，逗号分隔: " + ",".join(MODULES),
    )
    args = parser.parse_args()
    root = args.root or find_project_root()
    only = {x.strip() for x in args.only.split(",") if x.strip()}
    unknown = only - set(MODULES)
    if unknown:
        print(f"未知模块: {', '.join(sorted(unknown))}", file=sys.stderr)
        sys.exit(2)
    print(f"项目根: {root}")
    asyncio.run(Generator(root, args.force).run(only))


if __name__ == "__main__":
    main()
