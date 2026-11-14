# The Strange Neighbour — brick-toy style horror story (16:9)

`the-strange-neighbour-brick.mp4` — 1920×1080, 24 fps, ~11.7 min. 3D minifigure characters in a studded plastic world, muted colour grade, flickering lights,
slower and clearer character voices, horror score with sound effects, small non-bold captions. Unofficial; not affiliated with any toy brand.

| File | Purpose |
| --- | --- |
| `story.py` | The story split into 68 beats (lines, speakers, tension level, sound-effect cues) |
| `narration.py` | Voices (Kokoro TTS) and the beat/caption timeline |
| `music.py` | Synthesized horror score and effects driven by the timeline |
| `scene.js`, `index.html` | three.js world (street, two houses, mansion interior, basement), 2D character rig, one shot per beat |
| `subs.py` | Captions and title cards as an ASS file |
| `render.mjs` | Frame capture in headless Chromium (`node render.mjs 12 40` renders preview stills) |
| `build.sh` | Runs the whole pipeline and mixes the final MP4 with ffmpeg (`START=n` resumes a render) |

Rebuild: `pip install kokoro-onnx soundfile numpy && ./build.sh` (needs ffmpeg with libass, Node and Playwright's Chromium).
