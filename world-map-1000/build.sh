#!/usr/bin/env bash
# Full pipeline: data -> narration -> music -> frames -> MP4 (1080x1920, 30 fps).
# SKIP_PREP=1 SKIP_AUDIO=1 SKIP_RENDER=1 reuse earlier stages.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
[ -n "${SKIP_PREP:-}" ] || python3 prep.py
if [ -z "${SKIP_AUDIO:-}" ]; then python3 narration.py; python3 music.py; fi
[ -n "${SKIP_RENDER:-}" ] || node render.mjs
OUT=how-the-world-map-changed-in-1000-years.mp4
ffmpeg -y -loglevel error -stats -framerate 30 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -i build/sfx.wav \
  -filter_complex "[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.15,asplit=2[v][vs];\
[2:a]volume=0.30[m];[m][vs]sidechaincompress=threshold=0.035:ratio=5:attack=25:release=450[md];\
[3:a]volume=0.42[s];[v][md][s]amix=inputs=3:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 21 -maxrate 4800k -bufsize 9600k -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "done: $OUT"
