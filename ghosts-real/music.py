"""Soft score that follows each beat's mood (eerie / curious / warm) plus light sound effects, all synthesised."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json"))
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(3)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
T = lambda d: np.arange(int(d * sr)) / sr
def buf(): return [np.zeros(n), np.zeros(n)]
def add(B, sig, start, pan=0.5):
    i = int(max(0, start) * sr)
    if i >= n: return
    sig = sig[: n - i]; B[0][i:i + len(sig)] += sig * np.cos(pan * np.pi / 2); B[1][i:i + len(sig)] += sig * np.sin(pan * np.pi / 2)
def noise(d, hp=0):
    x = rng.normal(0, 1, int(d * sr))
    for _ in range(hp): x = np.diff(x, prepend=0)
    return x
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
# mood envelope per sample (cross-faded over 1.2 s)
moods = {"eerie": 0, "curious": 1, "warm": 2}
W = np.zeros((3, n)); tt = np.arange(n) / sr
for b in TL["beats"]:
    i0, i1 = int(b["start"] * sr), min(n, int(b["end"] * sr)); W[moods[b["mood"]], i0:i1] = 1
W[:, int(TL["beats"][-1]["end"] * sr):] = W[:, int(TL["beats"][-1]["end"] * sr) - 1:int(TL["beats"][-1]["end"] * sr)]
k = np.ones(int(1.2 * sr)) / int(1.2 * sr)
for m in range(3): W[m] = np.convolve(W[m], k, mode="same")

M = [buf(), buf(), buf()]
def bell(B, m, t0, vol, pan, dec=2.2):
    f = hz(m); t = T(3.0); s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 3) + 0.18 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 5)
    add(B, s * np.clip(t / 0.006, 0, 1) * np.exp(-t * dec) * vol, t0, pan)
def pluck(B, m, t0, vol, pan, dec=7.0):
    f = hz(m); t = T(0.8); s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 10)
    add(B, s * np.clip(t / 0.004, 0, 1) * np.exp(-t * dec) * vol, t0, pan)
def pad(B, ms, t0, d, vol):
    t = T(d + 1.5); e = np.clip(t / 1.2, 0, 1) * np.clip((d + 1.5 - t) / 1.5, 0, 1); s = np.zeros(len(t))
    for j, m in enumerate(ms):
        for dt in (-0.07, 0.06): s += np.sin(2 * np.pi * hz(m + dt) * t + j) * (0.7 if dt < 0 else 0.5)
    add(B, s * e * vol / len(ms), t0, 0.5)
# eerie: slow minor bells over a soft low drone (D minor, a little suspended)
BAR = 60 / 66 * 4
EER = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 63, 67], [45, 52, 57, 61, 64]]
b = 0
while b * BAR < dur:
    ch = EER[b % 4]; t0 = b * BAR
    pad(M[0], [ch[0] - 12, ch[0], ch[1]], t0, BAR, 0.05)
    for j, m in enumerate([ch[3], ch[4], ch[2] + 12, ch[4]] if b % 2 == 0 else [ch[4] + 12, ch[3], ch[4], ch[2]]): bell(M[0], m + 12, t0 + j * BAR / 4 + (0.08 if j % 2 else 0), 0.045, 0.3 + 0.13 * j)
    b += 1
# curious: light pizzicato walking pattern with a soft pad and a gentle tick (D dorian-ish, 96 bpm)
BEAT = 60 / 96; BAR2 = 4 * BEAT
CUR = [[50, 62, 65, 69], [48, 60, 64, 67], [46, 58, 62, 65], [45, 57, 61, 64]]
PAT = [0, 2, 1, 3, 2, 1, 3, 1]
b = 0
while b * BAR2 < dur:
    ch = CUR[b % 4]; t0 = b * BAR2
    pad(M[1], ch[1:], t0, BAR2, 0.032)
    for j in range(8): pluck(M[1], ch[1 + PAT[j] % 3] + (12 if PAT[j] == 3 else 0), t0 + j * BEAT / 2, 0.05 if j % 2 == 0 else 0.035, 0.35 + 0.3 * (j % 2))
    for j in range(4):
        pluck(M[1], ch[0] - 12, t0 + j * BEAT, 0.09 if j % 2 == 0 else 0.06, 0.5, 9)
        tk = T(0.04); add(M[1], noise(0.04, 1) * np.exp(-tk * 90) * 0.012, t0 + (j + 0.5) * BEAT, 0.62)
    b += 1
# warm: major music-box over a soft pad (D major)
WRM = [[50, 62, 66, 69], [47, 59, 62, 66], [43, 55, 59, 62], [45, 57, 61, 64]]
BAR3 = 60 / 76 * 4; MEL = [[9, 7, 4, 7], [7, 4, 2, 4], [4, 2, 0, 2], [4, 7, 9, 12]]
b = 0
while b * BAR3 < dur:
    ch = WRM[b % 4]; t0 = b * BAR3
    pad(M[2], ch, t0, BAR3, 0.045)
    for j, dm in enumerate(MEL[b % 4]): bell(M[2], 74 + dm - (0 if b % 4 != 2 else 0), t0 + j * BAR3 / 4, 0.05, 0.45 + 0.05 * j, 3.0)
    pluck(M[2], ch[0] - 12, t0, 0.09, 0.5, 4); pluck(M[2], ch[0] - 5, t0 + BAR3 / 2, 0.06, 0.5, 4)
    b += 1
out = np.zeros((n, 2))
for m in range(3): out += np.stack(M[m], 1) * W[m][:, None]
for c in range(2):
    for d, g in ((0.29, 0.25), (0.53, 0.15), (0.83, 0.08)): kk = int(d * sr); out[kk:, c] += out[:-kk, 1 - c] * g
out *= (np.clip(tt / 1.5, 0, 1) * np.clip((dur - tt) / 3.0, 0, 1))[:, None]
sf.write("build/music.wav", out * (0.6 / np.abs(out).max()), sr)

# ---------------- sound effects ----------------
S = buf()
def tick(t0):
    for i in range(8):
        tk = T(0.03); add(S, noise(0.03, 2) * np.exp(-tk * 160) * (0.07 if i % 2 == 0 else 0.05), t0 + i * 0.5, 0.6)
def creak(t0):
    t = T(0.9); f = 180 + 70 * np.sin(2 * np.pi * 0.9 * t) + 25 * np.sin(2 * np.pi * 7 * t); ph = 2 * np.pi * np.cumsum(f) / sr
    s = np.sign(np.sin(ph)) * 0.3 + np.sin(3 * ph) * 0.3; s = lp(s * (0.6 + 0.4 * (np.sin(2 * np.pi * 23 * t) > 0)), 0.2)
    add(S, s * np.clip(t / 0.1, 0, 1) * np.clip((0.9 - t) / 0.25, 0, 1) * 0.12, t0, 0.4)
def steps(t0):
    for i in range(4):
        tk = T(0.25); add(S, (np.sin(2 * np.pi * (70 + 40 * np.exp(-tk * 30)) * tk) + 0.3 * noise(0.25)[:len(tk)] * np.exp(-tk * 40)) * np.exp(-tk * 18) * 0.22, t0 + i * 0.55, 0.35 + 0.1 * (i % 2))
def wind(t0, d=3.0):
    t = T(d); x = lp(noise(d), 0.03); s = x * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t)) * np.clip(t / 0.8, 0, 1) * np.clip((d - t) / 1.0, 0, 1)
    add(S, s / (np.abs(s).max() + 1e-9) * 0.07, t0, 0.5)
def sting(t0):
    t = T(2.2); s = sum(np.sin(2 * np.pi * hz(m) * t + m) for m in (62, 63, 68)) * np.exp(-t * 1.6) * np.clip(t / 0.02, 0, 1)
    add(S, s * 0.035, t0, 0.5); add(S, np.sin(2 * np.pi * hz(38) * t) * np.exp(-t * 2) * 0.08, t0)
def whoosh(t0):
    t = T(0.9); x = noise(0.9, 1); y = np.zeros_like(x); a = 0.02 + 0.3 * np.sin(np.pi * t / 0.9)
    acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    add(S, y * np.sin(np.pi * t / 0.9) ** 2 * 0.25, t0, 0.5)
def pop(t0):
    t = T(0.12); f = 380 + 900 * (t / 0.12); add(S, np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 28) * 0.13, t0, 0.5)
def beep(t0): t = T(0.14); add(S, np.sin(2 * np.pi * 1320 * t) * np.clip((0.14 - t) / 0.02, 0, 1) * 0.05, t0, 0.55)
def flat(t0): t = T(1.6); add(S, np.sin(2 * np.pi * 990 * t) * np.clip(t / 0.02, 0, 1) * np.clip((1.6 - t) / 0.3, 0, 1) * 0.035, t0, 0.55)
def ding(t0):
    t = T(1.4); s = np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2352 * t) * np.exp(-t * 4); add(S, s * np.exp(-t * 3.2) * 0.07, t0, 0.55)
def hum(t0, d=12.0):
    t = T(d); s = (np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t) + 0.2 * lp(noise(d), 0.05)) * np.clip(t / 1.0, 0, 1) * np.clip((d - t) / 1.5, 0, 1)
    add(S, s * 0.035, t0, 0.5)
def click(t0): tk = T(0.05); add(S, noise(0.05, 2) * np.exp(-tk * 120) * 0.12, t0, 0.5); add(S, noise(0.04, 2)[:int(0.04 * sr)] * np.exp(-T(0.04) * 140) * 0.08, t0 + 0.07, 0.5)
def crash(t0):
    t = T(1.0); s = noise(1.0, 2) * np.exp(-t * 7) * 0.14
    for f in (2100, 3170, 4430, 5870): s += np.sin(2 * np.pi * f * t) * np.exp(-t * 6) * 0.02
    add(S, s, t0, 0.3)
    for i in range(3): tk = T(0.08); add(S, noise(0.08, 2) * np.exp(-tk * 60) * 0.05, t0 + 0.25 + i * 0.14, 0.25)
def meow(t0):
    t = T(0.75); f = 600 + 300 * np.sin(np.pi * t / 0.75) - 200 * (t / 0.75) ** 2; ph = 2 * np.pi * np.cumsum(f) / sr
    s = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * np.sin(np.pi * t / 0.75) ** 1.5
    add(S, s * 0.05, t0, 0.3)
FX = dict(tick=tick, creak=creak, steps=steps, wind=wind, sting=sting, whoosh=whoosh, pop=pop, beep=beep, flat=flat, ding=ding, hum=hum, click=click, crash=crash, meow=meow)
cnt = 0
for b in TL["beats"]:
    for e in b["sfx"]: FX[e["name"]](e["t"]); cnt += 1
sfx = np.stack(S, 1)
sf.write("build/sfx.wav", sfx * (0.8 / np.abs(sfx).max()), sr)
print("music", round(dur, 1), "sfx", cnt)
