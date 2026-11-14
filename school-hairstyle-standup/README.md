# Hairstyle Problem in Schools — animated to the stand-up audio (9:16)

A 63-second vertical animation whose shots and captions are hand-timed to `standup.mp3`
(a stand-up clip by Aakash Gupta, supplied by the repo owner). The audio is used unchanged as the soundtrack;
no extra voice or music is added.

- `timeline.py` – beat boundaries and Hinglish captions timed to the audio
- `subs.py` – pop-up captions with highlighted words, plus on-screen stamps
- `scene.js` – the school set, the characters and one shot function per beat (`window.renderFrame(t)`)
- `render.mjs` – renders 1080x1920 frames at 24 fps in headless Chromium
- `build.sh` – runs everything and encodes `hairstyle-problem-in-schools.mp4`
