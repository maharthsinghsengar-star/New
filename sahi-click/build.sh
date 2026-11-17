#!/usr/bin/env bash
# Dialogue -> music/SFX -> frames -> MP4 (1080x1920, 30 fps). SKIP_AUDIO=1 / SKIP_RENDER=1 reuse earlier stages.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
if [ -z "${SKIP_AUDIO:-}" ]; then python3 narration.py; python3 music.py; fi
[ -n "${SKIP_RENDER:-}" ] || node render.mjs
OUT=sahi-click-mega-visitor-day.mp4
ffmpeg -y -loglevel error -stats -framerate 30 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -i build/sfx.wav \
  -filter_complex "[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.3,asplit=2[v][vs];\
[2:a]volume=0.3[m];[3:a]volume=0.32[s];[m][s]amix=inputs=2:normalize=0[bed];[bed][vs]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=400[bd];\
[v][bd]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -maxrate 6000k -bufsize 12000k -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "done: $OUT"
