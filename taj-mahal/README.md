# The Building of the Taj Mahal — animated short (9:16)

`the-building-of-the-taj-mahal.mp4` is 1080×1920 at 30 fps, about 88 s long. It is made in the same style as *The Invention of the Car*: a cel-shaded, anime-style 3D world, a year header with an info pill, big word captions, and a deep documentary narration.

The characters keep stick-figure arms and legs but have painted human faces and clothed bodies. They include Shah Jahan, Mumtaz Mahal, the architect, the workers, the artisans and modern tourists, all in bright Mughal-era and modern clothes.

| File | Purpose |
| --- | --- |
| `narration.py` | Script, narration (Kokoro TTS) and the scene and subtitle timeline |
| `music.py` | Tanpura drone, pad, and sitar-like plucks in raag Yaman |
| `humans.js` | Painted faces (expressions, turbans, veils, beards) and clothed torsos |
| `scene.js`, `index.html` | three.js scenes (procedural Taj Mahal with construction stages, scaffold, elephants, workshop, gardens) and text overlays |
| `render.mjs` | Frame capture in headless Chromium |
| `build.sh` | Runs the whole pipeline and mixes the MP4 |
