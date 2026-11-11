"""Generate the narration (Kokoro TTS, deep male voice) and the scene timeline."""
import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

# Deep, steady documentary voice: blend of two Kokoro male voices
BLEND, SPEED, LANG = {"bm_lewis": 0.55, "am_michael": 0.45}, 0.92, "en-us"
# Each scene: list of (spoken text, on-screen subtitle text)
SCENES = [
 [("For thousands of years, the world moved at the speed of a horse.",
   "For thousands of years, the world moved at the speed of a horse."),
  ("But a few restless dreamers wanted more.", "But a few restless dreamers wanted more.")],
 [("In seventeen sixty-nine, French engineer Nicolas-Joseph Coon-yo built a steam-powered wagon.",
   "In 1769, French engineer Nicolas-Joseph Cugnot built a steam-powered wagon."),
  ("It was heavy, slow, and famously hard to stop.", "It was heavy, slow, and famously hard to stop.")],
 [("Then, in eighteen seventy-six, Nikolaus Otto perfected the four-stroke engine.",
   "Then, in 1876, Nikolaus Otto perfected the four-stroke engine."),
  ("Small, powerful, and ready to change everything.", "Small, powerful, and ready to change everything.")],
 [("In eighteen eighty-six, Karl Benz patented his Motor-wagen.",
   "In 1886, Karl Benz patented his Motorwagen."),
  ("Three wheels, one cylinder, and the first true automobile.",
   "Three wheels, one cylinder, and the first true automobile.")],
 [("But people doubted it.", "But people doubted it."),
  ("So in eighteen eighty-eight, Bertha Benz took the wheel, and drove over one hundred kilometres to prove them wrong.",
   "So in 1888, Bertha Benz took the wheel, and drove over 100 kilometres to prove them wrong.")],
 [("In nineteen oh-eight, Henry Ford introduced the Model T.", "In 1908, Henry Ford introduced the Model T."),
  ("Soon, his moving assembly line put the world on wheels.",
   "Soon, his moving assembly line put the world on wheels.")],
 [("Today, more than a billion cars travel our roads.", "Today, more than a billion cars travel our roads."),
  ("Electric, intelligent, and still evolving.", "Electric, intelligent, and still evolving."),
  ("All from one simple dream: to move freely.", "All from one simple dream: to move freely.")],
]
PRE, POST, GAP = 0.7, 0.9, 0.38
INTRO, OUTRO = 2.3, 3.2      # extra time for the title card / end card

def chunks(text, t0, t1, maxc=13):
    """Split a sentence into short subtitle chunks, timed by character share."""
    words, out, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxc:
            out.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    if len(out) > 1 and len(out[-1]) < 4:      # avoid orphan words
        last = out.pop(); out[-1] += " " + last
    total, t, res = sum(len(c) for c in out), t0, []
    for c in out:
        d = (t1 - t0) * len(c) / total
        res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return res

k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
VOICE = sum(k.get_voice_style(n) * w for n, w in BLEND.items())
sr, t, audio, timeline = 24000, 0.0, [], []
def silence(d):
    global t
    audio.append(np.zeros(int(round(d * sr)), dtype=np.float32)); t += int(round(d * sr)) / sr
for i, sc in enumerate(SCENES):
    start = t
    silence(PRE + (INTRO if i == 0 else 0))
    subs = []
    for j, (say, show) in enumerate(sc):
        s, _ = k.create(say, voice=VOICE, speed=SPEED, lang=LANG)
        s = s.astype(np.float32)
        subs += chunks(show, t, t + len(s) / sr)
        audio.append(s); t += len(s) / sr
        if j < len(sc) - 1: silence(GAP)
    silence(POST + (OUTRO if i == len(SCENES) - 1 else 0))
    timeline.append({"start": round(start, 3), "end": round(t, 3), "subs": subs})
    print(i, round(start, 2), round(t, 2))
a = np.concatenate(audio)
a *= 0.89 / np.abs(a).max()
sf.write("build/voice.wav", a, sr)
json.dump({"duration": round(t, 3), "scenes": timeline}, open("build/timeline.json", "w"), indent=1)
print("total", t)
