# One Hour Before — FPV (Hiroshima & Nagasaki, August 1945)

A 9:16 first-person drone flight through the last hour before each bombing. No narration: soft ambient
sound and gentle captions only. ~79 s, 1080×1920, 30 fps.

- **Hiroshima, 6 Aug 1945 (7:15 → 8:15 AM)**: over the Seto Inland Sea, low along the river past
  fishing boats, under a wooden bridge, down a tram boulevard between two trams, over students clearing
  firebreaks, past the Industrial Promotion Hall (green copper dome), under the T-shaped Aioi Bridge,
  then up to the Enola Gay at altitude, then a white flash.
- **Nagasaki, 9 Aug 1945 (10:30 → 11:02 AM)**: the harbour with shipyard cranes and ships, low along
  the Urakami river between factory halls, over terraced hills to Urakami Cathedral, then up through a
  break in the clouds to Bockscar, then a white flash.
- **Ending**: dusk on Hiroshima's river with floating paper lanterns (tōrō nagashi) and the end-of-1945
  death tolls (about 140,000 and 74,000).

Everything is procedural three.js: physical sky with image-based lighting, PBR materials, procedural
terrain and river deltas with stone embankments, instanced Japanese houses (machiya, kura, shops with
noren, tiled roofs), trees, townspeople, trams, B-29 models with contrails, and soft sprite clouds.
The camera follows time-keyed Hermite splines with banking and slight FPV shake.

Sound (`music.py`): drone wind driven by camera speed, river water, cicadas, birds, a distant air-raid
siren and the all-clear, tram bells, firebreak work, a faint B-29 drone, gulls and a ship horn, evening
cicadas, wind chimes, and a soft koto/pad score. Everything cuts to silence at each flash.

Build: `./build.sh` (needs Playwright/Chromium, Python with numpy/scipy/soundfile, and ffmpeg).
`SKIP_RENDER=1` reuses rendered frames; `node render.mjs 12 30` renders preview stills.
