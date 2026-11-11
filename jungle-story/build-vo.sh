#!/usr/bin/env bash
# Version cut to the supplied voiceover (voiceover.mp3): no synthetic narration, no on-screen text.
# START=n resumes an interrupted frame render.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
[ -d node_modules ] || npm install
if [ -z "${START:-}" ]; then python3 timeline_vo.py; python3 music.py; fi
CLEAN=1 NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs
ffmpeg -y -v error -framerate 30 -i build/frames-clean/f%05d.jpg -i voiceover.mp3 -i build/music.wav -filter_complex "
  [1:a]aresample=48000,aformat=channel_layouts=stereo,apad=pad_dur=4,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.45[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=700[md];
  [v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest hiran-aur-bandar-voiceover.mp4
echo "done: hiran-aur-bandar-voiceover.mp4"
