# The History of Hot Wheels — animated stick-man short (16:9)

`the-history-of-hot-wheels.mp4` — 1920×1080, 30 fps, ~88 s. Thick 2D stick figures in a cel-shaded 3D world,
clear English narration, upbeat background music and small captions.

Unofficial, educational fan video; Hot Wheels is a trademark of Mattel. No logos or official artwork are used.

| File | Purpose |
| --- | --- |
| `narration.py` | Script, narration (Kokoro TTS) and the scene/subtitle timeline |
| `music.py` | Synthesized upbeat background track |
| `scene.js`, `index.html` | three.js sets (bedroom track, toy shop, studio, museum, outdoors), stick-figure rig, overlays |
| `render.mjs` | Frame capture in headless Chromium (`node render.mjs 12 40` renders preview stills) |
| `build.sh` | Runs the whole pipeline and mixes the final MP4 with ffmpeg |

Rebuild: `pip install kokoro-onnx soundfile numpy && ./build.sh` (needs ffmpeg, Node and Playwright's Chromium).
