#!/usr/bin/env bash
# Full pipeline: narration -> score -> frames (1280x720 @ 24 fps) -> captions -> final 1920x1080 MP4.
# Needs: ffmpeg (with libass), node + playwright (chromium), python3 with kokoro-onnx, soundfile, numpy.
# START=n resumes an interrupted frame render at frame n (skips narration and score).
set -euo pipefail
cd "$(dirname "$0")"
export MODELS="${MODELS:-../car-story/models}"
mkdir -p build "$MODELS"
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$MODELS/kokoro-v1.0.onnx" ] || curl -sSL -o "$MODELS/kokoro-v1.0.onnx" $REL/kokoro-v1.0.onnx
[ -f "$MODELS/voices-v1.0.bin" ]  || curl -sSL -o "$MODELS/voices-v1.0.bin"  $REL/voices-v1.0.bin
[ -d node_modules ] || npm install
if [ -z "${START:-}" ]; then python3 narration.py; python3 music.py; fi
python3 subs.py
if [ -z "${SKIP_RENDER:-}" ]; then NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs; fi
# picture: upscale to 1080p, captions drawn at full resolution. sound: clear voice with a little room, score ducking under it
ffmpeg -y -v error -framerate 24 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -filter_complex "
  [0:v]scale=1920:1080:flags=lanczos,unsharp=5:5:0.5,ass=build/subs.ass[vid];
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,equalizer=f=300:t=q:w=1.2:g=-2,equalizer=f=3300:t=q:w=1:g=4,highshelf=f=8000:g=2,acompressor=threshold=-20dB:ratio=3:attack=6:release=120:makeup=2,aecho=0.85:0.4:55|110:0.12|0.07,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.95[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=500[md];
  [v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=13[a]" \
  -map "[vid]" -map "[a]" -c:v libx264 -preset slow -tune animation -crf 26 -maxrate 1300k -bufsize 4M -pix_fmt yuv420p -r 24 -c:a aac -b:a 128k -ar 48000 \
  -movflags +faststart -shortest the-strange-neighbour.mp4
echo "done: the-strange-neighbour.mp4"
