#!/usr/bin/env bash
# Full pipeline: narration -> score + sound effects -> frames (1280x720 @ 24 fps) -> graphics -> final 1920x1080 MP4.
# Needs: ffmpeg (with libass), node + playwright (chromium), python3 with kokoro-onnx, soundfile, numpy, scipy.
# START=n resumes an interrupted render at frame n; SKIP_RENDER=1 re-encodes existing frames; SKIP_AUDIO=1 keeps the audio.
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
  [0:v]scale=1920:1080:flags=lanczos,unsharp=5:5:0.45,ass=build/subs.ass:fontsdir=fonts[vid];
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,equalizer=f=250:t=q:w=1.2:g=-1.5,equalizer=f=3000:t=q:w=1:g=3,highshelf=f=8000:g=1.5,acompressor=threshold=-20dB:ratio=3:attack=6:release=150:makeup=2,aecho=0.85:0.3:40|80:0.08|0.05,asplit=2[v][sc];
  [2:a]aresample=48000,volume=0.9[m];
  [m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=600[md];
  [3:a]aresample=48000,volume=0.75[fx];
  [v][md][fx]amix=inputs=3:normalize=0,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=14[a]" \
  -map "[vid]" -map "[a]" -c:v libx264 -preset slow -crf 26 -maxrate 1150k -bufsize 3M -pix_fmt yuv420p -r 24 -c:a aac -b:a 128k -ar 48000 \
  -movflags +faststart -shortest the-assassination-of-osama-bin-laden.mp4
echo "done: the-assassination-of-osama-bin-laden.mp4"
