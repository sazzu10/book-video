# Phase 0 System & Codebase Audit

**Date:** 2026-10-18  
**Repository:** Endless1936/book-video (Android 14 / Termux / Node.js / FFmpeg)  
**Git Snapshot:** Commit `b3edbc5`, Tag `v4.2-snapshot`

---

## 1. System Environment & Hardware

| Component | Status / Version | Details |
| :--- | :--- | :--- |
| **Operating System** | Android 14 (Linux kernel) | Termux aarch64 environment |
| **Node.js** | `v24.17.0` | Native ESM supported (`"type": "module"`) |
| **Python** | `Python 3.13.13` | Available in `/data/data/com.termux/files/usr/bin/python3` |
| **Pillow / NumPy** | **Missing** (`ModuleNotFoundError: No module named 'PIL'`) | Termux minimal environment; avoid compilation overhead. Pure Node.js + FFmpeg filtergraphs will be used. |
| **CPU Cores** | 8 cores (`aarch64` ARMv8 NEON) | High parallel throughput |
| **RAM** | 5,743 MB Total (1,780 MB available, 1,986 MB buffer/cache) | Sufficient for 1080x1920 streaming; avoid holding all uncompressed frames in RAM |
| **Swap** | 4,095 MB (1,949 MB free) | Healthy swap buffer |
| **Disk Storage** | 47 GB Free on `/data/data/com.termux/files/home` | Abundant space for cached shot assets |

---

## 2. Multimedia Engine (FFmpeg 8.1.2)

| Feature | Support | Verification Note |
| :--- | :--- | :--- |
| **Video Encoder (`libx264`)** | **Working** | Tested 5s 1080x1920 @ 30fps: **50 fps (1.67x realtime)** with `-preset ultrafast` |
| **Hardware (`h264_mediacodec`)** | **Broken / Restricted** | Android 14 SELinux seccomp restricts mediacodec IPC for non-root Termux. **Fallback to `libx264 ultrafast` confirmed working.** |
| **Audio Processing** | **Working** | `librubberband`, `highpass`, `equalizer`, `treble`, `bass`, `compand`, `amix`, `alimiter` |
| **Subtitles / Shaping** | **Working** | `libass` + `libharfbuzz` with Noto Sans Devanagari (`assets/fonts/NotoSansDevanagari-VF.ttf` & system fonts) |
| **Compositing Filters** | **Working** | `overlay`, `colorkey`, `chromakey`, `zoompan`, `gblur`, `blend`, `displace` all verified present |

---

## 3. Existing Project Assets & Pipeline Mapping

| Asset / Pipeline | Location / State | Audit Assessment |
| :--- | :--- | :--- |
| **Character Bible** | `episodes/the-honest-woodcutter-v4.2/character-bible.json` | Detailed canonical descriptions of Elder Ramu & Jaldevi |
| **Existing Storyboard** | `episodes/the-honest-woodcutter-v4.2/storyboard.json` | 12 scenes, durations ~59.6s, camera movement annotations |
| **Canonical Scene Plates** | `episodes/the-honest-woodcutter-v4.2/images/scene_001.png` - `012.png` | Clean 1080x1920 8-bit RGB PNG plates |
| **Audio Assets** | `assets/sfx/` (water splash, magic chime), `assets/bgm/如愿.mp3` | Valid WAV & MP3 audio sources |
| **V4.2 Master Output** | `/sdcard/Download/the-honest-woodcutter-v4.2.mp4` (`85.09 MB`, `59.60s`) | Strictly preserved; must not be overwritten |
| **Earlier Masters** | `final`, `v2`, `v3`, `v4`, `v4.1` on `/sdcard/Download/` | Strictly preserved |

---

## 4. Working, Broken, and Missing Matrix

### Working
- Node.js ESM execution and child process spawning
- Edge Neural TTS with IPv4 pinning (`hi-IN-MadhurNeural`)
- FFmpeg 8.1.2 with `libx264`, `librubberband`, `libass`, `colorkey`, `overlay`, `blend`, `zoompan`
- HarfBuzz Devanagari rendering using bundled `NotoSansDevanagari-VF.ttf`
- Whisper CLI (`whisper.cpp`) with preloaded `ggml-base.bin` for ASR transcription integrity checks

### Broken / Restricted
- Hardware encoder `h264_mediacodec` (blocked by Android 14 permissions) -> **Handled: Use `libx264 -preset ultrafast`**
- Direct bash invocation via unprivileged tool runner -> **Handled: Executed via Node.js wrapper with `/data/data/com.termux/files/usr/bin/sh`**

### Missing (To build in subsequent phases)
- Structured universal story schema (`story.json`) with genre presets & validator (Phase 1)
- 2D cutout layered compositor (background plates, layered character sprite rigs with chroma keying/alpha transparency, parallax, keyframed motion) (Phase 2)
- Unified image provider layer with offline procedural/sprite fallback (Phase 3)
- Objective voice audition pipeline without heavy EQ disguise (Phase 4)
- Comprehensive validation suite & delivery of V5 story video (Phase 5)

---

## 5. Architectural Adjustments
1. **Compositing Engine:** Instead of adding heavy Python Pillow/NumPy compile dependencies, we leverage Node.js to generate exact multi-input FFmpeg filtergraphs (`colorkey`, `overlay`, `zoompan`, `blend`, `ass`) streaming directly to `libx264`.
2. **Execution Strategy:** All compute-heavy rendering is spawned detached/backgrounded with progress logging to prevent MCP timeouts.
