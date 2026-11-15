"""Story narration (Kokoro TTS): narrator, young Leo and his grandpa, plus the shot / caption / sound-effect timeline."""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
st = k.get_voice_style
VOICES = {   # speaker -> (style, speed, pitch factor, lang)
    "n": (st("am_michael") * 0.75 + st("am_fenrir") * 0.25, 1.08, 1.0, "en-us"),
    "l": (st("am_puck") * 0.6 + st("af_bella") * 0.4, 1.06, 1.16, "en-us"),
    "g": (st("bm_george") * 0.8 + st("bm_lewis") * 0.2, 0.98, 0.9, "en-gb"),
}
SR = 24000
# beat: id, lines (speaker, spoken text, pause after), sfx (name, line, 0 = start / 1 = end, offset)
BEATS = [
 dict(id="station", lines=[("n", "Leo was waiting for his train, when he spotted something odd.", 0.2)], sfx=[("horn", 0, 0, 0.3)]),
 dict(id="gap", lines=[("n", "Every few metres, the railway track had a tiny gap.", 0.2)], sfx=[("ding", 0, 1, -0.6)]),
 dict(id="ask", lines=[("l", "Grandpa, isn't that dangerous? What if the train falls in?", 0.25)], sfx=[]),
 dict(id="laugh", lines=[("n", "Grandpa, a retired railway engineer, just laughed.", 0.15), ("g", "Those gaps keep you safe, Leo. Let me tell you why.", 0.3)], sfx=[("whoosh", 1, 1, 0.0)]),
 dict(id="heat", lines=[("n", "Steel grows when it gets hot. On a scorching summer day, rails can heat up past fifty degrees.", 0.15)], sfx=[("sizzle", 0, 0, 1.0)]),
 dict(id="grow", lines=[("n", "A one kilometre rail can stretch by more than half a metre.", 0.2)], sfx=[("stretch", 0, 0, 1.2)]),
 dict(id="kink", lines=[("n", "With no room to grow, the rails push against each other, until they bend sideways.", 0.15), ("n", "Engineers call it a sun kink.", 0.15)], sfx=[("groan", 0, 1, -1.4), ("boing", 0, 1, -0.3)]),
 dict(id="danger", lines=[("n", "And a train can derail on it!", 0.5)], sfx=[("horn", 0, 0, -0.1), ("screech", 0, 0, 0.9)]),
 dict(id="fix", lines=[("g", "So we leave small gaps. In summer, the steel grows into them, and the track stays straight.", 0.2)], sfx=[("pop", 0, 0, 3.4), ("ding", 0, 1, -0.4)]),
 dict(id="clack", lines=[("n", "And that clickety clack you hear on trains? That's the wheels rolling over those gaps.", 0.2)], sfx=[("clack", 0, 0, 0.2)]),
 dict(id="leo", lines=[("l", "So the gaps save the train!", 0.15)], sfx=[]),
 dict(id="welded", lines=[("n", "Today, many tracks are welded into one long rail, and clamped down so tightly, it can't bend.", 0.15)], sfx=[("weld", 0, 0, 0.6), ("clunk", 0, 1, -1.3)]),
 dict(id="breathe", lines=[("g", "But the idea is the same. Even steel needs a little room to breathe.", 0.3)], sfx=[]),
 dict(id="arrive", lines=[("n", "Clickety clack, and Leo's train rolled in.", 1.8)], sfx=[("train", 0, 0, -0.4), ("horn", 0, 1, 0.1)]),
]
PRE = 0.12

def repitch(a, f):
    if abs(f - 1) < 1e-3: return a
    m = int(len(a) / f); return np.interp(np.linspace(0, len(a) - 1, m), np.arange(len(a)), a).astype(np.float32)
def trim(s, thr=0.01):
    idx = np.where(np.abs(s) > thr)[0]; return s if len(idx) == 0 else s[max(0, idx[0] - 400): idx[-1] + 1800]
def words(text, t0, t1):   # 1-2 word caption chunks, timed by character count
    w = text.replace("clickety clack", "clickety-clack").split(); out = []; i = 0
    while i < len(w):
        c = w[i]
        if i + 1 < len(w) and len(c) + len(w[i + 1]) <= 9 and not re.search(r"[.,?!]$", c): c += " " + w[i + 1]; i += 1
        out.append(c); i += 1
    L = [len(c) + 2 for c in out]; tot = sum(L); t = t0; res = []
    for c, l in zip(out, L):
        dd = (t1 - t0) * l / tot; res.append({"text": c.upper(), "t0": round(t, 3), "t1": round(t + dd, 3)}); t += dd
    return res

t, audio, beats = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
for b in BEATS:
    start = t; subs, lines = [], []; silence(PRE)
    for who, text, pause in b["lines"]:
        style, speed, pf, lang = VOICES[who]
        s, _ = k.create(text, voice=style, speed=speed / pf, lang=lang)
        s = trim(repitch(s.astype(np.float32), pf)); s *= 0.9 / np.abs(s).max(); d = len(s) / SR
        subs += words(text, t, t + d - 0.05); lines.append({"who": who, "t0": round(t, 3), "t1": round(t + d, 3)})
        audio.append(s); t += d; silence(pause)
    sfx = [{"name": nm, "t": round((lines[li]["t1"] if pos else lines[li]["t0"]) + off, 3)} for nm, li, pos, off in b["sfx"]]
    beats.append({"id": b["id"], "start": round(start, 3), "end": round(t, 3), "lines": lines, "subs": subs, "sfx": sfx})
    print(f"{b['id']:8s} {start:6.2f} {t:6.2f}  " + " ".join(f"{l['who']}:{l['t0']-start:.2f}-{l['t1']-start:.2f}" for l in lines))
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "beats": beats}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2))
