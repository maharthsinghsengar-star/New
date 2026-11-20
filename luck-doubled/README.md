# What if your luck doubled every day?

A 98-second, 16:9 (1920×1080, 30 fps) "what if" short in the same bright, stylised 3D city as `what-if-ghosts`, with
no voice. There are only small captions, a luck counter in the top-left corner (day and luck multiplier) and calm,
meditative music.

**Days:** 1 (×1) a normal morning → 4 (×8) every light turns green and a coin waits on the sidewalk → 7 (×64) a $100
bill floats into your hands → 10 (×512) four-leaf clovers sprout wherever you walk, with butterflies → 14 (×8,192) the
first lottery ticket wins the jackpot, with confetti and a cheering crowd → 18 (×131,072) the rain falls everywhere
except on you, under a sunbeam and a rainbow → 22 (×2,097,152) every tree blossoms as you pass → 26 (×33,554,432)
shooting stars and a four-leaf-clover constellation → 30 (×536,870,912) golden light rises around you in the middle of
the crossroads.

## Files
- `scene.js` / `index.html`: the whole film (`window.renderFrame(t)` is deterministic). It reuses the city, buildings, cars and sky from the ghosts video.
- `people.js` / `helpers.js`: articulated people (shared with `wanted-level`).
- `music.py`: soft pads, piano and bells (D major pentatonic, 60 bpm), singing-bowl chimes on each new day, gentle sounds for every lucky moment, nature ambience.
- `render.mjs`, `build.sh`: rendering and the full build.
