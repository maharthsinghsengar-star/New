# Hiroshima — FPV on foot (6 August 1945)

A first-person walking video (9:16, 1080×1920, 84 s), fully code-generated with three.js in headless Chromium.

**Flow:** a busy, sunny Hiroshima street at 8:13 AM (trams, bicycles, students, shops) → a silver B-29 high above →
the bomb falls → white flash → the fireball rises into a mushroom cloud → people run → you run into a concrete bank →
the cloud through the window → the blast wave (shattering glass, dust) → people crying in the dark → blackout →
"Minutes later": collapsed houses, fires, black rain, dazed survivors, the cloud towering over the city.

No dialogue: soft captions and a procedural soundscape (`music.py`).

- `scene.js` — world, articulated crowd, particle mushroom cloud, ruins, camera (`window.renderFrame(t)`)
- `timeline.json` — captions, clock and key times (burst, blast, aftermath)
- `render.mjs` — frame renderer; `build.sh` — full build
