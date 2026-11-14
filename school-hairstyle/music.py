"""Bouncy comedy score (oom-pah bass, plucked off-beats, marimba riff) and cartoon sound effects, all synthesised."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json"))
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(11)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def buf(): return np.zeros(n), np.zeros(n)
def add(B, sig, start, pan=0.5):
    i = int(max(0, start) * sr)
    if i >= n: return
    sig = sig[: n - i]; B[0][i:i + len(sig)] += sig * np.cos(pan * np.pi / 2); B[1][i:i + len(sig)] += sig * np.sin(pan * np.pi / 2)
T = lambda d: np.arange(int(d * sr)) / sr
env = lambda t, a, r: np.clip(t / a, 0, 1) * np.exp(-t * r)
def noise(d, hp=0): x = rng.normal(0, 1, int(d * sr)); return np.diff(x, n=hp, prepend=[0] * hp) if hp else x
def sweep(f0, f1, d, shape=1.0): t = T(d); f = f0 + (f1 - f0) * (t / d) ** shape; return np.sin(2 * np.pi * np.cumsum(f) / sr), t

# ---------------- music ----------------
M = buf(); BEAT = 60 / 118; BAR = 4 * BEAT
CH = [[48, 64, 67, 72], [53, 65, 69, 72], [55, 62, 67, 71], [48, 64, 67, 72], [45, 64, 69, 72], [50, 65, 69, 74], [55, 62, 65, 71], [48, 64, 67, 72]]   # C F G C Am Dm G7 C
RIFF = [[0, 2, 4, 7, 9, 7, 4, 2], [0, 4, 7, 12, 9, 7, 4, 7], [2, 5, 7, 11, 7, 5, 2, 5], [0, 4, 7, 4, 12, 7, 4, 0]]
def pluck(m, t0, vol, pan, dec=9.0):
    f = hz(m); t = T(0.5); s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 14) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 20)
    add(M, s * env(t, 0.004, dec) * vol, t0, pan)
def tuba(m, t0, vol):
    f = hz(m); t = T(0.3); s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) + 0.2 * np.sin(6 * np.pi * f * t)
    add(M, s * np.clip(t / 0.012, 0, 1) * np.clip((0.3 - t) / 0.1, 0, 1) * vol, t0)
bar = 0
while bar * BAR < dur:
    ch = CH[bar % 8]; t0 = bar * BAR; root = ch[0] - 12
    for j in range(4):
        tuba(root if j % 2 == 0 else root + 7, t0 + j * BEAT, 0.16)
        for m in ch[1:]: pluck(m, t0 + (j + 0.5) * BEAT, 0.035, 0.42 + 0.06 * (m % 3), 14)
        ts = T(0.05); add(M, noise(0.05, 1) * np.exp(-ts * 80) * 0.022, t0 + (j + 0.5) * BEAT, 0.65)
        if j % 2 == 0: tk = T(0.2); add(M, np.sin(2 * np.pi * (50 + 80 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 18) * 0.16, t0 + j * BEAT)
    if bar >= 1:
        rf = RIFF[(bar // 2) % 4] if bar % 2 == 0 else RIFF[(bar // 2 + 1) % 4][::-1]
        sc = [0, 2, 4, 5, 7, 9, 11, 12]
        for j, d in enumerate(rf):
            if (bar % 4 == 3 and j > 5): continue
            pluck(ch[1] + 12 + d - (ch[1] - 60) % 12 * 0, t0 + j * BEAT / 2, 0.05 if j % 2 == 0 else 0.038, 0.35 + 0.3 * (j % 2), 10)
    bar += 1
for b in M:
    kk = int(BEAT * 0.75 * sr); b[kk:] += b[:-kk] * 0.14
tt = np.arange(n) / sr
music = np.stack(M, 1) * (np.clip(tt / 0.8, 0, 1) * np.clip((dur - tt) / 2.5, 0, 1))[:, None]
sf.write("build/music.wav", music * (0.62 / np.abs(music).max()), sr)

# ---------------- sound effects ----------------
S = buf()
def bell(t0):
    t = T(1.9); s = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1180, 1), (2060, 0.7), (2930, 0.5), (3870, 0.35), (5100, 0.2)))
    add(S, s * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 21 * t))) * np.clip(t / 0.01, 0, 1) * np.clip((1.9 - t) / 0.5, 0, 1) * 0.1, t0, 0.5)
def whistle(t0):
    t = T(0.75); f = 2850 + 130 * np.sin(2 * np.pi * 38 * t); s = np.sin(2 * np.pi * np.cumsum(f) / sr) + 0.12 * noise(0.75, 1)[: len(t)]
    add(S, s * np.clip(t / 0.02, 0, 1) * np.clip((0.75 - t) / 0.08, 0, 1) * 0.16, t0, 0.45)
def dun(t0):
    for i, (m, d) in enumerate(((41, 0.32), (37, 0.9))):
        t = T(d); f = hz(m); s = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 9)) + 0.5 * np.sin(2 * np.pi * f / 2 * t)
        add(S, s * np.clip(t / 0.015, 0, 1) * np.exp(-t * (2.2 if i else 1)) * np.clip((d - t) / 0.08, 0, 1) * 0.14, t0 + i * 0.36)
def pop(t0): s, t = sweep(320, 1100, 0.08); add(S, s * np.exp(-t * 20) * 0.3, t0, 0.5)
def riser(t0, d=1.1):
    t = T(d); out = np.zeros(len(t)); k = 0.0
    while k < d: i = int(k * sr); h = noise(0.05, 1) * np.exp(-T(0.05) * 60) * (0.3 + 0.7 * k / d); out[i:i + len(h)] += h[: len(out) - i]; k += 0.062 - 0.02 * k / d
    add(S, out * 0.05, t0, 0.5)
def ting(t0):
    t = T(0.9); s = np.sin(2 * np.pi * 2637 * t) + 0.6 * np.sin(2 * np.pi * 3951 * t) + 0.4 * np.sin(2 * np.pi * 5274 * t) * np.exp(-t * 8)
    add(S, s * env(t, 0.002, 6) * 0.11, t0, 0.6); add(S, s * env(t, 0.002, 7) * 0.07, t0 + 0.09, 0.4)
def boing(t0):
    t = T(0.7); f = 150 + 330 * np.exp(-t * 2.2) * (1 + 0.35 * np.sin(2 * np.pi * 11 * t)); s = np.sin(2 * np.pi * np.cumsum(f) / sr) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / sr)
    add(S, s * env(t, 0.004, 4.5) * 0.24, t0, 0.5)
def beep(t0): t = T(0.11); add(S, np.sign(np.sin(2 * np.pi * 1760 * t)) * 0.4 * np.clip((0.11 - t) / 0.01, 0, 1) * 0.11, t0, 0.5)
def stomp(t0):
    t = T(0.3); add(S, (np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 25)) * t) + 0.25 * noise(0.3)[: len(t)] * np.exp(-t * 40)) * np.exp(-t * 11) * 0.42, t0, 0.5)
def scan(t0):
    t = T(1.4); f = 700 + 900 * np.abs(np.sin(2 * np.pi * 0.72 * t)); s = np.sin(2 * np.pi * np.cumsum(f) / sr) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t))
    add(S, s * np.clip(t / 0.05, 0, 1) * np.clip((1.4 - t) / 0.1, 0, 1) * 0.07, t0, 0.5)
def alarm(t0):
    for i in range(5):
        t = T(0.13); add(S, np.sign(np.sin(2 * np.pi * (988 if i % 2 == 0 else 1319) * t)) * np.clip((0.13 - t) / 0.01, 0, 1) * 0.085, t0 + i * 0.17, 0.5)
def gulp(t0):
    s, t = sweep(420, 170, 0.12); add(S, s * np.exp(-t * 6) * 0.22, t0); s, t = sweep(190, 520, 0.14); add(S, s * np.exp(-t * 9) * 0.22, t0 + 0.14)
def steam(t0):
    t = T(1.5); s, _ = sweep(1700, 2900, 1.5, 0.6); h = noise(1.5, 2)[: len(t)]
    add(S, (h * 0.05 + s * 0.05 * np.clip(t / 0.6, 0, 1)) * np.clip(t / 0.15, 0, 1) * np.clip((1.5 - t) / 0.2, 0, 1), t0, 0.5)
def march(t0):
    for i in range(9):
        ts = T(0.09); add(S, (noise(0.09, 1) * 0.07 + np.sin(2 * np.pi * 190 * ts) * 0.12) * np.exp(-ts * 45), t0 + i * 0.3, 0.4 + 0.2 * (i % 2))
        if i % 2 == 0: ts = T(0.2); add(S, np.sin(2 * np.pi * (60 + 50 * np.exp(-ts * 30)) * ts) * np.exp(-ts * 16) * 0.25, t0 + i * 0.3)
def camera(t0):
    for o, v in ((0, 0.16), (0.07, 0.11)): ts = T(0.03); add(S, noise(0.03, 1) * np.exp(-ts * 150) * v, t0 + o, 0.5)
    ts = T(0.25); add(S, np.sin(2 * np.pi * 3300 * ts) * np.exp(-ts * 22) * 0.04, t0, 0.5)
def choir(t0):
    t = T(2.1); out = np.zeros(len(t))
    for m in (60, 64, 67, 72, 76):
        for dt in (-0.06, 0.05):
            f = hz(m + dt) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t + m)); ph = 2 * np.pi * np.cumsum(f) / sr
            out += np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.28 * np.sin(3 * ph) + 0.12 * np.sin(4 * ph)
    add(S, out * np.clip(t / 0.35, 0, 1) * np.clip((2.1 - t) / 0.7, 0, 1) * 0.022, t0, 0.5)
def rub(t0):
    t = T(1.7); h = noise(1.7, 1)[: len(t)] * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) ** 2; sq = np.sin(2 * np.pi * (900 + 500 * np.sin(2 * np.pi * 9 * t)) * t) * (np.sin(2 * np.pi * 4.5 * t) > 0.6)
    add(S, (h * 0.05 + sq * 0.03) * np.clip(t / 0.1, 0, 1) * np.clip((1.7 - t) / 0.2, 0, 1), t0, 0.5)
def slidedown(t0): s, t = sweep(1500, 280, 0.85, 1.3); add(S, s * np.clip(t / 0.03, 0, 1) * np.clip((0.85 - t) / 0.1, 0, 1) * 0.16, t0, 0.5)
def wah(t0):
    for i, (m, d) in enumerate(((58, 0.36), (57, 0.36), (56, 0.36), (55, 0.95))):
        t = T(d); f = hz(m) * (1 + (0.012 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0)) * (1 - 0.03 * (t / d) ** 2 * (i == 3)); ph = 2 * np.pi * np.cumsum(f) / sr
        s = sum(np.sin(h * ph) / h ** 1.2 for h in range(1, 8)); add(S, s * np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.08, 0, 1) * 0.085, t0 + i * 0.4, 0.5)
def thud(t0):
    t = T(0.4); add(S, (np.sin(2 * np.pi * (38 + 70 * np.exp(-t * 20)) * t) + 0.4 * noise(0.4)[: len(t)] * np.exp(-t * 30)) * np.exp(-t * 8) * 0.5, t0, 0.5)
    for i in range(3): ts = T(0.05); add(S, noise(0.05, 1) * np.exp(-ts * 90) * 0.06, t0 + 0.12 + i * 0.09, 0.6)
def rimshot(t0):
    for i, f0 in enumerate((180, 130)): t = T(0.22); add(S, (np.sin(2 * np.pi * (f0 + 60 * np.exp(-t * 30)) * t) + 0.2 * noise(0.22)[: len(t)] * np.exp(-t * 50)) * np.exp(-t * 14) * 0.35, t0 + i * 0.17, 0.4 + 0.2 * i)
    t = T(1.3); add(S, noise(1.3, 2)[: len(t)] * np.exp(-t * 3.2) * 0.05, t0 + 0.42, 0.55)
    t = T(0.25); add(S, np.sin(2 * np.pi * (55 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 14) * 0.3, t0 + 0.42)
FX = dict(bell=bell, whistle=whistle, dun=dun, pop=pop, riser=riser, ting=ting, boing=boing, beep=beep, stomp=stomp, scan=scan, alarm=alarm, gulp=gulp, steam=steam,
          march=march, camera=camera, choir=choir, rub=rub, slidedown=slidedown, wah=wah, thud=thud, rimshot=rimshot)
cnt = 0
for b in TL["beats"]:
    for e in b["sfx"]: FX[e["name"]](e["t"]); cnt += 1
sfx = np.stack(S, 1)
sf.write("build/sfx.wav", sfx * (0.8 / np.abs(sfx).max()), sr)
print("music", round(dur, 2), "sfx events", cnt)
