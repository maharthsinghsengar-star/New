"""Inspiring cinematic underscore (pads, arpeggio pulse, soft drums, piano) + whooshes on every map morph."""
import json, numpy as np, soundfile as sf
from scipy.signal import lfilter, fftconvolve

sr = 44100
TL = json.load(open("build/timeline.json"))
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(5)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
T = lambda d: np.arange(int(d * sr)) / sr
tt = np.arange(n) / sr
def buf(): return np.zeros((2, n))
def add(B, sig, start, pan=0.5, g=1.0):
    i = int(max(0, start) * sr)
    if i >= n: return
    sig = sig[: n - i] * g; B[0, i:i + len(sig)] += sig * np.cos(pan * np.pi / 2); B[1, i:i + len(sig)] += sig * np.sin(pan * np.pi / 2)
lp = lambda x, a: lfilter([a], [1, a - 1], x)
def reverb(B, secs=2.6, mix=0.3):
    k = T(secs); ir = rng.normal(0, 1, (2, len(k))) * np.exp(-k * 6.5 / secs); ir[:, :int(0.012 * sr)] = 0
    for c in range(2): ir[c] = lp(ir[c], 0.35)
    wet = np.stack([fftconvolve(B[c], ir[c])[:n] for c in range(2)]); wet *= np.abs(B).max() / (np.abs(wet).max() + 1e-9)
    return B * (1 - mix) + wet * mix

BPM = 96; beat = 60 / BPM; bar = beat * 4
# energy curve: gentle intro, builds through the empires, peaks in the 20th century, resolves at the end
def bstart(i): return TL["beats"][i]["start"]
ids = [b["id"] for b in TL["beats"]]
E = np.interp(tt, [0, bstart(ids.index("eu1000")), bstart(ids.index("mongol")), bstart(ids.index("americas")), bstart(ids.index("africa")),
                   bstart(ids.index("ww1")), bstart(ids.index("decol")), bstart(ids.index("today")), bstart(ids.index("outro")), dur],
              [0.25, 0.45, 0.65, 0.7, 0.8, 1.0, 0.9, 0.85, 0.45, 0.3])
# D major-ish progression: D  A/C#  Bm  G   | D  A  G  A
PROG = [[50, 57, 62, 66], [49, 57, 61, 64], [47, 54, 59, 62], [43, 50, 59, 62], [50, 57, 62, 66], [45, 52, 61, 64], [43, 50, 59, 62], [45, 52, 57, 61]]
M = buf()
# pads: detuned saws, slow attack, low-passed
nb = int(dur / bar) + 2
for i in range(nb):
    ch = PROG[i % 8]; t0 = i * bar; d = bar + 1.2; t = T(d); e = np.clip(t / 0.9, 0, 1) * np.clip((d - t) / 1.2, 0, 1)
    s = np.zeros(len(t))
    for m in ch:
        for dt in (-0.08, 0.0, 0.09):
            ph = hz(m + dt) * t; s += (2 * (ph % 1) - 1) * (0.9 if m < 52 else 0.55)
    s = lp(lp(s, 0.05), 0.08) * e
    add(M, s * 0.05, t0, 0.35 + 0.3 * (i % 2))
# sub bass on roots
for i in range(nb):
    t0 = i * bar; t = T(bar); f = hz(PROG[i % 8][0] - 12)
    add(M, np.sin(2 * np.pi * f * t) * np.clip(t / 0.05, 0, 1) * np.clip((bar - t) / 0.3, 0, 1) * 0.16, t0)
# arpeggio pulse (16ths), plucky, gain follows energy
k = 0
while k * beat / 4 < dur:
    t0 = k * beat / 4; e = E[min(n - 1, int(t0 * sr))]
    ch = PROG[int(t0 / bar) % 8]; m = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24][k % 4]
    if e > 0.4:
        t = T(0.28); f = hz(m); s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sign(np.sin(2 * np.pi * f * t))) * np.exp(-t * 14)
        add(M, s * 0.035 * (e - 0.35) / 0.65, t0, 0.3 + 0.4 * ((k // 2) % 2))
    k += 1
# drums: soft kick on 1 & 3 once energy rises, light shaker, toms on big beats
D = buf(); k = 0
while k * beat < dur:
    t0 = k * beat; e = E[min(n - 1, int(t0 * sr))]
    if e > 0.6 and k % 2 == 0:
        t = T(0.4); add(D, np.sin(2 * np.pi * (46 + 70 * np.exp(-t * 28)) * t) * np.exp(-t * 9) * 0.32 * e, t0)
    if e > 0.75:
        for h in (0.5,):
            t = T(0.08); x = np.diff(rng.normal(0, 1, len(t)), prepend=0) * np.exp(-t * 60); add(D, x * 0.02 * e, t0 + h * beat, 0.7)
    k += 1
# piano: sparse melody over the top
MEL = [74, 73, 71, 69, 74, 76, 74, 73]
def piano(m, t0, v, pan):
    f = hz(m); t = T(3.5); s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.0 + h * 0.8)) / h ** 1.5 for h in range(1, 7))
    add(M, s * np.clip(t / 0.004, 0, 1) * v, t0, pan)
for i in range(nb):
    t0 = i * bar
    if t0 > dur - 2: break
    piano(MEL[i % 8], t0 + beat * 0.0, 0.05, 0.6)
    if E[min(n - 1, int(t0 * sr))] > 0.55: piano(MEL[(i + 3) % 8] - 5, t0 + beat * 2.5, 0.035, 0.4)
M = M + D
M = reverb(M, 2.8, 0.28)
# global fades
fade = np.clip(tt / 1.5, 0, 1) * np.clip((dur - tt) / 3.5, 0, 1)
M *= fade
M /= np.abs(M).max() + 1e-9
sf.write("build/music.wav", (M.T * 0.8).astype(np.float32), sr)

# ---------------------------------------------------------------- sfx: whoosh into every morph, deep hit on key moments
S = buf()
def whoosh(t0, d=1.6, g=0.5):
    t = T(d); x = rng.normal(0, 1, len(t)); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    a = 0.02 + 0.25 * env  # brighter in the middle
    y = np.zeros(len(t)); acc = 0.0
    for i0 in range(0, len(t), 512):
        seg = x[i0:i0 + 512]; aa = a[i0:i0 + 512].mean(); yy = lfilter([aa], [1, aa - 1], seg, zi=[acc * (1 - aa)])[0]; y[i0:i0 + 512] = yy; acc = yy[-1]
    y *= env; y /= np.abs(y).max() + 1e-9
    for c, p in ((0, 0.2), (1, 0.8)): add(S, y * np.sin(np.pi * np.clip(t / d, 0, 1)), t0, p if c == 0 else 1 - p, g * 0.5)
def boom(t0, g=0.6):
    t = T(3.0); s = np.sin(2 * np.pi * (36 + 30 * np.exp(-t * 6)) * t) * np.exp(-t * 1.6) + lp(rng.normal(0, 1, len(t)), 0.02) * np.exp(-t * 3) * 0.6
    add(S, s / (np.abs(s).max() + 1e-9) * g, t0)
for b in TL["beats"]:
    for mo in b["morph"]:
        if mo["dur"] > 0.2: whoosh(mo["start"] - 0.35, min(2.2, mo["dur"] + 0.6), 0.55)
    if b["id"] in ("mongol", "ww1", "ww2", "africa"): boom(b["start"] + 0.05, 0.55)
boom(TL["beats"][0]["start"] + 0.1, 0.4)
S = reverb(S, 2.0, 0.25)
S /= np.abs(S).max() + 1e-9
sf.write("build/sfx.wav", (S.T * 0.7).astype(np.float32), sr)
print("music", round(dur, 2))
