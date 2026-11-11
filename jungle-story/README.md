# हिरण और बंदर — animated Hindi moral story (9:16)

`hiran-aur-bandar.mp4` — 1080×1920, 30 fps, ~102 s. 2D cartoon deer and monkey in a cel-shaded 3D jungle,
Hindi storytelling narration with separate character voices, background score and small captions.

| File | Purpose |
| --- | --- |
| `narration.py` | Story script, Hindi voices (Kokoro TTS) and the scene/subtitle timeline |
| `music.py` | Synthesized score: warm theme, trap tension, sad theme, birdsong |
| `scene.js`, `index.html` | three.js jungle, character rigs, choreography, captions |
| `render.mjs` | Frame capture in headless Chromium (`node render.mjs 12 40` renders preview stills) |
| `timeline_vo.py`, `build-vo.sh` | Version cut to a supplied voiceover (`voiceover.mp3`): scene timing from the recording, no captions → `hiran-aur-bandar-voiceover.mp4` |
| `build.sh` | Runs the whole pipeline and mixes the final MP4 with ffmpeg |

Rebuild: `pip install kokoro-onnx soundfile numpy && ./build.sh` (needs ffmpeg, Node and Playwright's Chromium).
