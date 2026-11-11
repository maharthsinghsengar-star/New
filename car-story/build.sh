#!/usr/bin/env bash
# Full pipeline: narration -> music -> frames -> final 1080x1920 MP4.
# Needs: ffmpeg, node + playwright (chromium), python3 with kokoro-onnx, soundfile, numpy.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build models
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -sSL -o models/kokoro-v1.0.onnx $REL/kokoro-v1.0.onnx
[ -f models/voices-v1.0.bin ]  || curl -sSL -o models/voices-v1.0.bin  $REL/voices-v1.0.bin
[ -d node_modules ] || npm install
python3 narration.py
python3 music.py
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs
# voice gets a gentle warm EQ; music sits low and ducks further under the voice
ffmpeg -y -v error -framerate 30 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -filter_complex "
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,equalizer=f=160:t=q:w=1:g=2,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=120,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.5[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=700[md];
  [v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest the-invention-of-the-car.mp4
echo "done: the-invention-of-the-car.mp4"
