#!/usr/bin/env bash
# Full build: data -> timeline dump -> frames (headless Chromium) -> soundtrack -> what-if-wanted-level.mp4
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH=$(npm root -g)
[ -f data/countries.geojson ] && [ -f data/earth.jpg ] || ./fetch_data.sh
node render.mjs --dump
[ -n "${SKIP_RENDER:-}" ] || WORKERS=2 FPS=30 END=18180 node render.mjs
[ -n "${SKIP_AUDIO:-}" ] || python3 music.py
ffmpeg -y -framerate 30 -i build/frames/f%05d.jpg -i build/audio.wav \
  -filter_complex "[1:a]aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map 0:v -map "[a]" \
  -vf "eq=saturation=1.16:contrast=1.04:brightness=0.01" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest what-if-wanted-level.mp4
echo "Done: what-if-wanted-level.mp4"
