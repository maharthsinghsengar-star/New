# What if everyone except you became ghosts and zombies?

A 76-second, 16:9 (1920×1080, 30 fps) narrated "what if" short in a bright, stylised 3D look, rendered from code with three.js.

**Story:** a sunny, busy city morning → at exactly 8:00 everyone freezes → skin turns pale, eyes turn white → some people float up as glowing see-through ghosts → the rest twitch and turn into zombies that all look at you → the sky turns dark, with a red moon and flickering streetlights → the zombies chase you → you hide in a 24/7 store while zombies bang on the glass → the lights die, and a ghost comes through the back wall → jump scare → "So... would you survive?"

## Files
- `narration.py`: voiceover (Kokoro TTS) plus the beat, caption and sound-effect timeline (`build/timeline.json`, `build/voice.wav`).
- `scene.js` / `index.html`: the whole 3D film. It is deterministic: `window.renderFrame(t)` draws the frame for time `t`. The city, people (faces, hair, poses), ghosts and zombies, cars, the store interior, camera shots, lighting (day → horror night) and captions are all in code.
- `render.mjs`: renders frames with headless Chromium (`--dump` writes the event times to `build/track.json`).
- `music.py`: the procedural score and sound design: city groove, a tape-stop at the freeze, ticking clock, eerie music box, thunder, chase drums, glass bangs and the jump-scare stinger. It also mixes in the narration.
- `build.sh`: the full build → `what-if-ghosts.mp4`.

The road uses a tight camera depth range (0.15–1500 m), no overlapping road and ground planes, and road markings drawn with polygon offset. This means no z-fighting or flicker on the street.
