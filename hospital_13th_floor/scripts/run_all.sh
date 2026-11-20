#!/usr/bin/env bash
# Full rebuild of The Hospital's 13th Floor animatic. Every step is resumable / re-runnable on its own.
# Requirements: python3 (numpy, scipy, pillow, pyyaml), ffmpeg, espeak-ng (only for PA/chorus placeholders).
set -euo pipefail
cd "$(dirname "$0")"
python3 01_prepare_voices.py        # dialogue cues + per-shot narration clips   -> voice/
python3 03_build_timeline.py        # durations, EDL, reference SRT              -> editing/
python3 00_export_prompts.py        # prompts + SHOT_BREAKDOWN.md                -> prompts/, production/
python3 02_make_sound_library.py    # procedural SFX + ambience                  -> sound_effects/
python3 04_mix_audio.py             # music cues, stems, loudness-normalized mix -> music/, editing/
python3 05_make_keyframes.py        # placeholder keyframes + contact sheet      -> scene_images/placeholder/
python3 06_render_shots.py --force  # per-shot video (generated assets win)      -> editing/rendered_shots/
python3 07_assemble.py              # final 1080p24 export                        -> exports/
python3 09_update_manifest.py       # manifest.json + STATUS.md
