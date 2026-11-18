#!/bin/bash
# Builds "one-hour-before.mp4": soundscape -> frames -> mux.
set -e
cd "$(dirname "$0")"
export NODE_PATH=$(npm root -g)
if [ -z "${SKIP_RENDER:-}" ]; then node render.mjs --dump; node render.mjs; fi
if [ -z "${SKIP_AUDIO:-}" ]; then python3 music.py; fi
ffmpeg -y -loglevel error -framerate 30 -i build/frames/f%05d.jpg -i build/audio.wav \
  -filter_complex "[1:a]aresample=48000,loudnorm=I=-19:TP=-2:LRA=14[a]" \
  -map 0:v -map "[a]" -vf "eq=saturation=1.12:contrast=1.02" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest one-hour-before.mp4
echo "Done: one-hour-before.mp4"
