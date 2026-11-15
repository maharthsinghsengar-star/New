# The Assassination of Osama bin Laden — documentary reconstruction (16:9, ~10 min)

A narrated documentary built entirely from code: PBR 3D sets in three.js (terrain, Abbottabad and the compound,
stealth Black Hawks and a Chinook, the Situation Room, CIA offices, the carrier, Washington crowds), rendered with
film, night-vision, thermal-drone and satellite looks, plus chapter cards, lower-thirds and subtitles.
It is a dramatised reconstruction based on public accounts; real people appear only as faceless silhouettes and
the raid is shown without graphic violence.

- `narration.py` – script (Kokoro TTS) and the beat / caption / sound-effect timeline
- `music.py` – documentary score (drones, piano, tension pulse, hits) and sound effects
- `subs.py` – subtitles, title, chapter cards, lower-thirds, data callouts, credits (ASS)
- `scene.js` – sets, aircraft, figures, post-processing and one shot per beat (`window.renderFrame(t)`)
- `render.mjs` – renders 1280x720 frames at 24 fps in headless Chromium (`START`/`END` for ranges)
- `build.sh` – runs everything, upscales to 1080p and encodes `the-assassination-of-osama-bin-laden.mp4`
