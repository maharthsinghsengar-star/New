# How the World Map Changed in 1000 Years

A 9:16 (1080×1920, 30 fps) map documentary short: a realistic 3D globe whose political borders morph from the year 1000 to today, with narration, captions, music and sound effects.

Pipeline (`./build.sh`):

1. `fetch_data.sh` downloads the source data (not committed).
2. `prep.py` builds the satellite composite (8K land + Blue Marble oceans), a land mask and, for each year, a colour-fill texture, a border texture and label anchors. It fixes known gaps in the dataset (e.g. colonies marked independent in 1920–1960, dominions coloured British).
3. `narration.py` uses Kokoro TTS (`af_heart`, normal speed) for the voice and writes the beat timeline (`build/timeline.json`).
4. `music.py` synthesises the underscore and whooshes.
5. `render.mjs` renders `scene.js` frame by frame in headless Chromium (three.js).
6. ffmpeg mixes the audio (music ducked under the voice) and encodes the MP4.

## Credits

- Historical borders: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik (GPL-3.0). It is approximate, and some years were corrected by hand.
- Modern borders and land: [Natural Earth](https://www.naturalearthdata.com/) (public domain).
- Imagery: NASA Blue Marble (public domain); Solar System Scope 8K Earth texture (CC BY 4.0).
