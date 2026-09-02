#!/usr/bin/env python3
"""裁掉点读 MP3 首尾静音，保持原采样率/码率/声道，不降码率。

只处理开头贴边、结尾贴 EOF 的静音；诗句中间停顿不动。
字母歌（音乐）跳过。

用法：
    python3 scripts/trim_package_audio.py
    python3 scripts/trim_package_audio.py --file path/to/a.mp3
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MP = ROOT / "miniprogram"

SKIP_NAMES = {"alphabet-song.mp3"}
SPEECH_16K_BR = 16000
SPEECH_16K_AR = 16000
SONG_16K_AR = 22050
KEEP_HEAD = 0.16
KEEP_TAIL = 0.18
# 静音至少持续这么久才算一段，避免把字尾衰减当静音切开
DETECT_D = 0.12
NOISE = "-40dB"
MIN_NEW_DUR = 0.28
# 原片较长时，新时长不得短于 55%（防止误裁诗句中间停顿）
LONG_CLIP = 3.0
LONG_KEEP_RATIO = 0.55


def ffprobe_info(path: Path) -> dict:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=sample_rate,channels,bit_rate",
            "-show_entries",
            "format=duration,bit_rate",
            "-of",
            "json",
            str(path),
        ],
        text=True,
    )
    data = json.loads(out)
    stream = data["streams"][0]
    fmt = data["format"]
    return {
        "ar": int(stream.get("sample_rate") or 24000),
        "ch": int(stream.get("channels") or 1),
        "br": int(stream.get("bit_rate") or fmt.get("bit_rate") or 48000),
        "dur": float(fmt.get("duration") or 0),
    }


def silence_regions(path: Path) -> list[tuple[float, float]]:
    proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            f"silencedetect=noise={NOISE}:d={DETECT_D}",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    log = proc.stderr or ""
    starts: list[float] = []
    regions: list[tuple[float, float]] = []
    for line in log.splitlines():
        if "silence_start:" in line:
            starts.append(float(line.rsplit(":", 1)[-1]))
        elif "silence_end:" in line:
            part = line.split("silence_end:")[-1]
            end = float(part.split("|")[0])
            start = starts.pop(0) if starts else 0.0
            regions.append((start, end))
    info = ffprobe_info(path)
    dur = info["dur"]
    if starts:
        # 文件以静音结尾，没有 silence_end
        regions.append((starts[-1], dur))
    return regions


def trim_window(duration: float, regions: list[tuple[float, float]]) -> tuple[float, float] | None:
    start = 0.0
    end = duration
    if regions and regions[0][0] <= 0.03:
        start = max(0.0, regions[0][1] - KEEP_HEAD)
    # 句末长静音仍裁；KEEP_TAIL 保住字尾。短于 1.2s 的不裁尾，以免切掉韵母。
    if duration >= 1.2 and regions and regions[-1][1] >= duration - 0.08:
        end = min(duration, regions[-1][0] + KEEP_TAIL)
    if end - start < MIN_NEW_DUR:
        return None
    if duration >= LONG_CLIP and (end - start) < duration * LONG_KEEP_RATIO:
        return None
    if (end - start) >= duration - 0.04:
        return None
    return start, end


def trim_mp3_file(path: Path) -> tuple[bool, str]:
    """裁一条 MP3。成功且变小返回 (True, 说明)，否则 (False, 原因)。"""
    if path.name in SKIP_NAMES:
        return False, "skip-song"
    if not path.exists() or path.suffix.lower() != ".mp3":
        return False, "missing"
    info = ffprobe_info(path)
    regions = silence_regions(path)
    win = trim_window(info["dur"], regions)
    if win is None:
        return False, "no-trim"
    ss, ee = win
    length = ee - ss
    orig_size = path.stat().st_size
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(path),
                "-ss",
                f"{ss:.3f}",
                "-t",
                f"{length:.3f}",
                "-ac",
                str(info["ch"]),
                "-ar",
                str(info["ar"]),
                "-c:a",
                "libmp3lame",
                "-b:a",
                str(info["br"]),
                str(tmp_path),
            ]
        )
        new_size = tmp_path.stat().st_size
        new_info = ffprobe_info(tmp_path)
        if new_info["dur"] < MIN_NEW_DUR:
            return False, "too-short"
        if new_size >= orig_size:
            return False, "not-smaller"
        tmp_path.replace(path)
        return True, (
            f"{orig_size / 1024:.1f}->{new_size / 1024:.1f}KB "
            f"{info['dur']:.2f}s->{new_info['dur']:.2f}s "
            f"{info['br'] // 1000}k/{info['ar']}Hz"
        )
    except Exception as e:
        return False, f"ffmpeg:{e}"
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def _encode_mp3(path: Path, br: int, ar: int) -> tuple[bool, str]:
    if not path.exists() or path.suffix.lower() != ".mp3":
        return False, "missing"
    info = ffprobe_info(path)
    if info["br"] <= br + 1000:
        return False, f"already-{br // 1000}k"
    orig_size = path.stat().st_size
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(path),
                "-ac",
                "1",
                "-ar",
                str(ar),
                "-c:a",
                "libmp3lame",
                "-b:a",
                f"{br // 1000}k",
                str(tmp_path),
            ]
        )
        new_size = tmp_path.stat().st_size
        if new_size >= orig_size:
            return False, "not-smaller"
        tmp_path.replace(path)
        return True, (
            f"{orig_size / 1024:.1f}->{new_size / 1024:.1f}KB "
            f"{info['br'] // 1000}k/{info['ar']}->{br // 1000}k/{ar}"
        )
    except Exception as e:
        return False, f"ffmpeg:{e}"
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def encode_mp3_16k(path: Path) -> tuple[bool, str]:
    """点读 16kHz / 16kbps；字母歌保留 22.05kHz / 16kbps。"""
    ar = SONG_16K_AR if path.name in SKIP_NAMES else SPEECH_16K_AR
    return _encode_mp3(path, SPEECH_16K_BR, ar)


def main() -> None:
    parser = argparse.ArgumentParser(description="裁点读 MP3 首尾静音；可选降码率")
    parser.add_argument("--file", type=Path, default=None, help="只处理单个文件")
    parser.add_argument(
        "--to-16k",
        action="store_true",
        help="点读转到 16kHz / 16kbps；字母歌 22.05kHz / 16kbps",
    )
    args = parser.parse_args()

    if shutil_ffmpeg_missing():
        print("需要 ffmpeg / ffprobe", file=sys.stderr)
        sys.exit(1)

    files = [args.file] if args.file else sorted(MP.rglob("*.mp3"))
    ok = skip = 0
    saved = 0
    if args.to_16k:
        action = encode_mp3_16k
        label = "16k"
    else:
        action = trim_mp3_file
        label = "trim"
    for path in files:
        before = path.stat().st_size if path.exists() else 0
        changed, reason = action(path)
        if changed:
            ok += 1
            after = path.stat().st_size
            saved += before - after
            rel = path.relative_to(MP) if MP in path.parents or path == MP else path
            print(f"  {label} {reason}  {rel}")
        else:
            skip += 1
    print(f"\n{label}ed={ok} unchanged={skip} saved={saved / 1024:.1f} KB")


def shutil_ffmpeg_missing() -> bool:
    from shutil import which

    return which("ffmpeg") is None or which("ffprobe") is None


if __name__ == "__main__":
    main()
