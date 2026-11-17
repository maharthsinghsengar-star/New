#!/usr/bin/env bash
# Timeline from the recording -> music/SFX -> frames -> MP4 (1080x1920, 30 fps).
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
mkdir -p build
if [ -z "${SKIP_AUDIO:-}" ]; then ffmpeg -y -loglevel error -i rec/voice.mp3 -ar 44100 -ac 1 build/voice.wav; python3 timeline.py; python3 music.py; fi
[ -n "${SKIP_RENDER:-}" ] || node render.mjs
OUT=major-somnath-sharma.mp4
ffmpeg -y -loglevel error -framerate 30 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -i build/sfx.wav -filter_complex "
  [1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=70,equalizer=f=3200:t=q:w=1:g=2.5,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.34[m];[3:a]aresample=48000,volume=0.4[s];[m][s]amix=inputs=2:normalize=0[bed];
  [bed][sc]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=500[bd];
  [v][bd]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT"
echo "done: $OUT"
