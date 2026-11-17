"""Soft Indian-flavoured underscore: tanpura drone (Sa-Pa), warm pad, and sitar-like plucks in raag Yaman."""
import json, numpy as np, soundfile as sf
sr = 44100
dur = json.load(open("build/timeline.json"))["duration"] + 0.5
n = int(dur * sr)
rng = np.random.default_rng(7)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
# Cmaj9 - Am9 - Fmaj7 - Gsus/G  (MIDI notes), 6 s per chord
CHORDS = [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [43, 50, 55, 59, 62], [48, 55, 60, 66, 67]]
BAR = 6.0
L = np.zeros(n); R = np.zeros(n)
def add(sig, start, pan):
    i = int(start * sr)
    if i >= n: return
    sig = sig[: n - i]
    L[i:i + len(sig)] += sig * np.cos(pan * np.pi / 2)
    R[i:i + len(sig)] += sig * np.sin(pan * np.pi / 2)
bar = 0
while bar * BAR < dur:
    ch = CHORDS[bar % 4]; t0 = bar * BAR
    # pad: slow-attack detuned sines, overlapping into the next bar
    ln = BAR + 2.5; tt = np.arange(int(ln * sr)) / sr
    env = np.clip(tt / 2.2, 0, 1) ** 1.5 * np.clip((ln - tt) / 2.5, 0, 1) ** 1.5
    for k, m in enumerate(ch):
        f = hz(m)
        s = sum(np.sin(2 * np.pi * f * d * tt + rng.uniform(0, 6.28)) for d in (0.997, 1.0, 1.004)) / 3
        s += 0.18 * np.sin(2 * np.pi * 2 * f * tt)
        s *= 1 + 0.08 * np.sin(2 * np.pi * 0.23 * tt + k)
        add(s * env * (0.085 if k else 0.13), t0, 0.25 + 0.5 * k / (len(ch) - 1))
    # sitar-like plucks (Karplus-Strong) on a Yaman phrase: Ni Re Ga Ma# Dha Ni Sa
    YAMAN = [71, 74, 76, 78, 81, 83, 84, 83, 81, 78, 76, 74]
    for j in range(6):
        m = YAMAN[(bar * 6 + j) % len(YAMAN)]; f = hz(m); Lp = int(sr / f); d = 2.2
        x = np.zeros(int(d * sr)); x[:Lp] = rng.uniform(-1, 1, Lp)
        from scipy.signal import lfilter
        a_ = np.zeros(Lp + 2); a_[0] = 1; a_[Lp] = -0.497; a_[Lp + 1] = -0.4975
        y = lfilter([1], a_, x); y = y + 0.25 * np.roll(y, int(0.0007 * sr))          # a little buzz like a sitar bridge
        add(y * 0.07 * (1.0 if j % 3 == 0 else 0.7), t0 + j * BAR / 6 + (0.08 if j % 2 else 0), 0.35 + 0.3 * (j % 2))
    bar += 1
# tanpura: Pa - Sa - Sa - Sa(low), rich harmonics, cycling every 4 s
tp = [55, 60, 60, 48]; k = 0
while k * 1.0 < dur:
    f = hz(tp[k % 4]); tt = np.arange(int(3.8 * sr)) / sr
    s = sum(np.sin(2 * np.pi * f * h * tt) / h ** 1.1 * (1 + 0.3 * np.sin(2 * np.pi * 0.7 * tt * h)) for h in range(1, 9))
    s *= np.clip(tt / 0.02, 0, 1) * np.exp(-tt * 0.7)
    add(s * 0.028, k * 1.0, 0.3 + 0.4 * (k % 2)); k += 1
# simple stereo echo for space
for buf in (L, R):
    for d, g in ((0.37, 0.28), (0.74, 0.14), (1.11, 0.07)):
        k = int(d * sr); buf[k:] += buf[:-k] * g
t = np.arange(n) / sr
fade = np.clip(t / 2.5, 0, 1) * np.clip((dur - t) / 3.5, 0, 1)
out = np.stack([L, R], 1) * fade[:, None]
out *= 0.7 / np.abs(out).max()
sf.write("build/music.wav", out, sr)
print("music", dur)
