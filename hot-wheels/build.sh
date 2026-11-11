#!/usr/bin/env bash
# Full pipeline: narration -> music -> frames -> final 1920x1080 MP4.
# Needs: ffmpeg, node + playwright (chromium), python3 with kokoro-onnx, soundfile, numpy.
# START=n resumes an interrupted frame render at frame n.
set -euo pipefail
cd "$(dirname "$0")"
export MODELS="${MODELS:-../car-story/models}"
mkdir -p build "$MODELS"
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$MODELS/kokoro-v1.0.onnx" ] || curl -sSL -o "$MODELS/kokoro-v1.0.onnx" $REL/kokoro-v1.0.onnx
[ -f "$MODELS/voices-v1.0.bin" ]  || curl -sSL -o "$MODELS/voices-v1.0.bin"  $REL/voices-v1.0.bin
[ -d node_modules ] || npm install
if [ -z "${START:-}" ]; then python3 narration.py; python3 music.py; fi
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs
# voice: less mud, strong presence for clarity; music sits low and ducks under the voice
ffmpeg -y -v error -framerate 30 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -filter_complex "
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=75,equalizer=f=300:t=q:w=1.2:g=-2.5,equalizer=f=3300:t=q:w=1:g=4,highshelf=f=8000:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=6:release=120:makeup=2,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.4[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=600[md];
  [v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest the-history-of-hot-wheels.mp4
echo "done: the-history-of-hot-wheels.mp4"
