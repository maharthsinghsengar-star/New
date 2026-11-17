"""Festive Indian-pop underscore (dhol groove, santoor-like plucks, pads, bass) + SFX synced to the graphics."""
import json, numpy as np, soundfile as sf
from scipy.signal import lfilter, fftconvolve, butter

sr = 44100
TL = json.load(open("build/timeline.json"))
L, SC = TL["lines"], {int(k): v for k, v in TL["scenes"].items()}
dur = TL["duration"] + 0.3; n = int(dur * sr); rng = np.random.default_rng(9)
T = lambda d: np.arange(int(d * sr)) / sr
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
tt = np.arange(n) / sr
def buf(): return np.zeros((2, n))
def add(B, sig, t0, pan=0.5, g=1.0):
    i = int(max(0, t0) * sr)
    if i >= n: return
    s = sig[: n - i] * g; B[0, i:i + len(s)] += s * np.cos(pan * np.pi / 2); B[1, i:i + len(s)] += s * np.sin(pan * np.pi / 2)
def bp(x, lo, hi): b, a = butter(2, [lo / (sr / 2), hi / (sr / 2)], 'band'); return lfilter(b, a, x)
def lp(x, f): b, a = butter(2, f / (sr / 2)); return lfilter(b, a, x)
def reverb(B, secs=2.2, mix=0.22):
    k = T(secs); ir = rng.normal(0, 1, (2, len(k))) * np.exp(-k * 6.0 / secs); ir[:, :int(0.015 * sr)] = 0
    wet = np.stack([fftconvolve(B[c], lp(ir[c], 6000))[:n] for c in range(2)]); wet *= np.abs(B).max() / (np.abs(wet).max() + 1e-9)
    return B * (1 - mix) + wet * mix

s1, s2, s3, s4, s5 = SC[1], SC[2], SC[3], SC[4], SC[5]
reveal = L[7]["start"]; cheer = L[13]["start"]
# energy per instrument over time
def env(points): t, v = zip(*points); return np.interp(tt, t, v)
E_dhol = env([(0, 0.8), (s1[1] - 0.3, 0.8), (s1[1] + 0.3, 0.0), (reveal - 0.05, 0.0), (reveal, 1.0), (s4[1], 1.0), (cheer, 1.2), (s5[0] + 2.0, 0.6), (dur - 1.5, 0.0), (dur, 0)])
E_pluck = env([(0, 0.8), (s1[1], 0.7), (s1[1] + 0.5, 0.25), (s3[0], 0.3), (reveal, 1.0), (dur - 2, 0.8), (dur, 0)])
E_build = env([(0, 0), (s3[0], 0.0), (reveal - 0.1, 1.0), (reveal + 0.05, 0.0), (dur, 0)])
minor = env([(0, 0), (s1[1] - 0.2, 0), (s1[1] + 0.6, 1), (s3[0], 1), (reveal, 0), (dur, 0)])

BPM = 112; beat = 60 / BPM; step = beat / 4; bar = beat * 4
MAJ = [[50, 57, 62, 66], [43, 50, 59, 62], [45, 52, 57, 61], [47, 54, 59, 62]]       # D G A Bm
MIN = [[47, 54, 59, 62], [43, 50, 55, 59], [40, 47, 52, 55], [42, 49, 54, 57]]       # Bm G Em F#m
M = buf()
nb = int(dur / bar) + 2
# pads (detuned saws, low-passed)
for i in range(nb):
    t0 = i * bar; mi = minor[min(n - 1, int(t0 * sr))]; ch = MIN[i % 4] if mi > 0.5 else MAJ[i % 4]
    d = bar + 0.6; t = T(d); e = np.clip(t / 0.4, 0, 1) * np.clip((d - t) / 0.6, 0, 1); s = np.zeros(len(t))
    for m in ch:
        for dt in (-0.07, 0.07): s += 2 * ((hz(m + dt) * t) % 1) - 1
    add(M, lp(s, 1400) * e * 0.035, t0, 0.3 + 0.4 * (i % 2))
    tb = T(bar); f = hz(ch[0] - 12); add(M, np.sin(2 * np.pi * f * tb) * np.clip(tb / 0.02, 0, 1) * np.exp(-tb * 1.2) * 0.16, t0)
    tb2 = T(beat * 1.5); add(M, np.sin(2 * np.pi * f * tb2) * np.exp(-tb2 * 3) * 0.1 * E_dhol[min(n - 1, int((t0 + beat * 2.5) * sr))], t0 + beat * 2.5)
# santoor-like plucks (Karplus-Strong)
def pluck(m, d=0.9, bright=0.6):
    f = hz(m); Lp = int(sr / f); x = np.zeros(int(d * sr)); x[:Lp] = rng.uniform(-1, 1, Lp) * np.linspace(1, bright, Lp)
    a = np.zeros(Lp + 2); a[0] = 1; a[Lp] = -0.497; a[Lp + 1] = -0.497
    return lfilter([1], a, x) * 0.5
SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81]   # D major pentatonic-ish
MEL = [4, 3, 2, 3, 4, 5, 4, 2, 1, 2, 3, 2, 1, 0, 1, 2]
k = 0; t0 = 0.0
while t0 < dur - 1:
    e = E_pluck[int(t0 * sr)]; mi = minor[int(t0 * sr)]
    if e > 0.05 and (k % 2 == 0 or e > 0.6):
        m = SCALE[MEL[k % 16] + (0 if (k // 16) % 2 == 0 else 1)] - (3 if mi > 0.5 and MEL[k % 16] in (2, 6) else 0)
        add(M, pluck(m, 0.8), t0, 0.35 + 0.3 * ((k // 2) % 2), 0.12 * e)
        if k % 4 == 0 and e > 0.6: add(M, pluck(m - 12, 0.9, 0.4), t0, 0.5, 0.06 * e)
    t0 += step * 2; k += 1
# dhol groove: 16-step pattern, "dagga" (low) and "tilli" (high)
D = buf()
DAG = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0]
TIL = [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1]
SHK = [1] * 16
for i in range(int(dur / step)):
    t0 = i * step; e = E_dhol[min(n - 1, int(t0 * sr))]
    if e < 0.02: continue
    j = i % 16
    if DAG[j]: tk = T(0.45); add(D, (np.sin(2 * np.pi * (52 + 70 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 7) + bp(rng.normal(0, 1, len(tk)), 80, 300) * np.exp(-tk * 30) * 0.4) * 0.55 * e, t0, 0.5)
    if TIL[j]: tk = T(0.18); add(D, (bp(rng.normal(0, 1, len(tk)), 1500, 5000) * np.exp(-tk * 40) * 0.6 + np.sin(2 * np.pi * 380 * tk) * np.exp(-tk * 30) * 0.4) * 0.35 * e, t0, 0.62)
    if SHK[j]: tk = T(0.06); add(D, bp(rng.normal(0, 1, len(tk)), 6000, 12000) * np.exp(-tk * 70) * (0.05 if j % 2 else 0.08) * e, t0, 0.3)
    if j in (3, 13) and e > 0.9: tk = T(0.25); add(D, np.sin(2 * np.pi * (520 - 120 * tk) * tk) * np.exp(-tk * 14) * 0.18 * e, t0, 0.7)   # tabla "na"
# riser into the reveal
rt = T(5.0); riser = bp(rng.normal(0, 1, len(rt)), 500, 6000) * (rt / 5.0) ** 3
add(D, riser * 0.25, reveal - 5.0, 0.5)
add(D, np.sin(2 * np.pi * hz(50) * T(3)) * np.exp(-T(3) * 1.5) * 0.4, reveal, 0.5)
M = M + D
# final resolving chord
tf = T(4.5); fin = sum(pluck(m, 4.5, 0.7) for m in [62, 66, 69, 74, 78]); add(M, fin * 0.25, s5[0] + 0.2, 0.5)
M = reverb(M, 2.0, 0.2)
M *= np.clip(tt / 0.6, 0, 1) * np.clip((dur - tt) / 1.8, 0, 1)
M /= np.abs(M).max() + 1e-9
sf.write("build/music.wav", (M.T * 0.85).astype(np.float32), sr)

# ---------------------------------------------------------------- SFX
S = buf()
def whoosh(t0, d=0.7, g=0.5):
    t = T(d); x = rng.normal(0, 1, len(t)); e = np.sin(np.pi * t / d) ** 2
    y = bp(x, 400, 4000) * e; add(S, y / (np.abs(y).max() + 1e-9), t0, 0.4, g)
def pop(t0, g=0.4):
    t = T(0.18); y = np.sin(2 * np.pi * (300 + 900 * np.exp(-t * 40)) * t) * np.exp(-t * 25); add(S, y, t0, 0.55, g)
def sparkle(t0, g=0.35):
    for i in range(14): f = 2000 + rng.random() * 4000; t = T(0.6); add(S, np.sin(2 * np.pi * f * t) * np.exp(-t * 8), t0 + i * 0.05, rng.random(), g * 0.4)
def cracker(t0, g=0.5):
    for i in range(int(10 + rng.random() * 12)): t = T(0.03); add(S, rng.normal(0, 1, len(t)) * np.exp(-t * 150), t0 + rng.random() * 0.6, rng.random(), g * (0.4 + rng.random() * 0.6))
def burst(t0, g=0.5):
    t = T(0.9); w = np.sin(2 * np.pi * np.cumsum(1200 + 1800 * t / 0.9) / sr) * np.exp(-((t - 0.45) / 0.3) ** 2) * 0.15; add(S, w, t0 - 0.9, 0.5, g)  # whistle
    t = T(1.4); b = lp(rng.normal(0, 1, len(t)), 900) * np.exp(-t * 4) + np.sin(2 * np.pi * 60 * t) * np.exp(-t * 6); add(S, b / np.abs(b).max(), t0, rng.random() * 0.6 + 0.2, g); cracker(t0 + 0.2, g * 0.6)
# fireworks in scene 1 and scene 4 (match the visual bursts loosely)
for tb in (1.0, 2.3, 3.6, 5.2, 7.0, 9.4): burst(tb, 0.32)
for tb in (s4[0] + 0.8, s4[0] + 3.5, s4[0] + 7.0, cheer + 0.2, cheer + 1.1, cheer + 2.0, cheer + 2.8): burst(tb, 0.4)
cracker(cheer + 0.4, 0.5); cracker(cheer + 1.6, 0.5)
# scene transitions
for t0 in (s2[0], s3[0], s4[0], s5[0]): whoosh(t0 - 0.35, 0.7, 0.45)
whoosh(L[8]["start"] - 0.5, 0.8, 0.5)
# graphics pops
r3, r4, w5, j8, j9, j10, j12 = L[3], L[4], L[5], L[8], L[9], L[10], L[12]
D3, D8, D12 = r3["end"] - r3["start"], j8["end"] - j8["start"], j12["end"] - j12["start"]
for t0 in [r3["start"] + 0.6, r3["start"] + D3 * 0.42, r3["start"] + D3 * 0.66, r4["start"] + 0.3, w5["start"] + 0.6, j9["start"] + 0.3, j10["start"] + 0.5] + \
          [j8["start"] + D8 * (0.08 + i * 0.22) for i in range(4)] + [j12["start"] + D12 * (0.03 + i * 0.22) for i in range(4)]:
    pop(t0, 0.32)
for i in range(12): pop(j8["start"] + i * 0.18, 0.1)
sparkle(reveal, 0.5); sparkle(s5[0] + 0.3, 0.35); cracker(reveal + 0.05, 0.35)
S = reverb(S, 1.6, 0.18); S /= np.abs(S).max() + 1e-9
sf.write("build/sfx.wav", (S.T * 0.75).astype(np.float32), sr)
print("ok", round(dur, 2))
