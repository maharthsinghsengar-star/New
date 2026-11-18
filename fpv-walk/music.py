"""Soundscape for the FPV walk (no dialogue): street life (geta footsteps, murmur, trams, bicycle bells, cicadas),
the bomber's drone, silence + ringing at the flash, panic and breathing while running, the blast (boom, shattering glass),
muffled hearing, soft sobbing, blackout heartbeat, then fire, wind, black rain, sparse koto and a temple bell. -> build/audio.wav"""
import json, numpy as np, soundfile as sf
from scipy.signal import lfilter, butter, fftconvolve

sr = 44100
TL = json.load(open("timeline.json")); TR = json.load(open("build/track.json"))
R = np.array(TR["rows"]); STEPS = TR["steps"]
D = TL["duration"]; n = int(D * sr); tt = np.arange(n) / sr; rng = np.random.default_rng(11)
TB, TBL, TOUT = TL["burst"], TL["blast"], TL["after"]
T = lambda d: np.arange(int(d * sr)) / sr
def buf(): return np.zeros((2, n))
def add(B, sig, t0, pan=0.5, g=1.0):
    i = int(max(0, t0) * sr)
    if i >= n: return
    s = sig[: n - i] * g; B[0, i:i + len(s)] += s * np.cos(pan * np.pi / 2); B[1, i:i + len(s)] += s * np.sin(pan * np.pi / 2)
def bp(x, lo, hi, o=2): b, a = butter(o, [lo / (sr / 2), hi / (sr / 2)], "band"); return lfilter(b, a, x)
def lp(x, f, o=2): b, a = butter(o, f / (sr / 2)); return lfilter(b, a, x)
def hp(x, f, o=2): b, a = butter(o, f / (sr / 2), "high"); return lfilter(b, a, x)
def env(pts): a, b = zip(*pts); return np.interp(tt, a, b)
def col(i): return np.interp(tt, R[:, 0], R[:, i])
def reverb(B, secs=2.2, mix=0.3, seed=1):
    r = np.random.default_rng(seed); k = T(secs); ir = r.normal(0, 1, (2, len(k))) * np.exp(-k * 6.5 / secs); ir[:, :int(0.015 * sr)] = 0
    wet = np.stack([fftconvolve(B[c], lp(ir[c], 5000))[:n] for c in range(2)]); wet *= (np.abs(B).max() + 1e-9) / (np.abs(wet).max() + 1e-9)
    return B * (1 - mix) + wet * mix
def gate(a, b, fi=0.6, fo=0.0):
    g = np.clip((tt - a) / fi, 0, 1)
    return g * (np.clip((b - tt) / fo, 0, 1) if fo > 0 else (tt < b))
def ks(f, dur, damp=0.996, bright=0.6):
    N = max(2, int(sr / f)); L = int(dur * sr); y = np.zeros(L + 2 * N + 2); y[1:N + 1] = lp(rng.uniform(-1, 1, N), 2000 + 5000 * bright)
    for k in range(1, (L // N) + 2):
        a, b = k * N + 1, min((k + 1) * N + 1, len(y)); y[a:b] = damp * 0.5 * (y[a - N:b - N] + y[a - N - 1:b - N - 1])
    return y[1:L + 1] * np.exp(-T(dur)[:L] * 0.6)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

pre = (tt < TB).astype(float)
inside = col(2)
Street, Hall, Out, Fx = buf(), buf(), buf(), buf()

# ---------------- street life before the flash ----------------
w = rng.normal(0, 1, n)
for k, (lo, hi) in enumerate([(280, 800), (800, 1700), (1700, 3200)]):          # murmur: band noise with syllabic swells
    seg = rng.random(int(D / 0.16) + 2) ** 2; sy = np.repeat(seg, int(0.16 * sr))[:n]; sy = lp(np.r_[sy, np.zeros(n - len(sy))], 9)
    for c in range(2):
        Street[c] += bp(rng.normal(0, 1, n), lo, hi) * np.clip(sy * 1.6, 0, 1.5) * (0.018 / (k + 1)) * (1 - 0.6 * inside)
for k in range(int(TB * 7)):                                                 # wooden geta clacks all around
    t0 = rng.random() * TB; f = 650 + rng.random() * 700; d = T(0.05)
    s = (np.sin(2 * np.pi * f * d) + 0.4 * hp(rng.normal(0, 1, len(d)), 2000)) * np.exp(-d * 110)
    add(Street, s, t0, rng.random(), 0.006 + 0.016 * rng.random() ** 2)
for v in range(5):                                                           # cicadas
    f0 = 3900 + v * 600; car = bp(rng.normal(0, 1, n), f0, f0 + 1700)
    puls = (0.5 + 0.5 * np.sin(2 * np.pi * (36 + v * 5) * tt)) ** 3; sw = np.clip(np.sin(2 * np.pi * tt / (6 + v * 1.4) + v * 1.9), 0, 1) ** 1.5
    add(Street, car * puls * sw * 0.035 * (1 - 0.7 * inside), 0, 0.12 + v * 0.19)
def chirp(B, t0, pan, g=0.03):
    for j in range(rng.integers(2, 5)):
        d = 0.05 + rng.random() * 0.05; t = T(d); f = 3000 + rng.random() * 2000
        s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.3 * np.sin(np.pi * t / d))) / sr) * np.sin(np.pi * t / d) ** 2; add(B, s, t0 + j * (d + 0.035), pan, g)
for k in range(22): chirp(Street, 0.8 + rng.random() * 25, rng.random())
def bell(t0, pan, g):                                                        # bicycle bell "chirin chirin"
    for j in range(2):
        d = T(0.7); s = sum(a * np.sin(2 * np.pi * f * d) for f, a in [(2450, 1), (3380, 0.6), (5300, 0.3)]) * np.exp(-d * 7)
        add(Street, s, t0 + j * 0.16, pan, g)
for t0, pan in [(3.8, 0.3), (9.4, 0.75), (14.3, 0.4), (21.2, 0.65)]: bell(t0, pan, 0.03)
def tram_bus(dcol, pcol, ring):
    d = col(dcol); p = col(pcol); g = 1 / np.sqrt(1 + (d / 7) ** 2) * pre
    rum = lp(rng.normal(0, 1, n), 140) * 0.5 + lp(rng.normal(0, 1, n), 420) * 0.15
    clk = np.zeros(n)
    for t0 in np.arange(0.3, TB, 0.85):
        i = int(t0 * sr); c = hp(rng.normal(0, 1, len(T(0.05))), 600) * np.exp(-T(0.05) * 70)
        for o in (0, int(0.11 * sr)): clk[i + o:i + o + len(c)] += c[: max(0, min(len(c), n - i - o))]
    whine = 0.25 * np.sin(2 * np.pi * np.cumsum(380 + 40 * np.sin(tt * 0.3)) / sr)
    sig = (rum + clk * 0.5 + whine * 0.3) * g * 0.16
    Street[0] += sig * np.cos(p * np.pi / 2); Street[1] += sig * np.sin(p * np.pi / 2)
    for t0 in ring:
        i = min(n - 1, int(t0 * sr)); pp = p[i]; gg = g[i]
        for j in range(2):
            dd = T(1.0); s = sum(a * np.sin(2 * np.pi * f * dd) for f, a in [(1560, 1), (3900, 0.4), (2340, 0.3)]) * np.exp(-dd * 4)
            add(Street, s, t0 + j * 0.28, pp, 0.05 * gg + 0.012)
tram_bus(3, 4, [3.4]); tram_bus(5, 6, [13.6])
# soft koto in the morning
SCALE = [62, 64, 65, 69, 70, 74, 76, 77, 81]
for k, t0 in enumerate(np.arange(1.2, 16.5, 1.25)):
    if rng.random() < 0.25: continue
    m = SCALE[rng.integers(0, 6)]; add(Street, ks(hz(m), 2.6, 0.997, 0.5), t0 + rng.random() * 0.15, 0.35 + rng.random() * 0.3, 0.05)
Street *= pre[None] * 1.8

# ---------------- bomber drone, heartbeat, tension ----------------
dr = sum(np.sin(2 * np.pi * f * tt + rng.random() * 6) * a for f, a in [(88, 1), (91.5, 0.9), (176, 0.45), (183, 0.4), (264, 0.15)])
dr = lp(dr * (1 + 0.25 * np.sin(2 * np.pi * 3.5 * tt)), 600) * env([(0, 0), (12.5, 0), (19, 1), (26, 0.8), (TB, 0.6)]) * pre
add(Fx, dr, 0, 0.55, 0.045)
def heart(t0, g, pan=0.5):
    for o, a in ((0, 1), (0.19, 0.7)):
        d = T(0.25); s = (np.sin(2 * np.pi * 52 * d) + 0.4 * np.sin(2 * np.pi * 34 * d)) * np.exp(-d * 22) * a; add(Fx, lp(s, 160), t0 + o, pan, g)
for t0 in np.arange(23.6, TB, 0.78): heart(t0, 0.12 * (t0 - 23) / 4)
pad = sum(np.sin(2 * np.pi * hz(m) * tt + rng.random() * 6) for m in (38, 45, 50)) * 0.3
add(Fx, lp(pad, 300) * env([(0, 0), (18, 0), (26.5, 1), (TB, 1)]) * pre, 0, 0.5, 0.05)

# ---------------- the flash: silence, ringing ----------------
d = T(5); add(Fx, np.sin(2 * np.pi * 3150 * d) * np.exp(-d * 0.7) * np.clip(d / 0.05, 0, 1), TB, 0.5, 0.045)
d = T(2.5); add(Fx, lp(np.sin(2 * np.pi * (44 - 8 * d) * d) * np.exp(-d * 2), 120), TB, 0.5, 0.35)
for t0 in np.arange(TB + 0.6, TBL, 0.5): heart(t0, 0.13)

# ---------------- panic and running ----------------
panic = np.zeros((2, n))
for c in range(2):
    car = bp(rng.normal(0, 1, n), 500, 2600); am = lp(np.clip(rng.normal(0, 1, n), 0, None), 6) * 9
    panic[c] = car * np.clip(am, 0, 1.4)
pm = env([(0, 0), (TB + 1.2, 0), (TB + 3.5, 1), (36.2, 1), (37.2, 0.35), (TBL, 0.4)]) * (tt < TBL)
ko = np.clip((tt - TB - 1) / 6, 0, 1)
Out += np.stack([lp(panic[c], 1200) * (1 - ko) + panic[c] * ko for c in range(2)]) * pm * 0.03
for k in range(260):                                                         # crowd running
    t0 = TB + 2 + rng.random() * (TBL - TB - 2); d = T(0.06); s = lp(rng.normal(0, 1, len(d)), 700) * np.exp(-d * 60)
    add(Out, s, t0, rng.random(), 0.02 * (0.3 if t0 > 36.5 else 1) * rng.random())
def breath(t0, dur, g, inhale=False):
    d = T(dur); s = bp(rng.normal(0, 1, len(d)), 500 if not inhale else 900, 1900 if not inhale else 3200) * np.sin(np.pi * d / dur) ** 1.5; add(Hall, s, t0, 0.5, g)
for t0 in np.arange(30.6, 41.4, 0.47): breath(t0, 0.24, 0.05); breath(t0 + 0.26, 0.17, 0.03, True)
rumble = lp(rng.normal(0, 1, n), 70) * env([(0, 0), (39.8, 0), (TBL, 1), (TBL + 0.01, 0)]); add(Fx, rumble, 0, 0.5, 0.16)

# ---------------- footsteps ----------------
for t0, kd in STEPS:
    if kd == 0: d = T(0.09); s = lp(rng.normal(0, 1, len(d)), 500) * np.exp(-d * 45) + 0.5 * np.sin(2 * np.pi * 85 * d) * np.exp(-d * 40); add(Street if t0 < TB else Out, s, t0, 0.5, 0.06)
    elif kd == 1: d = T(0.1); s = lp(rng.normal(0, 1, len(d)), 900) * np.exp(-d * 40) + 0.3 * hp(rng.normal(0, 1, len(d)), 2500) * np.exp(-d * 60) + 0.6 * np.sin(2 * np.pi * 75 * d) * np.exp(-d * 30); add(Out, s, t0, 0.5, 0.09)
    elif kd == 2: d = T(0.08); s = hp(rng.normal(0, 1, len(d)), 1200) * np.exp(-d * 70) + 0.5 * np.sin(2 * np.pi * 180 * d) * np.exp(-d * 50); add(Hall, s, t0, 0.5, 0.08)
    else:
        for j in range(5):
            d = T(0.04); s = bp(rng.normal(0, 1, len(d)), 1500, 6000) * np.exp(-d * 90); add(Out, s, t0 + j * 0.018 + rng.random() * 0.01, 0.5, 0.025)
        d = T(0.1); add(Out, lp(rng.normal(0, 1, len(d)), 400) * np.exp(-d * 40), t0, 0.5, 0.05)

# ---------------- the blast ----------------
d = T(4.0); boom = lp(rng.normal(0, 1, len(d)), 180) * np.exp(-d * 1.4) * np.clip(d / 0.006, 0, 1) * 3 + np.sin(2 * np.pi * np.cumsum(55 - 27 * np.clip(d / 2, 0, 1)) / sr) * np.exp(-d * 1.1) * 1.6
add(Fx, np.tanh(boom * 1.4), TBL, 0.5, 0.28)
d = T(1.0); add(Fx, hp(rng.normal(0, 1, len(d)), 2500) * np.exp(-d * 5), TBL + 0.02, 0.5, 0.15)
for k in range(520):                                                         # shattering glass
    t0 = TBL + rng.exponential(0.35); f = 3000 + rng.random() * 6000; d = T(0.04 + rng.random() * 0.05)
    add(Fx, np.sin(2 * np.pi * f * d) * np.exp(-d * (50 + rng.random() * 60)), t0, rng.random(), 0.02 + 0.03 * rng.random())
for k in range(26):                                                          # plaster and debris
    t0 = TBL + 0.15 + rng.random() * 1.8; d = T(0.18); add(Fx, lp(rng.normal(0, 1, len(d)), 600) * np.exp(-d * 25), t0, rng.random(), 0.05 + 0.08 * rng.random())
# muffled hearing: tinnitus + low-passed rumble bed
d = T(9); add(Fx, np.sin(2 * np.pi * 4100 * d) * np.exp(-d * 0.32) * np.clip(d / 0.4, 0, 1), TBL + 0.4, 0.5, 0.035)
bed = lp(rng.normal(0, 1, n), 220) * env([(0, 0), (TBL, 0), (TBL + 0.5, 1), (50, 0.35), (56.5, 0.1), (57, 0)]); add(Hall, bed, 0, 0.5, 0.12)
for k in range(140):
    t0 = 43 + rng.random() * 13; d = T(0.02); add(Hall, hp(rng.normal(0, 1, len(d)), 3000) * np.exp(-d * 200), t0, rng.random(), 0.012 * rng.random())
for t0 in (44.6, 46.9, 50.3, 53.1):                                         # coughing
    for j in range(2):
        d = T(0.16); add(Hall, bp(rng.normal(0, 1, len(d)), 300, 1800) * np.exp(-d * 18) * np.clip(d / 0.01, 0, 1), t0 + j * 0.24, 0.5, 0.05)
for t0 in np.arange(43.0, 56.4, 0.62): breath(t0, 0.5, 0.018); breath(t0 + 0.32, 0.25, 0.012, True)
# soft sobbing (wordless), three people around the room
def sob(t0, t1, f0, pan, g):
    t = t0
    while t < t1:
        for j in range(rng.integers(2, 4)):
            d = T(0.07); add(Hall, bp(rng.normal(0, 1, len(d)), 900, 3000) * np.sin(np.pi * d / 0.07), t, pan, g * 0.35); t += 0.1
        dur = 0.45 + rng.random() * 0.6; d = T(dur); f = f0 * (1 - 0.15 * d / dur) * (1 + 0.04 * np.sin(2 * np.pi * 5.5 * d))
        ph = np.cumsum(f) / sr; src = sum(np.sin(2 * np.pi * k * ph) / k for k in range(1, 14)) + 0.25 * rng.normal(0, 1, len(d))
        v = bp(src, 600, 900) * 1.0 + bp(src, 1050, 1400) * 0.6 + bp(src, 2400, 2900) * 0.25
        e = np.sin(np.pi * d / dur) ** 0.8 * (0.6 + 0.4 * np.sin(2 * np.pi * 6.5 * d) ** 2)
        add(Hall, lp(v * e, 3200), t, pan, g); t += dur + 0.35 + rng.random() * 0.7
sob(48.2, 55.5, 330, 0.3, 0.05); sob(49.0, 55.8, 410, 0.65, 0.035); sob(50.4, 55.4, 290, 0.5, 0.028)
pad2 = sum(np.sin(2 * np.pi * hz(m) * tt + rng.random() * 6) * a for m, a in ((50, 1), (57, 0.7), (62, 0.5), (65, 0.35)))
add(Fx, lp(pad2, 900) * env([(0, 0), (46.5, 0), (51, 1), (55, 0.8), (57.2, 0)]), 0, 0.5, 0.02)
hb = 0.75
t0 = 44.0
while t0 < 56.6:
    heart(t0, 0.1 + 0.08 * np.clip((t0 - 53) / 3, 0, 1) * (t0 < 56)); hb += 0.035; t0 += hb

# ---------------- aftermath ----------------
A = (tt >= TOUT).astype(float) * np.clip((tt - TOUT) / 1.5, 0, 1)
gust = lp(rng.random(n), 0.4); gust = (gust - gust.min()) / (gust.max() - gust.min() + 1e-9)
for c in range(2): Out[c] += bp(rng.normal(0, 1, n), 180, 1300) * (0.35 + 0.65 * gust) * A * 0.05
crk = np.zeros((2, n)); idx = np.where(rng.random(n) < 45 / sr)[0]
for i in idx:
    c = rng.integers(0, 2); L = min(300, n - i); crk[c, i:i + L] += bp(rng.normal(0, 1, L), 1200, 6000) * np.exp(-np.arange(L) / 40) * rng.random() ** 2
Out += crk * A * 0.25
for c in range(2): Out[c] += lp(rng.normal(0, 1, n), 300) * A * 0.035 * (0.7 + 0.3 * np.sin(tt * 0.7 + c))
for t0 in (62.4, 67.9, 74.2):
    d = T(3); add(Out, lp(rng.normal(0, 1, len(d)), 140) * np.exp(-d * 1.5) * np.clip(d / 0.05, 0, 1), t0, rng.random(), 0.1)
rain = env([(0, 0), (63, 0), (68, 1), (D, 1)])
for c in range(2): Out[c] += hp(rng.normal(0, 1, n), 1800) * rain * 0.02
pidx = np.where(rng.random(n) < 120 / sr * rain)[0]
for i in pidx:
    L = min(220, n - i); Out[rng.integers(0, 2), i:i + L] += hp(rng.normal(0, 1, L), 2500) * np.exp(-np.arange(L) / 25) * 0.04
# sparse koto (miyako-bushi) and a low drone
MEL = [(64.6, 69), (66.0, 70), (67.4, 74), (70.0, 72), (71.4, 70), (73.2, 69), (75.6, 65), (77.0, 64)]
for t0, m in MEL: add(Fx, ks(hz(m), 3.5, 0.997, 0.45), t0, 0.45, 0.06); add(Fx, ks(hz(m - 12), 3.5, 0.996, 0.35), t0, 0.55, 0.025)
dr2 = sum(np.sin(2 * np.pi * hz(m) * tt + rng.random() * 6) for m in (40, 47)) * 0.5
add(Fx, lp(dr2, 250) * env([(0, 0), (TOUT, 0), (62, 1), (78.5, 1), (80.5, 0)]), 0, 0.5, 0.05)
# temple bell on the final caption
d = T(4.2); tb = sum(a * np.sin(2 * np.pi * 110 * r * d + rng.random() * 6) * np.exp(-d * dk) for r, a, dk in [(1, 1, 0.7), (2.0, 0.5, 1.1), (2.76, 0.45, 1.4), (3.9, 0.3, 2), (5.4, 0.2, 2.8), (6.8, 0.12, 3.5)])
add(Fx, tb * (1 + 0.05 * np.sin(2 * np.pi * 1.3 * d)), 80.3, 0.5, 0.09)

# ---------------- mix ----------------
Street = reverb(Street, 1.2, 0.15, 2); Out = reverb(Out, 1.6, 0.18, 3); Hall = reverb(Hall, 2.6, 0.38, 4)
mix = Street + Out * (1 - 0.8 * ((tt > TBL) & (tt < TOUT)))[None] + Hall + Fx
mix *= np.clip((tt > TOUT - 0.01) | (tt < 56.7), 0, 1)[None] * 1.0
mix *= np.clip((D - tt) / 1.0, 0, 1)[None]
mix /= np.abs(mix).max() + 1e-9
sf.write("build/audio.wav", (mix.T * 0.9).astype(np.float32), sr)
print("audio", mix.shape, D)
