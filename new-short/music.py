"""Patriotic underscore (strings pad, snare rolls, timpani, piano, brass swell) + SFX synced to the beats."""
import json, numpy as np, soundfile as sf
from scipy.signal import lfilter, butter, fftconvolve

sr = 44100
TL = json.load(open("build/timeline.json"))
B = {b["id"]: b for b in TL["beats"]}
dur = TL["duration"] + 0.3; n = int(dur * sr); rng = np.random.default_rng(3)
T = lambda d: np.arange(int(d * sr)) / sr
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
tt = np.arange(n) / sr
def buf(): return np.zeros((2, n))
def add(Bf, sig, t0, pan=0.5, g=1.0):
    i = int(max(0, t0) * sr)
    if i >= n: return
    s = sig[: n - i] * g; Bf[0, i:i + len(s)] += s * np.cos(pan * np.pi / 2); Bf[1, i:i + len(s)] += s * np.sin(pan * np.pi / 2)
def bp(x, lo, hi): b, a = butter(2, [lo / (sr / 2), hi / (sr / 2)], "band"); return lfilter(b, a, x)
def lp(x, f): b, a = butter(2, f / (sr / 2)); return lfilter(b, a, x)
def reverb(Bf, secs=2.4, mix=0.25):
    k = T(secs); ir = rng.normal(0, 1, (2, len(k))) * np.exp(-k * 6 / secs); ir[:, :int(0.015 * sr)] = 0
    wet = np.stack([fftconvolve(Bf[c], lp(ir[c], 5000))[:n] for c in range(2)]); wet *= np.abs(Bf).max() / (np.abs(wet).max() + 1e-9)
    return Bf * (1 - mix) + wet * mix
def env(pts): a, b = zip(*pts); return np.interp(tt, a, b)

# sections: tense minor (intro..moved), hopeful (reinforce), sombre (tragic, never), triumphant major (medal..end)
minor = env([(0, 1), (B["reinforce"]["start"] - 0.5, 1), (B["reinforce"]["start"] + 0.5, 0.4), (B["tragic"]["start"], 1), (B["medal"]["start"] - 0.3, 1), (B["medal"]["start"] + 0.3, 0), (dur, 0)])
drums = env([(0, 0.25), (B["desperate"]["start"], 0.25), (B["desperate"]["start"] + 0.5, 1), (B["moved"]["end"], 1), (B["reinforce"]["start"] + 0.5, 0.5), (B["tragic"]["start"], 0), (B["medal"]["start"], 0.3), (B["jai"]["start"], 1), (dur, 0.6)])
loud = env([(0, 0.5), (B["desperate"]["start"], 0.8), (B["tragic"]["start"] - 0.3, 0.8), (B["tragic"]["start"] + 0.5, 0.45), (B["medal"]["start"], 0.6), (B["spirit"]["start"], 0.9), (dur - 1, 1), (dur, 0.6)])
MIN = [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62], [40, 47, 52, 55, 59]]     # Am F G Em
MAJ = [[48, 55, 60, 64, 67], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60]]     # C G Am F
BAR = 60 / 84 * 4
M = buf()
for i in range(int(dur / BAR) + 2):
    t0 = i * BAR; mi = minor[min(n - 1, int(t0 * sr))]; ch = (MIN if mi > 0.5 else MAJ)[i % 4]
    d = BAR + 1.0; t = T(d); e = np.clip(t / 0.6, 0, 1) * np.clip((d - t) / 1.0, 0, 1); s = np.zeros(len(t))
    for m in ch:
        for dt in (-0.06, 0.0, 0.06): ph = hz(m + dt) * t; s += (2 * (ph % 1) - 1) * (0.8 if m < 50 else 0.5)
    add(M, lp(s, 1800) * e * 0.03 * (0.6 + 0.6 * loud[min(n - 1, int(t0 * sr))]), t0, 0.3 + 0.4 * (i % 2))
    tb = T(BAR); add(M, np.sin(2 * np.pi * hz(ch[0] - 12) * tb) * np.clip(tb / 0.03, 0, 1) * np.exp(-tb * 0.8) * 0.14, t0)
# military snare (rolls on beat 4) + timpani on downbeats, gain from the drum envelope
Dr = buf(); beat = BAR / 4
for k in range(int(dur / beat * 2)):
    t0 = k * beat / 2; g = drums[min(n - 1, int(t0 * sr))]
    if g < 0.05: continue
    j = k % 8
    sn = bp(rng.normal(0, 1, int(0.18 * sr)), 1500, 7000) * np.exp(-T(0.18) * 22)
    if j in (2, 6): add(Dr, sn * 0.22 * g, t0, 0.55)
    if j == 7: [add(Dr, sn * 0.1 * g * (0.5 + q / 8), t0 + q * beat / 16, 0.55) for q in range(8)]
    if j == 0: tk = T(1.0); add(Dr, np.sin(2 * np.pi * (70 + 25 * np.exp(-tk * 8)) * tk) * np.exp(-tk * 3.5) * 0.4 * g, t0)
# piano for the sombre part + brass-ish swell at the end
def piano(m, t0, v):
    f = hz(m); t = T(3); s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.1 + h * 0.8)) / h ** 1.5 for h in range(1, 6)); add(M, s * np.clip(t / 0.004, 0, 1) * v, t0, 0.5)
for i, m in enumerate([69, 67, 64, 62, 64, 60, 62, 57]): piano(m, B["tragic"]["start"] + 0.2 + i * 0.85, 0.07)
for i, m in enumerate([72, 76, 79, 84]):
    t = T(dur - B["medal"]["start"]); s = sum((2 * ((hz(m) * h * t) % 1) - 1) / h for h in (1,)) ; s = lp(s, 2600) * np.clip(t / 1.2, 0, 1)
    add(M, s * 0.012, B["medal"]["start"] + 0.4 + i * 0.25, 0.3 + i * 0.15)
M = reverb(M + Dr, 2.4, 0.22)
M *= np.clip(tt / 1.0, 0, 1) * np.clip((dur - tt) / 1.6, 0, 1)
M /= np.abs(M).max() + 1e-9
sf.write("build/music.wav", (M.T * 0.85).astype(np.float32), sr)

# ---------------- SFX
Sx = buf()
def boom(t0, g=0.5):
    t = T(2.0); s = np.sin(2 * np.pi * (40 + 40 * np.exp(-t * 7)) * t) * np.exp(-t * 2.2) + lp(rng.normal(0, 1, len(t)), 700) * np.exp(-t * 3.5) * 0.8
    add(Sx, s / np.abs(s).max(), t0, 0.3 + rng.random() * 0.4, g)
BL = [0.3, 1.1, 1.9, 2.6, 3.6, 4.4, 5.2, 6.3, 7.4, 8.6, 9.6, 10.8, 12, 13.2]
for bid, off in (("desperate", 0), ("advancing", 3), ("hold", 7), ("moved", 10)):
    b = B[bid]
    for x in BL:
        tg = b["start"] + x - off
        if b["start"] <= tg < b["end"]: boom(tg, 0.35)
# Dakota engines
t = T(B["reinforce"]["end"] - B["reinforce"]["start"]); e = np.sin(np.pi * np.clip(t / t[-1], 0, 1)) ** 0.6
eng = (np.sin(2 * np.pi * 92 * t) + 0.6 * np.sin(2 * np.pi * 184 * t) + 0.4 * bp(rng.normal(0, 1, len(t)), 200, 1200)) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t))
add(Sx, eng / np.abs(eng).max() * e, B["reinforce"]["start"], 0.45, 0.25)
# camera shutter for the photograph, shimmer for the medal
ph = next(w["t0"] for w in TL["words"] if "Somnath" in w["w"]) - 0.15
t = T(0.12); add(Sx, bp(rng.normal(0, 1, len(t)), 2000, 8000) * np.exp(-t * 60), ph, 0.5, 0.5); add(Sx, bp(rng.normal(0, 1, len(t)), 2000, 8000) * np.exp(-t * 60), ph + 0.07, 0.5, 0.35)
for i in range(16): f = 2500 + rng.random() * 3500; t = T(0.8); add(Sx, np.sin(2 * np.pi * f * t) * np.exp(-t * 6), B["medal"]["start"] + 0.2 + i * 0.06, rng.random(), 0.12)
Sx = reverb(Sx, 1.8, 0.2); Sx /= np.abs(Sx).max() + 1e-9
sf.write("build/sfx.wav", (Sx.T * 0.7).astype(np.float32), sr)
print("ok", round(dur, 2))
