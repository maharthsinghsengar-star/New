"""Story narration (Kokoro TTS): a dramatic storyteller plus one prison guard, and the shot / caption / sound-effect timeline."""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
st = k.get_voice_style
VOICES = {   # speaker -> (style, speed, pitch factor, lang)
    "n": (st("am_michael") * 0.7 + st("am_fenrir") * 0.3, 1.1, 1.0, "en-us"),
    "g": (st("am_onyx") * 0.8 + st("am_adam") * 0.2, 1.05, 0.92, "en-us"),
}
SR = 24000
BEATS = [
 dict(id="intro", lines=[("n", "Some prisons were built to be impossible to escape.", 0.15), ("n", "Some prisoners took that as a challenge.", 0.25)], sfx=[("slam", 0, 0, 0.1), ("whoosh", 1, 1, 0.0)]),
 dict(id="rock", lines=[("n", "June, nineteen sixty-two. Alcatraz, America's toughest prison, on an island surrounded by icy water and deadly currents.", 0.2)], sfx=[("waves", 0, 0, 0.0), ("gull", 0, 0, 1.5)]),
 dict(id="dig", lines=[("n", "For months, Frank Morris and brothers John and Clarence Anglin chipped through their cell walls, with sharpened spoons.", 0.2)], sfx=[("scrape", 0, 0, 1.2), ("scrape", 0, 1, -1.8)]),
 dict(id="heads", lines=[("n", "They made fake heads from soap, toilet paper and real hair, and tucked them into their beds.", 0.2)], sfx=[("pop", 0, 1, -1.2)]),
 dict(id="roof", lines=[("n", "Then they climbed to the roof, and slipped into the bay on a raft made from more than fifty raincoats.", 0.2)], sfx=[("siren", 0, 0, 0.5), ("splash", 0, 1, -1.6)]),
 dict(id="morning", lines=[("g", "Morris! Wake up!", 0.25), ("n", "The head rolled onto the floor.", 0.3)], sfx=[("knock", 0, 0, -0.3), ("thud", 1, 0, 0.6), ("sting", 1, 1, -0.2)]),
 dict(id="gone", lines=[("n", "The three men were never found.", 0.35)], sfx=[("dun", 0, 0, 0.2)]),
 dict(id="chapo", lines=[("n", "In twenty fifteen, Mexican drug lord El Chapo stepped into his shower, and vanished.", 0.2)], sfx=[("shower", 0, 0, 0.6), ("whoosh", 0, 1, -0.5)]),
 dict(id="tunnel", lines=[("n", "Beneath it was a tunnel, one and a half kilometres long, with lights, air pipes, and a motorbike on rails.", 0.15), ("n", "He was caught again six months later.", 0.25)], sfx=[("motor", 0, 0, 2.5), ("cuffs", 1, 1, -0.6)]),
 dict(id="heli", lines=[("n", "And in France, Pascal Payet escaped by helicopter.", 0.15), ("n", "Not once, but twice.", 0.3)], sfx=[("heli", 0, 0, 0.0), ("ding", 1, 1, -0.5)]),
 dict(id="outro", lines=[("n", "Thick walls, high towers, icy water.", 0.15), ("n", "And still, one of the greatest escapes in history began with a spoon.", 1.6)], sfx=[("ting", 1, 1, -0.6)]),
]
PRE = 0.12
def repitch(a, f):
    if abs(f - 1) < 1e-3: return a
    m = int(len(a) / f); return np.interp(np.linspace(0, len(a) - 1, m), np.arange(len(a)), a).astype(np.float32)
def trim(s, thr=0.01):
    idx = np.where(np.abs(s) > thr)[0]; return s if len(idx) == 0 else s[max(0, idx[0] - 400): idx[-1] + 1800]
NUM = {"nineteen sixty-two": "1962", "twenty fifteen": "2015", "one and a half kilometres": "1.5 km"}
def words(text, t0, t1):
    for a, b in NUM.items(): text = text.replace(a, b.replace(" ", "_"))
    w = text.split(); out = []; i = 0
    while i < len(w):
        c = w[i]
        if i + 1 < len(w) and len(c) + len(w[i + 1]) <= 9 and not re.search(r"[.,?!]$", c): c += " " + w[i + 1]; i += 1
        out.append(c.replace("_", " ")); i += 1
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
