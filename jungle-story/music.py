"""Background score + light ambience, synthesized: warm major pads for the friendship,
a tense low drone at the trap, and a slow minor theme for the betrayal and the moral."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json")); S = TL["scenes"]
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(11)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
L = np.zeros(n); R = np.zeros(n)
def add(sig, start, pan=0.5):
    i = int(start * sr)
    if i >= n or i < 0: return
    sig = sig[: n - i]
    L[i:i + len(sig)] += sig * np.cos(pan * np.pi / 2); R[i:i + len(sig)] += sig * np.sin(pan * np.pi / 2)
def pad(ch, t0, ln, vol):
    tt = np.arange(int((ln + 2.5) * sr)) / sr
    env = np.clip(tt / 2.0, 0, 1) ** 1.5 * np.clip((ln + 2.5 - tt) / 2.5, 0, 1) ** 1.5
    for k, m in enumerate(ch):
        f = hz(m); s = sum(np.sin(2 * np.pi * f * d * tt + rng.uniform(0, 6.28)) for d in (0.997, 1.0, 1.004)) / 3
        s += 0.15 * np.sin(2 * np.pi * 2 * f * tt); s *= 1 + 0.08 * np.sin(2 * np.pi * 0.21 * tt + k)
        add(s * env * vol * (1.4 if k == 0 else 1), t0, 0.25 + 0.5 * k / max(1, len(ch) - 1))
def pluck(m, t0, vol, pan=0.5, decay=2.2):
    f = hz(m); tt = np.arange(int(3.2 * sr)) / sr
    s = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3) + 0.1 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 6)
    add(s * np.exp(-tt * decay) * np.clip(tt / 0.008, 0, 1) * vol, t0, pan)
WARM = [[48, 55, 64, 67, 74], [53, 60, 64, 69, 72], [45, 52, 60, 64, 71], [43, 50, 59, 62, 67]]   # C  F  Am  G
SAD = [[45, 52, 60, 64, 71], [41, 48, 57, 60, 67], [38, 50, 57, 60, 65], [40, 52, 56, 59, 64]]     # Am F  Dm  E
t_warm0, t_trap, t_sad = S[1]["start"], S[5]["start"], S[7]["start"]
# intro: single sombre chord
pad(SAD[0], 0, t_warm0, 0.07); pluck(69, 1.0, 0.05); pluck(64, 2.4, 0.04)
t, bar = t_warm0, 0
while t < t_trap - 1:                         # friendship: lilting arpeggio
    ch = WARM[bar % 4]; pad(ch, t, 4.4, 0.06)
    for j, pi in enumerate([0, 2, 3, 4, 3, 2, 4, 3]): pluck(ch[pi] + 12, t + j * 0.55, 0.05 * (1 if j % 4 == 0 else 0.7), 0.35 + 0.3 * (j % 2))
    t += 4.4; bar += 1
# trap: low drone, tremolo cluster, slow pulse
ln = t_sad - t_trap; tt = np.arange(int((ln + 2) * sr)) / sr
env = np.clip(tt / 3, 0, 1) * np.clip((ln + 2 - tt) / 2.5, 0, 1)
dr = (np.sin(2 * np.pi * hz(33) * tt) + 0.6 * np.sin(2 * np.pi * hz(40) * tt) + 0.35 * np.sin(2 * np.pi * hz(46) * tt) * (1 + 0.5 * np.sin(2 * np.pi * 6 * tt)))
add(dr * env * 0.085, t_trap); add(0.03 * np.sin(2 * np.pi * hz(70) * tt) * env * (1 + np.sin(2 * np.pi * 7 * tt)) / 2, t_trap, 0.7)
for b in np.arange(t_trap + 1, t_sad - 1, 0.95):
    tb = np.arange(int(0.4 * sr)) / sr; add(np.sin(2 * np.pi * 52 * tb * (1 - tb)) * np.exp(-tb * 12) * 0.22, b)
# net snap: filtered noise whoosh
snap = S[6]["start"] + 0.55; tb = np.arange(int(0.7 * sr)) / sr
nz = np.cumsum(rng.normal(0, 1, len(tb))); nz -= np.convolve(nz, np.ones(400) / 400, "same"); nz /= np.abs(nz).max()
add(nz * np.exp(-((tb - 0.12) / 0.1) ** 2) * 0.16 + nz * np.exp(-tb * 7) * 0.05, snap)
# betrayal + moral: slow minor theme
t, bar = t_sad, 0
while t < dur:
    ch = SAD[bar % 4]; pad(ch, t, 6.0, 0.07)
    for j, pi in enumerate([2, 3, 4, 3]): pluck(ch[pi] + 12, t + j * 1.5, 0.055 * (1 if j == 0 else 0.75), 0.4 + 0.2 * (j % 2), 1.6)
    t += 6.0; bar += 1
# birdsong in the sunny scenes
for t0 in np.sort(rng.uniform(t_warm0, t_trap, 34)):
    f0, k = rng.uniform(2400, 4200), rng.integers(2, 5)
    for j in range(k):
        tb = np.arange(int(0.09 * sr)) / sr
        add(np.sin(2 * np.pi * (f0 + rng.uniform(-300, 300) + 900 * np.sin(np.pi * tb / 0.09)) * tb) * np.sin(np.pi * tb / 0.09) ** 2 * 0.018, t0 + j * 0.12, rng.uniform(0.1, 0.9))
for buf in (L, R):
    for d, g in ((0.37, 0.28), (0.74, 0.14), (1.11, 0.07)):
        kk = int(d * sr); buf[kk:] += buf[:-kk] * g
tt = np.arange(n) / sr
out = np.stack([L, R], 1) * (np.clip(tt / 2, 0, 1) * np.clip((dur - tt) / 3.5, 0, 1))[:, None]
sf.write("build/music.wav", out * (0.7 / np.abs(out).max()), sr)
print("music", dur)
