# Major Somnath Sharma — animated short (9:16)

`major-somnath-sharma.mp4` is 1080×1920 at 30 fps, about 68 s long, and is cut to the supplied voice-over (`rec/voice.mp3`). It covers the Battle of Badgam (3 November 1947) and the first Param Vir Chakra.

- **Style:** the vibrant cel-shaded 3D world of *The Invention of the Car*: painted trees and clouds, sky gradients and soft shadows.
- **Characters:** short, round cartoon soldiers drawn in `chibi.js`.
- **Photo:** the supplied photograph of Major Somnath Sharma (`assets/somnath.jpg`) appears for one second as his name is first spoken.
- `timeline.py` builds the beat and caption timeline from Whisper word timings of the recording (`rec/words.json`).
- `music.py` synthesises the score and sound effects.
- `scene.js` and `index.html` hold the sets, staging and overlays.
- `build.sh` mixes and encodes the video.
