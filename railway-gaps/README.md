# Why Do Railway Tracks Have Gaps? (9:16 story short)

A 64-second vertical story in the 2.5D stickman style: flat outlined characters with big white heads and
noodle limbs in warm, textured 3D sets with depth of field. Leo spots gaps in the track while waiting for his train,
and his grandpa, a retired railway engineer, explains thermal expansion, sun kinks, the clickety-clack and welded rail.

- `narration.py` – narrator, Leo and Grandpa (Kokoro TTS) plus the shot / caption / sound-effect timeline
- `music.py` – light storytelling score and train / workshop sound effects (synthesised)
- `subs.py` – 1-2 word Shorts-style captions and sound-effect stamps
- `scene.js` – three.js sets, characters, depth of field + grade, one shot per beat (`window.renderFrame(t)`)
- `render.mjs` – renders 1080x1920 frames at 24 fps in headless Chromium
- `build.sh` – runs everything and encodes `why-railway-tracks-have-gaps.mp4`
