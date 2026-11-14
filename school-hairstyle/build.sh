#!/usr/bin/env bash
# Full pipeline: narration -> score + sound effects -> frames (1080x1920 @ 24 fps) -> captions -> final 9:16 MP4.
# Needs: ffmpeg (with libass), node + playwright (chromium), python3 with kokoro-onnx, soundfile, numpy.
# START=n resumes an interrupted frame render at frame n; SKIP_RENDER=1 re-encodes existing frames; SKIP_AUDIO=1 keeps the audio.
set -euo pipefail
cd "$(dirname "$0")"
export MODELS="${MODELS:-../car-story/models}"
mkdir -p build "$MODELS"
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$MODELS/kokoro-v1.0.onnx" ] || curl -sSL -o "$MODELS/kokoro-v1.0.onnx" $REL/kokoro-v1.0.onnx
[ -f "$MODELS/voices-v1.0.bin" ]  || curl -sSL -o "$MODELS/voices-v1.0.bin"  $REL/voices-v1.0.bin
[ -d node_modules ] || npm install
if [ -z "${START:-}${SKIP_AUDIO:-}" ]; then python3 narration.py; python3 music.py; fi
python3 subs.py
if [ -z "${SKIP_RENDER:-}" ]; then NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.mjs; fi
ffmpeg -y -v error -framerate 24 -i build/frames/f%05d.jpg -i build/voice.wav -i build/music.wav -i build/sfx.wav -filter_complex "
  [0:v]ass=build/subs.ass:fontsdir=fonts[vid];
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=80,equalizer=f=300:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1:g=4,highshelf=f=8000:g=2,acompressor=threshold=-20dB:ratio=3:attack=6:release=120:makeup=3,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.55[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=350[md];
  [3:a]aresample=48000,volume=0.8[fx];
  [v][md][fx]amix=inputs=3:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map "[vid]" -map "[a]" -c:v libx264 -preset slow -tune animation -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 160k -ar 48000 \
  -movflags +faststart -shortest school-hairstyle-checking.mp4
echo "done: school-hairstyle-checking.mp4"
