# School ka Hairstyle Checking (9:16 comedy short)

A 92-second vertical animated short: flat 2D cartoon characters in a vibrant cel-shaded 3D school.
The premise (morning hairstyle checking, the spikes kids, the PT sir) is inspired by a stand-up bit by
Aakash Gupta; the script, jokes, voices, music and animation here are original.

- `narration.py` – Hindi narration with three Kokoro voices (narrator, PT sir, Bunty) and the shot / caption / sound-effect timeline
- `music.py` – bouncy comedy score and cartoon sound effects (whistle, boing, bell, rimshot …), all synthesised
- `subs.py` – bold pop-up Hinglish captions with highlighted key words, plus on-screen stamps
- `scene.js` – the school set, the characters and one shot function per beat (`window.renderFrame(t)`)
- `render.mjs` – renders 1080x1920 frames at 24 fps in headless Chromium
- `build.sh` – runs everything and encodes `school-hairstyle-checking.mp4`

Run `./build.sh` (needs ffmpeg with libass, node + playwright, python3 with kokoro-onnx, soundfile, numpy).
