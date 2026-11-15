"""Light, curious storytelling score (plucks, soft pad, gentle beat) and train / workshop sound effects, all synthesised."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json"))
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(7)
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
M = buf(); BEAT = 60 / 104; BAR = 4 * BEAT
CH = [[48, 64, 67, 72], [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]]   # C Am F G
def pluck(m, t0, vol, pan, dec=8.0):
    f = hz(m); t = T(0.7); s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 12) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 18)
    add(M, s * np.clip(t / 0.004, 0, 1) * np.exp(-t * dec) * vol, t0, pan)
tense = np.zeros(n)
for b in TL["beats"]:
    if b["id"] in ("kink", "danger"): tense[int(b["start"] * sr):int(b["end"] * sr)] = 1
tense = np.convolve(tense, np.ones(int(0.6 * sr)) / int(0.6 * sr), mode="same")
bar = 0
while bar * BAR < dur:
    ch = CH[bar % 4]; t0 = bar * BAR
    tt = T(BAR + 0.8); e = np.clip(tt / 0.5, 0, 1) * np.clip((BAR + 0.8 - tt) / 0.8, 0, 1)
    for j, m in enumerate(ch[1:]): add(M, np.sin(2 * np.pi * hz(m) * tt + j) * e * 0.022, t0, 0.3 + 0.2 * j)
    for j, p in enumerate([1, 2, 3, 2, 1, 3, 2, 3]): pluck(ch[p] + 12, t0 + j * BEAT / 2, 0.05 if j % 2 == 0 else 0.036, 0.35 + 0.3 * (j % 2))
    for j in range(4):
        pluck(ch[0] - 12 + (7 if j % 2 else 0), t0 + j * BEAT, 0.11, 0.5, 6)
        if bar >= 1:
            tk = T(0.2); add(M, np.sin(2 * np.pi * (50 + 70 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 18) * (0.12 if j % 2 == 0 else 0.0), t0 + j * BEAT)
            ts = T(0.05); add(M, noise(0.05, 1) * np.exp(-ts * 80) * 0.02, t0 + (j + 0.5) * BEAT, 0.65)
    bar += 1
for c in range(2):
    kk = int(BEAT * 0.75 * sr); M[c][kk:] += M[1 - c][:-kk] * 0.18
tt = np.arange(n) / sr
mus = np.stack(M, 1) * (1 - 0.55 * tense)[:, None]
dr = np.sin(2 * np.pi * hz(36) * tt) * 0.5 + np.sin(2 * np.pi * hz(43) * tt) * 0.3
mus += (dr * tense * 0.05)[:, None]
mus *= (np.clip(tt / 0.6, 0, 1) * np.clip((dur - tt) / 2.0, 0, 1))[:, None]
sf.write("build/music.wav", mus * (0.6 / np.abs(mus).max()), sr)

S = buf()
def horn(t0, d=1.0):
    t = T(d); e = np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.2, 0, 1); s = 0
    for m in (63, 67, 70):
        ph = 2 * np.pi * hz(m) * t; s = s + sum(np.sin(h * ph) / h for h in range(1, 7))
    add(S, s * e * 0.03, t0, 0.5)
def ding(t0): t = T(1.2); add(S, (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2352 * t) * np.exp(-t * 4)) * np.exp(-t * 3.5) * 0.08, t0, 0.55)
def whoosh(t0):
    t = T(0.8); x = noise(0.8, 1); a = 0.03 + 0.3 * np.sin(np.pi * t / 0.8); y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    add(S, y * np.sin(np.pi * t / 0.8) ** 2 * 0.3, t0, 0.5)
def sizzle(t0, d=4.0): t = T(d); add(S, noise(d, 2)[:len(t)] * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t)) * np.clip(t / 0.8, 0, 1) * np.clip((d - t) / 1.0, 0, 1) * 0.02, t0, 0.5)
def stretch(t0, d=1.6):
    t = T(d); f = 90 + 70 * t / d; ph = 2 * np.pi * np.cumsum(f) / sr; s = lp(np.sign(np.sin(ph)) * (0.5 + 0.5 * (np.sin(2 * np.pi * 17 * t) > 0)), 0.15)
    add(S, s * np.clip(t / 0.1, 0, 1) * np.clip((d - t) / 0.3, 0, 1) * 0.1, t0, 0.5)
def groan(t0): stretch(t0, 1.3)
def boing(t0):
    t = T(0.6); f = 140 + 260 * np.exp(-t * 3) * (1 + 0.3 * np.sin(2 * np.pi * 12 * t)); add(S, np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 5) * 0.2, t0, 0.5)
    tk = T(0.3); add(S, np.sin(2 * np.pi * (60 + 60 * np.exp(-tk * 20)) * tk) * np.exp(-tk * 12) * 0.25, t0)
def screech(t0, d=1.4):
    t = T(d); f = 2400 + 300 * np.sin(2 * np.pi * 9 * t); s = np.sin(2 * np.pi * np.cumsum(f) / sr) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / sr) + 0.3 * noise(d, 1)[:len(t)]
    add(S, s * np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.3, 0, 1) * 0.05, t0, 0.5)
def pop(t0): t = T(0.12); add(S, np.sin(2 * np.pi * np.cumsum(380 + 900 * t / 0.12) / sr) * np.exp(-t * 28) * 0.13, t0, 0.5)
def clack1(t0, v=1.0):
    tk = T(0.12); add(S, (noise(0.12, 1)[:len(tk)] * 0.5 + np.sin(2 * np.pi * 420 * tk)) * np.exp(-tk * 45) * 0.13 * v, t0, 0.45)
def clack(t0):
    for i in range(6): clack1(t0 + i * 0.7, 1.0); clack1(t0 + i * 0.7 + 0.12, 0.8)
def weld(t0, d=1.8): t = T(d); add(S, noise(d, 2)[:len(t)] * (0.5 + 0.5 * (rng.random(len(t)) > 0.7)) * np.clip((d - t) / 0.3, 0, 1) * 0.04, t0, 0.5)
def clunk(t0):
    for i in range(3): tk = T(0.25); add(S, (np.sin(2 * np.pi * (90 + 60 * np.exp(-tk * 30)) * tk) + 0.3 * noise(0.25)[:len(tk)] * np.exp(-tk * 50)) * np.exp(-tk * 14) * 0.25, t0 + i * 0.32, 0.5)
def train(t0, d=4.0):
    t = T(d); rum = lp(noise(d), 0.02)[:len(t)]; e = np.clip(t / 1.5, 0, 1) * np.clip((d - t) / 1.2, 0, 1)
    add(S, rum / (np.abs(rum).max() + 1e-9) * e * 0.12, t0, 0.5)
    for i in range(int(d / 0.45)): clack1(t0 + i * 0.45, 0.6 * e[min(len(e) - 1, int(i * 0.45 * sr))])
FX = dict(horn=horn, ding=ding, whoosh=whoosh, sizzle=sizzle, stretch=stretch, groan=groan, boing=boing, screech=screech, pop=pop, clack=clack, weld=weld, clunk=clunk, train=train)
for b in TL["beats"]:
    for e in b["sfx"]: FX[e["name"]](e["t"])
sfx = np.stack(S, 1)
sf.write("build/sfx.wav", sfx * (0.8 / np.abs(sfx).max()), sr)
print("music + sfx", round(dur, 1))
