# The Invention of the Car — animated stick-man short (9:16)

`the-invention-of-the-car.mp4` — 1080×1920, 30 fps, ~79 s. 2D stick figures in a cel-shaded, anime-style 3D world,
male narration, soft background music, burned-in subtitles.

Everything is generated from code:

| File | Purpose |
| --- | --- |
| `narration.py` | Script + narration (Kokoro TTS, deep blended male voice) and the scene/subtitle timeline |
| `music.py` | Synthesized ambient pad + arpeggio background track |
| `scene.js`, `index.html` | three.js scenes, stick-figure rig, text overlays (`window.renderFrame(t)`) |
| `render.mjs` | Frame capture in headless Chromium (`node render.mjs 12 40` renders preview stills) |
| `build.sh` | Runs the whole pipeline and mixes the final MP4 with ffmpeg |

Rebuild: `pip install kokoro-onnx soundfile numpy && ./build.sh` (needs ffmpeg, Node and Playwright's Chromium).
