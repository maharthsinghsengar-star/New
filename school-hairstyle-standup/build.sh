#!/usr/bin/env bash
# Timeline -> frames (1080x1920 @ 24 fps) -> captions -> final 9:16 MP4 with the stand-up audio (standup.mp3) as the soundtrack.
# Needs: ffmpeg (with libass), node + playwright (chromium), python3. START=n resumes a render; SKIP_RENDER=1 re-encodes existing frames.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
[ -d node_modules ] || npm install
python3 timeline.py
python3 subs.py
if [ -z "${SKIP_RENDER:-}" ]; then NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs; fi
ffmpeg -y -v error -framerate 24 -i build/frames/f%05d.jpg -i standup.mp3 -filter_complex "[0:v]ass=build/subs.ass:fontsdir=fonts[vid]" \
  -map "[vid]" -map 1:a -c:v libx264 -preset slow -tune animation -crf 23 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart hairstyle-problem-in-schools.mp4
echo "done: hairstyle-problem-in-schools.mp4"
