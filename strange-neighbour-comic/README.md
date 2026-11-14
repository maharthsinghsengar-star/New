# The Strange Neighbour — horror-comic style (16:9)

`the-strange-neighbour-comic.mp4` — 1920×1080, 24 fps, ~11.7 min. Flat 2D characters in a 3D world, drawn through a comic pass:
black ink outlines, halftone-dot shading, a muted print palette, flickering lights, a panel border,
small caption boxes and sound-effect lettering. Slower, clearer character voices; horror score with effects.

| File | Purpose |
| --- | --- |
| `story.py` | The story split into 68 beats (lines, speakers, tension level, sound-effect cues) |
| `narration.py` | Voices (Kokoro TTS) and the beat/caption timeline |
| `music.py` | Synthesized horror score and effects driven by the timeline |
| `scene.js`, `index.html` | three.js world, 2D character rig, one shot per beat, comic post-process shader |
| `subs.py`, `fonts/` | Comic lettering (caption boxes, sound-effect words, title cards) as an ASS file; Comic Neue and Bangers (SIL OFL) |
| `render.mjs` | Frame capture in headless Chromium (`node render.mjs 12 40` renders preview stills) |
| `build.sh` | Runs the whole pipeline and mixes the final MP4 with ffmpeg (`START=n` resumes a render) |
