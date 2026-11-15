"""Sneaky heist score (pizzicato bass walk, muted plucks, finger snaps) plus prison sound effects, all synthesised."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json"))
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(11)
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
M = buf(); BEAT = 60 / 112; BAR = 4 * BEAT
ROOT = [45, 45, 41, 40]                       # Am Am F E
WALK = [0, 3, 5, 6, 7, 6, 5, 3]
def pluck(m, t0, vol, pan, dec=9.0):
    f = hz(m); t = T(0.6); s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 14)
    add(M, s * np.clip(t / 0.003, 0, 1) * np.exp(-t * dec) * vol, t0, pan)
bar = 0
while bar * BAR < dur:
    r = ROOT[bar % 4]; t0 = bar * BAR
    for j, w in enumerate(WALK): pluck(r - 12 + w, t0 + j * BEAT / 2, 0.14 if j % 2 == 0 else 0.1, 0.5, 7)
    for j in (1, 3): ts = T(0.06); add(M, noise(0.06, 2) * np.exp(-ts * 70) * 0.05, t0 + j * BEAT, 0.62)   # snaps
    if bar >= 1:
        mel = [12, 15, 14, 12, 10, 12, 7, None] if bar % 2 == 0 else [12, None, 15, 17, 15, 14, 12, None]
        for j, d in enumerate(mel):
            if d is not None: pluck(r + 12 + d, t0 + j * BEAT / 2 + 0.02, 0.05, 0.35 + 0.3 * (j % 2), 12)
        tt = T(BAR + 0.5); e = np.clip(tt / 0.4, 0, 1) * np.clip((BAR + 0.5 - tt) / 0.5, 0, 1)
        for m in (r + 12, r + 15, r + 19): add(M, np.sin(2 * np.pi * hz(m) * tt) * e * 0.012, t0, 0.5)
    for j in range(4):
        tk = T(0.18); add(M, np.sin(2 * np.pi * (52 + 60 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 18) * (0.11 if j == 0 or j == 2 else 0.0), t0 + j * BEAT)
    bar += 1
for c in range(2):
    kk = int(BEAT * 0.75 * sr); M[c][kk:] += M[1 - c][:-kk] * 0.15
tt = np.arange(n) / sr
mus = np.stack(M, 1) * (np.clip(tt / 0.5, 0, 1) * np.clip((dur - tt) / 2.0, 0, 1))[:, None]
sf.write("build/music.wav", mus * (0.6 / np.abs(mus).max()), sr)

S = buf()
def slam(t0):
    t = T(0.8); add(S, (np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 20)) * t) + 0.4 * noise(0.8)[:len(t)] * np.exp(-t * 25)) * np.exp(-t * 6) * 0.35, t0)
    for f in (820, 1240, 1710): add(S, np.sin(2 * np.pi * f * t) * np.exp(-t * 5) * 0.03, t0, 0.5)
def whoosh(t0):
    t = T(0.8); x = noise(0.8, 1); a = 0.03 + 0.3 * np.sin(np.pi * t / 0.8); y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    add(S, y * np.sin(np.pi * t / 0.8) ** 2 * 0.3, t0, 0.5)
def waves(t0, d=8.0): t = T(d); x = lp(noise(d), 0.04)[:len(t)]; add(S, x / (np.abs(x).max() + 1e-9) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * t)) * np.clip(t / 1, 0, 1) * np.clip((d - t) / 1.5, 0, 1) * 0.12, t0, 0.5)
def gull(t0):
    for i in range(2):
        t = T(0.35); f = 1500 + 600 * np.sin(np.pi * t / 0.35); add(S, np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * t / 0.35) * 0.03, t0 + i * 0.45, 0.7)
def scrape(t0, d=1.6):
    for i in range(int(d / 0.32)):
        t = T(0.24); add(S, lp(noise(0.24, 1), 0.4)[:len(t)] * np.sin(np.pi * t / 0.24) * 0.12, t0 + i * 0.32, 0.45)
def pop(t0): t = T(0.12); add(S, np.sin(2 * np.pi * np.cumsum(380 + 900 * t / 0.12) / sr) * np.exp(-t * 28) * 0.13, t0, 0.5)
def siren(t0, d=3.0):
    return
    t = T(d); f = 700 + 250 * np.sin(2 * np.pi * 0.7 * t); add(S, np.sin(2 * np.pi * np.cumsum(f) / sr) * np.clip(t / 0.5, 0, 1) * np.clip((d - t) / 0.8, 0, 1) * 0.025, t0, 0.6)
def splash(t0): t = T(1.0); add(S, lp(noise(1.0, 1), 0.3)[:len(t)] * np.exp(-t * 4) * 0.3, t0, 0.5)
def knock(t0):
    for i in range(3): t = T(0.12); add(S, (np.sin(2 * np.pi * 900 * t) + 0.5 * np.sin(2 * np.pi * 1400 * t)) * np.exp(-t * 40) * 0.12, t0 + i * 0.13, 0.45)
def thud(t0):
    for i, v in enumerate((0.4, 0.18, 0.08)): t = T(0.3); add(S, np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 14) * v, t0 + i * 0.22, 0.5)
def sting(t0):
    t = T(1.4); add(S, sum(np.sin(2 * np.pi * hz(m) * t) for m in (57, 60, 63, 66)) * np.exp(-t * 2.2) * np.clip(t / 0.01, 0, 1) * 0.04, t0, 0.5)
def dun(t0):
    for i, (m, d) in enumerate(((45, 0.35), (44, 0.35), (43, 1.1))):
        t = T(d); add(S, sum(np.sin(2 * np.pi * hz(m) * h * t) / h for h in range(1, 6)) * np.clip(t / 0.01, 0, 1) * np.exp(-t * 2) * np.clip((d - t) / 0.1, 0, 1) * 0.08, t0 + i * 0.38)
def shower(t0, d=3.5): t = T(d); add(S, noise(d, 2)[:len(t)] * np.clip(t / 0.3, 0, 1) * np.clip((d - t) / 0.6, 0, 1) * 0.03, t0, 0.5)
def motor(t0, d=3.5):
    t = T(d); f = 55 + 25 * np.clip(t / 1.0, 0, 1); ph = 2 * np.pi * np.cumsum(f) / sr; s = np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph) * 0.3
    add(S, lp(s, 0.2) * np.clip(t / 0.3, 0, 1) * np.clip((d - t) / 0.8, 0, 1) * 0.12, t0, 0.5)
def cuffs(t0):
    for i in range(2): t = T(0.08); add(S, noise(0.08, 2)[:len(t)] * np.exp(-t * 60) * 0.12, t0 + i * 0.09, 0.5); add(S, np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 40) * 0.05, t0 + i * 0.09, 0.5)
def heli(t0, d=4.6):
    t = T(d); chop = (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t)) ** 3; x = lp(noise(d), 0.08)[:len(t)]
    add(S, x / (np.abs(x).max() + 1e-9) * chop * np.clip(t / 0.6, 0, 1) * np.clip((d - t) / 1.0, 0, 1) * 0.25, t0, 0.5)
def ding(t0): t = T(1.2); add(S, (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2352 * t) * np.exp(-t * 4)) * np.exp(-t * 3.5) * 0.08, t0, 0.55)
def ting(t0):
    t = T(1.6); s = np.sin(2 * np.pi * 2637 * t) + 0.6 * np.sin(2 * np.pi * 3951 * t) + 0.3 * np.sin(2 * np.pi * 5274 * t) * np.exp(-t * 6); add(S, s * np.exp(-t * 3) * 0.08, t0, 0.55)
FX = dict(slam=slam, whoosh=whoosh, waves=waves, gull=gull, scrape=scrape, pop=pop, siren=siren, splash=splash, knock=knock, thud=thud, sting=sting, dun=dun, shower=shower, motor=motor, cuffs=cuffs, heli=heli, ding=ding, ting=ting)
for b in TL["beats"]:
    for e in b["sfx"]: FX[e["name"]](e["t"])
sfx = np.stack(S, 1)
sf.write("build/sfx.wav", sfx * (0.8 / np.abs(sfx).max()), sr)
print("music + sfx", round(dur, 1))
