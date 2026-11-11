#!/usr/bin/env bash
# Variant without narration or on-screen text: same animation and timing, music only.
# Run ./build.sh first (it creates the timeline and the music). START=n resumes the frame render.
set -euo pipefail
cd "$(dirname "$0")"
CLEAN=1 NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs
ffmpeg -y -v error -framerate 30 -i build/frames-clean/f%05d.jpg -i build/music.wav -filter_complex \
  "[1:a]aresample=48000,volume=0.9,alimiter=limit=0.95,loudnorm=I=-18:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest hiran-aur-bandar-clean.mp4
echo "done: hiran-aur-bandar-clean.mp4"
