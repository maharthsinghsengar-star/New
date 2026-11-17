# SAHI CLICK – Mega Visitor Day (9:16 promo)

A vertical (1080×1920, 30 fps) promotional video. Human-like 2D illustrated characters (Jitu bhaiya, Raj and Raj's wife) act out the Hindi script inside vibrant 3D Diwali sets: a lit house exterior with fireworks, a festive living room, and a glowing business-network world. It ends on the event card.

- `people.js` draws the characters procedurally on canvas. It handles faces, expressions, blinking, lip-sync, arm and hand gestures, and the kurta, Nehru jacket and saree outfits.
- `scene.js` holds the three.js sets, camera direction, graphics cards, captions and the final screen. It is rendered frame by frame through `window.renderFrame(t)`.
- `narration.py` produces the Hindi dialogue at a natural pace with Piper neural Hindi voices: Jitu `hi_IN-pratham`, Raj `hi_IN-rohan`, wife `hi_IN-priyamvada`, closing line in Jitu's voice. The voice models (not committed) go in `voices/`, from the piper-voices release. It also writes the timeline and the mouth envelopes.
- `music.py` synthesises a festive dhol/santoor-style score and the sound effects.
- `build.sh` runs the full pipeline and writes `sahi-click-mega-visitor-day.mp4`.
