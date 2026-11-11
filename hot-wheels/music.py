"""Upbeat, light background track: plucky arpeggios, soft bass, gentle kick and shaker."""
import json, numpy as np, soundfile as sf
sr = 44100
dur = json.load(open("build/timeline.json"))["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(5)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
L = np.zeros(n); R = np.zeros(n)
def add(sig, start, pan=0.5):
    i = int(start * sr)
    if i >= n: return
    sig = sig[: n - i]; L[i:i + len(sig)] += sig * np.cos(pan * np.pi / 2); R[i:i + len(sig)] += sig * np.sin(pan * np.pi / 2)
BEAT = 60 / 112; BAR = 4 * BEAT
CH = [[48, 60, 64, 67, 72], [43, 59, 62, 67, 71], [45, 60, 64, 69, 72], [41, 60, 65, 69, 72]]   # C G Am F
def pluck(m, t0, vol, pan):
    f = hz(m); tt = np.arange(int(1.2 * sr)) / sr
    s = np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 5) + 0.15 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 9)
    add(s * np.exp(-tt * 5.5) * np.clip(tt / 0.005, 0, 1) * vol, t0, pan)
bar = 0
while bar * BAR < dur:
    ch = CH[bar % 4]; t0 = bar * BAR
    tt = np.arange(int((BAR + 0.6) * sr)) / sr; env = np.clip(tt / 0.4, 0, 1) * np.clip((BAR + 0.6 - tt) / 0.6, 0, 1)
    for k, m in enumerate(ch[1:]): add(np.sin(2 * np.pi * hz(m) * tt + k) * env * 0.035, t0, 0.3 + 0.13 * k)       # soft pad
    for j, pi in enumerate([1, 3, 2, 4, 1, 3, 4, 2]): pluck(ch[pi] + 12, t0 + j * BEAT / 2, 0.06 * (1 if j % 2 == 0 else 0.75), 0.35 + 0.3 * (j % 2))
    for j in (0, 1.5, 2, 3.5):                                                                                          # bass
        tb = np.arange(int(0.42 * sr)) / sr; add(np.sin(2 * np.pi * hz(ch[0] - 12) * tb) * np.exp(-tb * 6) * np.clip(tb / 0.01, 0, 1) * 0.13, t0 + j * BEAT)
    if bar >= 2:
        for j in range(4):                                                                                              # kick + shaker
            tb = np.arange(int(0.22 * sr)) / sr; add(np.sin(2 * np.pi * (48 + 70 * np.exp(-tb * 30)) * tb) * np.exp(-tb * 16) * 0.2, t0 + j * BEAT)
            for o in (0.5, ):
                ts = np.arange(int(0.05 * sr)) / sr; nz = rng.normal(0, 1, len(ts)); nz = np.diff(nz, prepend=0)
                add(nz * np.exp(-ts * 70) * 0.028, t0 + (j + o) * BEAT, 0.65)
    bar += 1
for buf in (L, R):
    for d, g in ((BEAT * 0.75, 0.22), (BEAT * 1.5, 0.1)):
        kk = int(d * sr); buf[kk:] += buf[:-kk] * g
tt = np.arange(n) / sr
out = np.stack([L, R], 1) * (np.clip(tt / 1.5, 0, 1) * np.clip((dur - tt) / 3.5, 0, 1))[:, None]
sf.write("build/music.wav", out * (0.7 / np.abs(out).max()), sr)
print("music", dur)
