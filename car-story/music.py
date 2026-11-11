"""Synthesize a soft ambient background track (warm pad + gentle piano-like arpeggio)."""
import json, numpy as np, soundfile as sf
sr = 44100
dur = json.load(open("build/timeline.json"))["duration"] + 0.5
n = int(dur * sr)
rng = np.random.default_rng(7)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
# Cmaj9 - Am9 - Fmaj7 - Gsus/G  (MIDI notes), 6 s per chord
CHORDS = [[48, 55, 64, 71, 74], [45, 52, 60, 67, 71], [41, 48, 57, 64, 69], [43, 50, 59, 62, 69]]
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
    # arpeggio: soft bell/piano plucks, 8 notes per bar
    pat = [0, 2, 3, 4, 3, 2, 3, 1]
    for j, pi in enumerate(pat):
        f = hz(ch[pi] + 12); tt = np.arange(int(3.0 * sr)) / sr
        s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)
             + 0.12 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 6))
        s *= np.exp(-tt * 2.2) * np.clip(tt / 0.008, 0, 1)
        vel = 0.05 * (1.0 if j % 4 == 0 else 0.7) * rng.uniform(0.85, 1.0)
        add(s * vel, t0 + j * BAR / 8, 0.35 + 0.3 * (j % 2))
    bar += 1
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
