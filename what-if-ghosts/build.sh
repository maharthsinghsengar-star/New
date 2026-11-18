#!/bin/bash
# Build "What if everyone except you became ghosts and zombies?" -> what-if-ghosts.mp4 (1920x1080, 30 fps)
set -e
cd "$(dirname "$0")"
export NODE_PATH=$(npm root -g)
[ -f build/timeline.json ] || MODELS=${MODELS:-../car-story/models} python3 narration.py
if [ -z "$SKIP_RENDER" ]; then node render.mjs --dump; node render.mjs; fi
[ -n "$SKIP_AUDIO" ] || python3 music.py
ffmpeg -y -framerate 30 -i build/frames/f%05d.jpg -i build/audio.wav \
  -filter_complex "[1:a]aresample=48000,loudnorm=I=-15:TP=-1.5:LRA=11[a]" -map 0:v -map "[a]" \
  -vf "eq=saturation=1.12:contrast=1.03" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest what-if-ghosts.mp4
echo "Done: what-if-ghosts.mp4"
