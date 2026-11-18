"""Soft soundscape: cicadas, birds, river water, drone wind (from the camera track), distant siren + all-clear,
tram bells, firebreak work, B-29 drone, soft koto/pad score, harbour sounds, evening cicadas + wind chime.
Everything cuts to silence at each flash. Writes build/audio.wav."""
import json, numpy as np, soundfile as sf
from scipy.signal import lfilter, butter, fftconvolve

sr = 44100
TL = json.load(open("timeline.json")); TR = np.array(json.load(open("build/track.json")))
D = TL["duration"]; n = int(D * sr); tt = np.arange(n) / sr; rng = np.random.default_rng(5)
F1, F2 = TL["flashes"]; NS, ES = TL["nagStart"], TL["endStart"]
T = lambda d: np.arange(int(d * sr)) / sr
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def buf(): return np.zeros((2, n))
def add(B, sig, t0, pan=0.5, g=1.0):
    i = int(max(0, t0) * sr)
    if i >= n: return
    s = sig[: n - i] * g; B[0, i:i + len(s)] += s * np.cos(pan * np.pi / 2); B[1, i:i + len(s)] += s * np.sin(pan * np.pi / 2)
def bp(x, lo, hi, o=2): b, a = butter(o, [lo / (sr / 2), hi / (sr / 2)], "band"); return lfilter(b, a, x)
def lp(x, f, o=2): b, a = butter(o, f / (sr / 2)); return lfilter(b, a, x)
def hp(x, f, o=2): b, a = butter(o, f / (sr / 2), "high"); return lfilter(b, a, x)
def env(pts): a, b = zip(*pts); return np.interp(tt, a, b)
def reverb(B, secs=2.5, mix=0.3):
    k = T(secs); ir = rng.normal(0, 1, (2, len(k))) * np.exp(-k * 6 / secs); ir[:, :int(0.02 * sr)] = 0
    wet = np.stack([fftconvolve(B[c], lp(ir[c], 6000))[:n] for c in range(2)]); wet *= np.abs(B).max() / (np.abs(wet).max() + 1e-9)
    return B * (1 - mix) + wet * mix
H = (tt < F1).astype(float); N = ((tt >= NS) & (tt < F2)).astype(float); E = (tt >= ES).astype(float)
def gate(a, b, fi=0.8):  # soft in, hard cut at b (the flash)
    return np.clip((tt - a) / fi, 0, 1) * (tt < b)

# ---- drone wind / FPV rush, driven by camera speed; water when low over water
spd = np.interp(tt, TR[:, 0], TR[:, 1]); alt = np.interp(tt, TR[:, 0], TR[:, 2]); wat = np.interp(tt, TR[:, 0], TR[:, 3])
Amb = buf()
w = rng.normal(0, 1, (2, n)); wind = np.stack([bp(w[c], 250, 2200) for c in range(2)]) * (0.25 + np.clip(spd / 60, 0, 1.4))[None] * 0.035
wind += np.stack([hp(w[c], 3000) for c in range(2)]) * np.clip((spd - 35) / 60, 0, 1)[None] * 0.02
Amb += wind
lowW = wat * np.clip((8 - (alt + 2.5)) / 6, 0, 1)
for c in range(2):
    lap = lp(rng.normal(0, 1, n), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.7 + 0.2 * c) * tt) ** 2)
    Amb[c] += lap * lowW * 0.12
for k in range(160):   # little water plips
    t0 = rng.random() * D; s = np.sin(2 * np.pi * (900 + rng.random() * 900) * T(0.06) * (1 + T(0.06) * 8)) * np.exp(-T(0.06) * 60)
    add(Amb, s * lowW[min(n - 1, int(t0 * sr))], t0, rng.random(), 0.05)

# ---- cicadas (min-min style pulsed chorus), birds
Nat = buf()
for v in range(5):
    f0 = 3800 + v * 650; carrier = bp(rng.normal(0, 1, n), f0, f0 + 1800)
    puls = (0.5 + 0.5 * np.sin(2 * np.pi * (38 + v * 4) * tt)) ** 3
    swell = np.clip(np.sin(2 * np.pi * tt / (5.5 + v * 1.3) + v * 1.7), 0, 1) ** 1.5
    pres = H * np.clip(tt / 3, 0, 1) + N * np.clip((tt - NS) / 2, 0, 1) * 0.8
    add(Nat, carrier * puls * swell * pres * 0.05, 0, 0.15 + v * 0.17)
def chirp(t0, pan, g=0.05):
    for j in range(rng.integers(2, 5)):
        d = 0.06 + rng.random() * 0.06; t = T(d); f = 2600 + rng.random() * 2200
        s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.35 * np.sin(np.pi * t / d))) / sr) * np.sin(np.pi * t / d) ** 2
        add(Nat, s, t0 + j * (d + 0.04), pan, g)
for k in range(28): chirp(1.5 + rng.random() * 38, rng.random())
for k in range(8): chirp(NS + 1 + rng.random() * 16, rng.random(), 0.035)

# ---- siren (alert, wavering, distant) and the steady all-clear
Ev = buf()
t = T(13.0); f = 380 + 140 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 4.2)); ph = 2 * np.pi * np.cumsum(f) / sr
s = sum(np.sin(ph * h) / h for h in (1, 2, 3)); s = lp(s, 1500) * np.clip(t / 2, 0, 1) * np.clip((13 - t) / 3, 0, 1)
add(Ev, s, 1.2, 0.35, 0.05)
t = T(5.0); ph = 2 * np.pi * 455 * t; s = sum(np.sin(ph * h) / h for h in (1, 2, 3)) * np.clip(t / 0.8, 0, 1) * np.clip((5 - t) / 1.5, 0, 1)
add(Ev, lp(s, 1500), 14.6, 0.6, 0.045)
# tram bells (chin-chin)
def bell(t0, pan, g=0.12):
    for j in range(2):
        t = T(1.2); s = sum(np.sin(2 * np.pi * 1850 * r * t) * np.exp(-t * (4 + i * 2)) * a for i, (r, a) in enumerate([(1, 1), (2.76, 0.4), (5.4, 0.2)]))
        add(Ev, s, t0 + j * 0.28, pan, g)
bell(17.3, 0.7); bell(21.9, 0.35, 0.09); bell(36.2, 0.5, 0.05)
# firebreak: timber knocks, distant saws
for k in range(40):
    t0 = 22.8 + rng.random() * 5.5; t = T(0.15); s = bp(rng.normal(0, 1, len(t)), 300, 1400) * np.exp(-t * 40) + np.sin(2 * np.pi * 220 * t) * np.exp(-t * 30) * 0.5
    add(Ev, s, t0, rng.random(), 0.05 * np.exp(-abs(t0 - 25.4) / 2))
# B-29 drone (very high, faint) over each city
def drone(a, b, g):
    t = T(b - a); e = np.clip(t / (b - a), 0, 1) ** 1.6
    s = sum(np.sin(2 * np.pi * f0 * t + 3 * np.sin(2 * np.pi * 0.31 * t + i)) for i, f0 in enumerate([62, 63.4, 124.5, 126.8])) + 1.5 * bp(rng.normal(0, 1, len(t)), 80, 400)
    add(Ev, lp(s, 500) * e, a, 0.45, g)
drone(30, F1, 0.035); drone(58.5, F2, 0.035)
# harbour: ship horn, gulls, factory clanks
t = T(3.0); s = sum(np.sin(2 * np.pi * 108 * h * t) / h for h in (1, 2, 3, 4)) * np.clip(t / 0.4, 0, 1) * np.clip((3 - t) / 0.8, 0, 1); add(Ev, lp(s, 900), NS + 1.6, 0.3, 0.06)
for k in range(9):
    t0 = NS + 0.8 + rng.random() * 7; d = 0.35; t = T(d); f = 1400 + 900 * np.sin(np.pi * t / d) ** 0.5
    s = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * t / d) ** 1.5; add(Ev, bp(s + 0.3 * rng.normal(0, 1, len(t)) * s, 900, 4000), t0, rng.random(), 0.03)
for k in range(18):
    t0 = 52.5 + rng.random() * 5.5; t = T(0.8); s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 6) for f in (520, 1310, 2290)); add(Ev, s, t0, rng.random(), 0.012)

# ---- soft score: koto plucks (Karplus-Strong) over a warm pad
Mu = buf()
def koto(m, t0, v=0.1, pan=0.5, d=2.2):
    f = hz(m); L = int(sr / f); s = np.zeros(int(d * sr)); buf_ = rng.uniform(-1, 1, L) * np.hanning(L); i = 0
    while i < len(s):
        k = min(L, len(s) - i); s[i:i + k] = buf_[:k]; buf_ = 0.996 * 0.5 * (buf_ + np.roll(buf_, -1)); i += k
    add(Mu, lp(s, 4000) * np.exp(-np.arange(len(s)) / sr * 1.2), t0, pan, v)
def pad(chord, t0, d, v=0.022):
    t = T(d); e = np.clip(t / 1.5, 0, 1) * np.clip((d - t) / 1.8, 0, 1); s = np.zeros(len(t))
    for m in chord:
        for dt in (-0.07, 0, 0.07): s += 2 * ((hz(m + dt) * t) % 1) - 1
    add(Mu, lp(s, 1200) * e * v, t0, 0.5)
YO = [62, 64, 67, 69, 71, 74, 76, 79]          # D yo scale (bright, gentle)
MIYAKO = [62, 63, 67, 69, 70, 74, 75, 79]      # D miyako-bushi (mournful)
mel = rng.integers(0, 8, 200)
def phrase(scale, a, b, step, v):
    t0, i = a, 0
    while t0 < b:
        m = scale[mel[i % 200]]; koto(m, t0, v, 0.3 + 0.4 * rng.random())
        if i % 4 == 0: koto(m - 12, t0, v * 0.6, 0.5)
        t0 += step * (1.5 if i % 5 == 4 else 1); i += 1
chords = [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]]
for i, t0 in enumerate(np.arange(1.0, 34, 5.5)): pad(chords[i % 4], t0, 6.5)
phrase(YO, 2.0, 33.5, 0.85, 0.07)
pad([50, 55, 57, 62], 33.5, F1 - 33.5 + 0.5, 0.026)     # held, unresolved
for i, t0 in enumerate(np.arange(NS + 0.6, 59, 5.5)): pad(chords[(i + 2) % 4], t0, 6.5, 0.02)
phrase(YO, NS + 1.4, 58.5, 1.0, 0.055)
pad([50, 55, 57, 62], 58.5, F2 - 58.5 + 0.5, 0.024)
for i, t0 in enumerate(np.arange(ES + 0.6, D - 1, 6.0)): pad([[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 63], [50, 57, 62, 65]][i % 4], t0, 7.0, 0.024)
t0 = ES + 1.4
for m in [74, 70, 69, 67, 69, 62, 63, 62, 67, 69, 70, 69, 67, 63, 62]:
    koto(m, t0, 0.065, 0.45, 3.0); t0 += 0.85 if m != 62 else 1.6

# ---- evening: higurashi cicada calls, wind chime, gentle water
Eve = buf()
for k in range(5):
    t0 = ES + 1.0 + k * 2.6 + rng.random(); d = 1.6; t = T(d); f = 4600 - 900 * t / d
    s = np.sin(2 * np.pi * np.cumsum(f) / sr) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) ** 2 * np.exp(-t * 1.2) * np.clip(t / 0.05, 0, 1)
    add(Eve, s, t0, 0.2 + 0.6 * rng.random(), 0.018)
for k in range(14):
    t0 = ES + 1 + rng.random() * 12; t = T(2.5); f = 2900 + rng.random() * 900
    s = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * (2.2 + j)) * a for j, (r, a) in enumerate([(1, 1), (2.4, 0.35), (4.1, 0.15)])); add(Eve, s, t0, 0.4 + 0.2 * rng.random(), 0.03)
for c in range(2): Eve[c] += lp(rng.normal(0, 1, n), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt + c)) * E * 0.05

# ---- flashes: hard cut, then a soft ringing tone and a slow low swell
Fx = buf()
for F, nxt in ((F1, NS), (F2, ES)):
    t = T(nxt - F); ring = np.sin(2 * np.pi * 2870 * t) * np.exp(-t * 0.9) * 0.02
    rum = lp(rng.normal(0, 1, len(t)), 60, 4) * np.clip(t / 1.5, 0, 1) * np.clip((nxt - F - t) / 1.6, 0, 1) * 0.6
    add(Fx, ring + rum, F, 0.5)

cut = np.ones(n)
for F, nxt in ((F1, NS), (F2, ES)): cut *= np.where((tt >= F) & (tt < nxt), 0.0, 1.0)
cut = np.convolve(cut, np.ones(int(0.012 * sr)) / int(0.012 * sr), mode="same")
mix = (Amb + Nat + Ev) * cut + reverb(Mu, 3.0, 0.35) * cut + Eve * cut + Fx
mix = reverb(mix, 1.6, 0.12)
mix *= np.clip(tt / 1.4, 0, 1) * np.clip((D - tt) / 2.0, 0, 1)
mix /= np.abs(mix).max() + 1e-9
sf.write("build/audio.wav", (mix.T * 0.9).astype(np.float32), sr)
print("ok", D)
