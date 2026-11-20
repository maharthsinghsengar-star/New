#!/usr/bin/env bash
# Full build: timeline dump -> frames (headless Chromium) -> meditative soundtrack -> what-if-luck-doubled.mp4
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH=$(npm root -g)
node render.mjs --dump
[ -n "${SKIP_RENDER:-}" ] || WORKERS=2 FPS=30 node render.mjs
[ -n "${SKIP_AUDIO:-}" ] || python3 music.py
ffmpeg -y -framerate 30 -i build/frames/f%05d.jpg -i build/audio.wav \
  -filter_complex "[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[a]" -map 0:v -map "[a]" \
  -vf "eq=saturation=1.12:contrast=1.03" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest what-if-luck-doubled.mp4
echo "Done: what-if-luck-doubled.mp4"
