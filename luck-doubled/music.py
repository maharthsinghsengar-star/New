"""Meditative score for 'What if your luck doubled every day?' -> build/audio.wav (48 kHz stereo, no voice).
Slow warm pads (D major, 60 bpm), soft piano and bell arpeggios on a pentatonic scale, a low drone, singing-bowl
chimes on every new day, gentle sounds for each lucky moment (coin, note, clovers, jackpot harp, rain, blossoms,
shooting stars, the golden swell) and quiet nature ambience. No drums, no voice."""
import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
TR = json.load(open("build/track.json")); DUR = TR["duration"]; N = int((DUR + 2) * SR)
B = {b["id"]: b for b in TR["beats"]}
R = np.random.default_rng(3)
T = lambda d: np.arange(int(d * SR)) / SR
def add(buf, t0, sig, g=1.0):
    i = int(round(t0 * SR))
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i + n] += sig[:n] * g
def filt(x, kind, f, order=2):
    if kind == "bp": sos = butter(order, [f[0] / (SR / 2), min(f[1], SR / 2 - 100) / (SR / 2)], "band", output="sos")
    else: sos = butter(order, min(f, SR / 2 - 100) / (SR / 2), kind, output="sos")
    return sosfilt(sos, x)
lp = lambda x, f, o=2: filt(x, "low", f, o); hp = lambda x, f, o=2: filt(x, "high", f, o); bp = lambda x, a, b, o=2: filt(x, "bp", (a, b), o)
def fade(x, a=0.01, r=0.05):
    n = len(x); e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * e
def reverb(x, sec=4.0, wet=0.4, seed=1, damp=5000):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t / (sec / 6.9)); ir = lp(ir, damp); ir[:int(0.02 * SR)] *= 0.1; ir /= np.sqrt((ir ** 2).sum())
    return x * (1 - wet) + fftconvolve(x, ir)[:len(x)] * wet * 2.0
noise = lambda d: R.standard_normal(int(d * SR))
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def saw(f, t): return 2 * ((f * t) % 1) - 1
def mixl(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o

# ------------------------------------------------------------------ instruments (all soft)
def pad(fs, d, cut=1100, a=2.0, r=2.5):
    t = T(d); s = sum(saw(f, t) * 0.4 + saw(f * 1.004, t) * 0.4 + saw(f * 0.996, t) * 0.3 + np.sin(2 * np.pi * f * t) * 0.6 for f in fs); s = lp(lp(s, cut, 2), cut * 1.5, 2)
    e = np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1); return s * e / len(fs) * (1 + 0.06 * np.sin(2 * np.pi * 0.3 * t))
def piano(f, d=3.0): t = T(d); return fade(sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.1 + k * 0.9)) for k, a in [(1, 1), (2, 0.4), (3, 0.15), (4, 0.06)]) * np.minimum(1, t / 0.006), 0.004, 0.2)
def bell(f, d=4.0): t = T(d); return fade(sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for a, m, k in [(1, 1, 0.9), (0.5, 2.0, 1.6), (0.3, 2.76, 2.4), (0.18, 5.4, 4.0)]), 0.002, 0.3)
def bowl(f, d=7.0): t = T(d); b = sum(a * np.sin(2 * np.pi * f * m * t + 0.3 * np.sin(2 * np.pi * 4.5 * t)) * np.exp(-t * k) for a, m, k in [(1, 1, 0.45), (0.6, 2.71, 0.7), (0.35, 5.1, 1.2)]); return fade(b * np.minimum(1, t / 0.05), 0.05, 0.5)
def pluck(f, d=1.6): t = T(d); return fade(sum(np.sin(2 * np.pi * f * k * t) * (0.5 ** (k - 1)) * np.exp(-t * (3 + 2 * k)) for k in range(1, 5)), 0.002, 0.1)
def harp(f, d=2.5): t = T(d); return fade(sum(np.sin(2 * np.pi * f * k * t) * (0.6 ** (k - 1)) * np.exp(-t * (1.4 + 1.2 * k)) for k in range(1, 6)), 0.002, 0.2)
def choir(fs, d, a=2.5, r=3.0):
    t = T(d); s = sum(saw(f * (1 + 0.004 * np.sin(2 * np.pi * 5 * t + i)), t) for i, f in enumerate(fs)); s = bp(s, 400, 900) + 0.6 * bp(s, 1000, 1400) + 0.3 * bp(s, 2400, 2900)
    e = np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1); return s * e / len(fs)
def shimmer(d=1.5, lo=3000, hi=9000):
    n = int(d * SR); u = np.arange(n) / n; s = noise(d); out = np.zeros(n); seg = 2048
    for i in range(0, n, seg): fc = lo * (hi / lo) ** u[i]; out[i:i + seg] = bp(s[i:i + seg], fc * 0.8, min(fc * 1.25, 20000))[:len(out[i:i + seg])]
    return out * np.sin(np.pi * u) ** 1.5
def chirp(f0=3200, d=0.12): t = T(d); f = f0 * (1 + 0.5 * np.sin(np.pi * t / d)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2

music = np.zeros(N); fx = np.zeros(N); amb = np.zeros(N)
# ------------------------------------------------------------------ the score: 60 bpm, 4 s per chord
D, Bm, G, A = [50, 57, 62, 64, 66], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 59, 64]
prog = [D, Bm, G, A]; PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83]
bar = 4.0; nb = int(DUR / bar) + 1
for b in range(nb):
    t0 = b * bar; ch = prog[b % 4]
    add(music, t0 - 0.5, pad([mtof(n) for n in ch[1:]], bar + 3.0, 1000 + 400 * np.sin(b * 0.7)), 0.5)
    add(music, t0, np.sin(2 * np.pi * mtof(ch[0] - 12) * T(bar + 1.5)) * fade(np.ones(int((bar + 1.5) * SR)), 1.0, 1.4), 0.22)
    # gentle arpeggio: a note every beat (sometimes off-beat), pentatonic, a little random
    rng = np.random.default_rng(b)
    for k in range(4):
        if rng.random() < 0.2: continue
        n = PENTA[int(rng.integers(0, 6)) + (2 if b % 8 >= 4 else 0)]; tt = t0 + k + (0.5 if rng.random() < 0.3 else 0)
        add(music, tt, piano(mtof(n), 3.5) if rng.random() < 0.7 else bell(mtof(n + 12), 4) * 0.5, 0.16)
# day-of-30 swell + choir, ending chord
g0 = B["d30"]["t0"]
add(music, g0 - 0.8, choir([mtof(n) for n in [62, 66, 69, 74]], DUR - g0 + 0.5, 3, 4), 0.35)
add(music, g0 - 0.8, pad([mtof(n) for n in [50, 57, 62, 66, 69, 74]], DUR - g0 + 0.5, 1800, 3, 4), 0.45)
add(music, DUR - 6, bell(mtof(74), 6) + bell(mtof(78), 6) * 0.6 + bell(mtof(81), 6) * 0.4, 0.25)

# ------------------------------------------------------------------ day changes: singing bowl + shimmer
for c in TR["diss"]: add(fx, c - 0.6, shimmer(1.4, 2500, 9000), 0.10); add(fx, c - 0.05, bowl(mtof(62), 7), 0.32); add(fx, c + 0.1, bell(mtof(81), 3), 0.08)
# lucky moments
add(fx, TR["green"], bell(mtof(86), 1.5), 0.15)                                       # the light turns green
add(fx, TR["pick"], bell(2637, 1.4) + bell(3520, 1.4) * 0.5, 0.25)                   # coin
ct = TR["catch"]
for i in range(16): add(fx, B["d7"]["t0"] + 1.6 + i * 0.33, bp(noise(0.08), 1500, 6000) * np.exp(-T(0.08) * 40), 0.03)   # paper flutter
for i, n in enumerate([74, 78, 81, 86]): add(fx, ct + i * 0.09, bell(mtof(n), 2.5), 0.12)
for i, tc in enumerate(TR["clovers"][::2]): add(fx, tc, pluck(mtof(PENTA[(i * 3) % len(PENTA)] + 12), 1.2), 0.05)
w = TR["win"]
for i in range(14): add(fx, w + i * 0.05, harp(mtof(PENTA[i % len(PENTA)] + (12 if i > 9 else 0)), 2.5), 0.11)
add(fx, w + 0.7, bell(mtof(86), 4) + bell(mtof(90), 4) * 0.6, 0.12)
for i in range(30): add(fx, w + 0.4 + i * 0.12, bp(noise(0.05), 2000, 7000) * np.exp(-T(0.05) * 50), 0.025 * (1 - i / 30))   # confetti rustle
for tb in TR["bloom"][:18:2]: add(fx, tb, pluck(mtof(PENTA[int(R.integers(3, 10))] + 12), 1.4), 0.05)
for ts in TR["stars"]: add(fx, ts, shimmer(1.2, 4000, 11000), 0.06); add(fx, ts + 0.6, bell(mtof(PENTA[int(R.integers(4, 10))] + 12), 2.0), 0.05)
for i in range(10): add(fx, g0 + 1.0 + i * 0.07, harp(mtof(PENTA[i]), 3.0), 0.09)

# ------------------------------------------------------------------ ambience
def seg(id): b = B[id]; return b["t0"], b["t1"]
for id in ["d1", "d4", "d7", "d10", "d14", "d22", "d30", "end"]:
    a, b = seg(id); d = b - a; add(amb, a, fade(lp(noise(d), 700), 1, 1), 0.05)    # soft distant city
    tt = a + 0.5
    while tt < b - 0.5: f0 = R.uniform(2600, 4200); [add(amb, tt + k * 0.13, chirp(f0 * (1 + 0.1 * k), 0.1), 0.05) for k in range(int(R.integers(2, 5)))]; tt += R.uniform(1.2, 3.0)
a, b = seg("d18"); d = b - a; add(amb, a - 0.3, fade(bp(noise(d + 0.6), 800, 7000) * 0.6 + lp(noise(d + 0.6), 400) * 0.5, 0.8, 0.8), 0.22)   # rain
a, b = seg("d26"); d = b - a
tt = a
while tt < b: [add(amb, tt + k * 0.06, np.sin(2 * np.pi * 4300 * T(0.03)) * np.sin(np.pi * T(0.03) / 0.03), 0.02) for k in range(3)]; tt += R.uniform(0.35, 0.7)   # crickets
a, b = seg("d22"); add(amb, a, fade(bp(noise(b - a), 200, 1200), 1, 1) * (1 + 0.5 * np.sin(2 * np.pi * 0.2 * T(b - a))), 0.06)   # breeze

# ------------------------------------------------------------------ mix
music = reverb(music, 4.5, 0.42, 3); fx = reverb(fx, 3.5, 0.45, 5); amb = reverb(amb, 2.0, 0.25, 7)
rms = lambda x: np.sqrt(np.mean(x ** 2) + 1e-12)
L = music * (0.22 / rms(music)) + fx * (0.07 / rms(fx)) + amb * (0.035 / rms(amb))
Rr = np.roll(music * (0.22 / rms(music)), int(0.013 * SR)) * 0.9 + 0.1 * music * (0.22 / rms(music)) + np.roll(fx * (0.07 / rms(fx)), int(0.007 * SR)) + amb * (0.035 / rms(amb))
st = np.stack([L, Rr], 1); st = np.tanh(st / 0.8) * 0.8
end = int(DUR * SR); st[:int(1.0 * SR)] *= np.linspace(0, 1, int(1.0 * SR))[:, None]; st[end - int(2.5 * SR):end] *= np.linspace(1, 0, int(2.5 * SR))[:, None]; st[end:] = 0
st /= np.abs(st).max() / 0.9
sf.write("build/audio.wav", st[:end + int(0.1 * SR)].astype(np.float32), SR)
print("audio", DUR, "s")
