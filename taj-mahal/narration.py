"""Generate the narration (Kokoro TTS, deep male voice) and the scene timeline."""
import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

# Deep, steady documentary voice: blend of two Kokoro male voices
BLEND, SPEED, LANG = {"bm_lewis": 0.55, "am_michael": 0.45}, 0.92, "en-us"
# Each scene: list of (spoken text, on-screen subtitle text)
SCENES = [
 [("In sixteen thirty-one, the Mughal emperor Shah Jahan lost his beloved wife, Mumtaz Mahal.",
   "In 1631, the Mughal emperor Shah Jahan lost his beloved wife, Mumtaz Mahal."),
  ("Heartbroken, he vowed to build her a tomb the world had never seen.",
   "Heartbroken, he vowed to build her a tomb the world had never seen.")],
 [("In sixteen thirty-two, work began on the banks of the Yamuna river, in Agra.",
   "In 1632, work began on the banks of the Yamuna river, in Agra."),
  ("Around twenty thousand workers came: masons, carvers, painters, and calligraphers.",
   "Around 20,000 workers came: masons, carvers, painters, and calligraphers.")],
 [("Pure white marble was brought from Makrana, nearly four hundred kilometres away.",
   "Pure white marble was brought from Makrana, nearly 400 kilometres away."),
  ("It is said that more than a thousand elephants helped carry the materials.",
   "It is said that more than 1,000 elephants helped carry the materials.")],
 [("Builders raised a giant brick scaffold around the tomb.", "Builders raised a giant brick scaffold around the tomb."),
  ("Slowly, the great dome rose, higher and higher, crowned with a golden finial.",
   "Slowly, the great dome rose, higher and higher, crowned with a golden finial.")],
 [("Artisans inlaid the marble with flowers of precious stones, like jade, lapis lazuli, and carnelian.",
   "Artisans inlaid the marble with flowers of precious stones, like jade, lapis lazuli and carnelian."),
  ("And verses were carved in elegant calligraphy around the great arches.",
   "And verses were carved in elegant calligraphy around the great arches.")],
 [("By sixteen fifty-three, after about twenty-two years, the Taj Mahal was complete.",
   "By 1653, after about 22 years, the Taj Mahal was complete."),
  ("Years later, Shah Jahan was laid to rest beside her.", "Years later, Shah Jahan was laid to rest beside her.")],
 [("Today, millions of people visit it every year.", "Today, millions of people visit it every year."),
  ("A monument to love, written in marble.", "A monument to love, written in marble.")],
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
