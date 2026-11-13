"""Narration (Kokoro TTS): a low, steady narrator plus distinct character voices -> voice.wav + timeline.json"""
import json, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from story import BEATS

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin"); st = k.get_voice_style
# speaker -> (voice style, speed, pitch factor, gain)
V = {
 "n": (st("bm_lewis") * 0.65 + st("am_michael") * 0.35, 1.33, 0.96, 1.0),
 "g": (st("bm_george"), 1.12, 0.95, 0.95),
 "f": (st("am_michael"), 1.15, 1.0, 0.95),
 "m": (st("af_bella"), 1.15, 1.0, 0.95),
 "a": (st("am_puck"), 1.15, 1.06, 0.95),
 "l": (st("af_heart"), 1.1, 1.2, 0.9),
 "w": (st("bm_george") * 0.5 + st("am_onyx") * 0.5, 0.98, 0.87, 1.0),
 "o": (st("am_eric"), 1.18, 0.98, 0.95),
}
SR, GAP, PRE = 24000, 0.2, 0.15
def repitch(a, f):
    if abs(f - 1) < 1e-3: return a
    return np.interp(np.linspace(0, len(a) - 1, int(len(a) / f)), np.arange(len(a)), a).astype(np.float32)
def chunks(text, t0, t1, maxc=64):
    words, out, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxc: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    if len(out) > 1 and len(out[-1]) < 12: last = out.pop(); out[-1] += " " + last
    total, t, res = sum(len(c) for c in out), t0, []
    for c in out:
        d = (t1 - t0) * len(c) / total; res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return res
SHOW = {"Bhaiyaa?": "Bhaiya…?", "Bhaiyaa! Please take me home! I'm scared!": "Bhaiya! Please take me home! I'm scared!", "around two A M,": "around 2 AM,"}
t, audio, beats = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
silence(3.0)                                  # room for the opening title
for b in BEATS:
    start = t if beats else 0.0; silence(PRE); lines, subs = [], []
    for who, text in b["lines"]:
        style, speed, pf, gain = V[who]
        s, _ = k.create(text, voice=style, speed=speed / pf, lang="en-us" if who not in "ng" else "en-gb")
        s = repitch(s.astype(np.float32), pf); s *= gain * 0.9 / np.abs(s).max()
        show = text
        for a_, b_ in SHOW.items(): show = show.replace(a_, b_)
        if who != "n": show = "“" + show + "”"
        lines.append({"who": who, "t0": round(t, 3), "t1": round(t + len(s) / SR, 3)})
        subs += chunks(show, t, t + len(s) / SR)
        audio.append(s); t += len(s) / SR; silence(GAP)
    silence(b["pause"])
    beats.append({"id": b["id"], "tension": b["tension"], "start": round(start, 3), "end": round(t, 3), "lines": lines, "subs": subs,
                  "sfx": [{"name": n_, "t": round((lines[i]["t0"] if w == "start" else lines[i]["t1"]) + off, 3)} for n_, i, w, off in b["sfx"]]})
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "beats": beats}, open("build/timeline.json", "w"), indent=1)
print("beats", len(beats), "total", round(t, 1), "s =", round(t / 60, 2), "min")
