#!/usr/bin/env bash
# Full pipeline: narration -> music -> frames -> final 1080x1920 MP4.
# Needs: ffmpeg, node + playwright (chromium), python3 with kokoro-onnx, soundfile, numpy.
set -euo pipefail
cd "$(dirname "$0")"
export MODELS="${MODELS:-../car-story/models}"
mkdir -p build "$MODELS"
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$MODELS/kokoro-v1.0.onnx" ] || curl -sSL -o "$MODELS/kokoro-v1.0.onnx" $REL/kokoro-v1.0.onnx
[ -f "$MODELS/voices-v1.0.bin" ]  || curl -sSL -o "$MODELS/voices-v1.0.bin"  $REL/voices-v1.0.bin
[ -d node_modules ] || npm install
python3 narration.py
python3 music.py
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs
# voice: warmth, less mud, presence for clarity, a touch of room; music sits low and ducks under the voice
ffmpeg -y -v error -framerate 30 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -filter_complex "
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,equalizer=f=130:t=q:w=1:g=2,equalizer=f=320:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1:g=4.5,highshelf=f=7500:g=3,acompressor=threshold=-20dB:ratio=3:attack=6:release=120:makeup=2,aecho=0.8:0.5:38|71:0.1|0.06,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.5[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=700[md];
  [v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest hiran-aur-bandar.mp4
echo "done: hiran-aur-bandar.mp4"
