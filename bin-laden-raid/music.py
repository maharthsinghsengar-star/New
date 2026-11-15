"""Documentary score (low drones, sparse piano, a tension pulse that rises through the raid, cinematic hits) and sound effects."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json"))
dur = TL["duration"] + 1.0; n = int(dur * sr); rng = np.random.default_rng(21)
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
def lp(x, a):   # one-pole low-pass (vectorised via lfilter-like recursion in chunks)
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)
def env_from(mask_fn):
    e = np.zeros(n)
    for b in TL["beats"]:
        e[int(b["start"] * sr):int(b["end"] * sr)] = mask_fn(b)
    k = int(1.5 * sr); return np.convolve(e, np.ones(k) / k, mode="same")
M = buf()
tension = env_from(lambda b: {"raid": 1.0, "sitroom": 0.8, "street": 0.5, "sat": 0.4, "title": 0.6}.get(b["mood"], 0.0))
reflect = env_from(lambda b: {"dark": 1, "cold": 1, "office": 0.8, "town": 0.9, "dawn": 1, "day": 0.7, "night": 0.6, "credits": 1, "card": 0.4}.get(b["mood"], 0.25))
tt = np.arange(n) / sr
# 1) drone bed: detuned low saws through a slow low-pass, D minor colour, changing every 16 s
CH = [[38, 45, 50, 53], [34, 41, 46, 50], [36, 43, 48, 51], [33, 40, 45, 49]]
seglen = 16.0; drone = np.zeros(n)
for i in range(int(dur / seglen) + 1):
    ch = CH[i % 4]; t0 = i * seglen; d = seglen + 4; t = T(d); e = np.clip(t / 3, 0, 1) * np.clip((d - t) / 4, 0, 1); s = np.zeros(len(t))
    for m in ch:
        for dt in (-0.06, 0.07): ph = 2 * np.pi * hz(m + dt) * t; s += (2 * (ph / (2 * np.pi) % 1) - 1) * (0.5 if m > 40 else 0.8)
    s = lp(s, 0.02) * e; i0 = int(t0 * sr); m_ = min(len(s), n - i0)
    if m_ > 0: drone[i0:i0 + m_] += s[:m_]
drone /= np.abs(drone).max() + 1e-9
for c in range(2): M[c] += drone * 0.22 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * tt + c))
# 2) sparse piano motif in the reflective chapters
def piano(m, t0, vol, pan):
    f = hz(m); t = T(4.0); s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.2 + h * 0.9)) / h ** 1.4 for h in range(1, 7))
    add(M, s * np.clip(t / 0.004, 0, 1) * vol, t0, pan)
MOT = [62, 65, 69, 67, 65, 62, 60, 62]
t0 = 2.0; j = 0
while t0 < dur - 4:
    r = reflect[int(t0 * sr)]
    if r > 0.3: piano(MOT[j % 8] + (12 if (j // 8) % 3 == 2 else 0), t0, 0.06 * r, 0.35 + 0.3 * (j % 2)); 
    if r > 0.3 and j % 4 == 0: piano(CH[int(t0 / seglen) % 4][1] + 12, t0, 0.04 * r, 0.5)
    t0 += 1.6 if j % 4 != 3 else 3.2; j += 1
# 3) tension pulse: low ostinato 8ths + heartbeat kick, gain follows the tension envelope
BEAT = 60 / 92; pulse = buf()
k = 0
while k * BEAT / 2 < dur:
    t0 = k * BEAT / 2; tv = tension[min(n - 1, int(t0 * sr))]
    if tv > 0.05:
        m = CH[int(t0 / seglen) % 4][0] + (12 if k % 4 == 2 else 0); t = T(0.3)
        s = np.sign(np.sin(2 * np.pi * hz(m) * t)) * 0.5 + np.sin(2 * np.pi * hz(m) * t); add(pulse, lp(s, 0.08) * np.exp(-t * 9) * 0.18 * tv, t0, 0.45 + 0.1 * (k % 2))
        if k % 4 == 0: tk = T(0.35); add(pulse, np.sin(2 * np.pi * (48 + 50 * np.exp(-tk * 25)) * tk) * np.exp(-tk * 10) * 0.35 * tv, t0)
        if k % 4 == 1: tk = T(0.3); add(pulse, np.sin(2 * np.pi * (44 + 40 * np.exp(-tk * 25)) * tk) * np.exp(-tk * 12) * 0.22 * tv, t0)
        if k % 2 == 1: ts = T(0.05); add(pulse, noise(0.05, 2) * np.exp(-ts * 90) * 0.03 * tv, t0, 0.65)
    k += 1
for c in range(2): M[c] += pulse[c]
# 4) cinematic hits on the chapter cards
def hit(t0):
    t = T(4.5); s = np.sin(2 * np.pi * (36 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 1.3) + lp(noise(4.5), 0.05)[:len(t)] * np.exp(-t * 2) * 0.6
    add(M, s * 0.5, t0); 
    for m in (50, 57, 62): add(M, np.sin(2 * np.pi * hz(m) * t) * np.exp(-t * 0.9) * 0.04, t0, 0.5)
for b in TL["beats"]:
    for e in b["sfx"]:
        if e["name"] == "boom": hit(e["t"])
# reverb (FFT convolution with a synthetic hall)
ir_t = T(3.2); ir = rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t * 2.1); ir[0] = 0
from scipy.signal import fftconvolve
for c in range(2): M[c] = M[c] * 0.75 + fftconvolve(M[c], ir * (0.9 if c else 1.0), mode="full")[:n] * 0.012
mus = np.stack(M, 1) * (np.clip(tt / 2.0, 0, 1) * np.clip((dur - tt) / 4.0, 0, 1))[:, None]
sf.write("build/music.wav", mus * (0.7 / np.abs(mus).max()), sr)

# ---------------- sound effects ----------------
S = buf()
def beat_end(t):
    for b in TL["beats"]:
        if b["start"] <= t + 0.6 < b["end"] + 0.01: return b["end"]
    return t + 6
def rotor(t0):
    d = max(4.0, beat_end(t0) - t0 + 1.0); t = T(d); chop = (0.5 + 0.5 * np.sin(2 * np.pi * 9.5 * t)) ** 4; x = lp(noise(d), 0.06)[:len(t)]
    hum = np.sin(2 * np.pi * 75 * t) * 0.3 + np.sin(2 * np.pi * 150 * t) * 0.1
    s = (x / (np.abs(x).max() + 1e-9) * (0.4 + 0.6 * chop) + hum * 0.4) * np.clip(t / 1.5, 0, 1) * np.clip((d - t) / 1.5, 0, 1)
    add(S, s * 0.18, t0, 0.5)
def jets(t0, d=6.0): t = T(d); x = lp(noise(d), 0.15)[:len(t)]; add(S, x / np.abs(x).max() * np.sin(np.pi * t / d) ** 2 * 0.16, t0, 0.3)
def thump(t0): t = T(2.5); add(S, (np.sin(2 * np.pi * (35 + 30 * np.exp(-t * 8)) * t) + lp(noise(2.5), 0.05)[:len(t)] * 0.6) * np.exp(-t * 2.2) * 0.28, t0, 0.6)
def wind(t0, d=9.0): t = T(d); x = lp(noise(d), 0.01)[:len(t)]; add(S, x / np.abs(x).max() * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t)) * np.clip(t / 2, 0, 1) * np.clip((d - t) / 2, 0, 1) * 0.12, t0, 0.5)
def typing(t0, d=3.0):
    tt_ = 0.0
    while tt_ < d:
        tk = T(0.03); add(S, noise(0.03, 2)[:len(tk)] * np.exp(-tk * 150) * 0.05, t0 + tt_, 0.55); tt_ += 0.07 + rng.random() * 0.12
def phone(t0):
    for i in range(3): t = T(0.4); add(S, (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * 0.03, t0 + i * 0.8, 0.5)
def traffic(t0, d=6.0):
    t = T(d); x = lp(noise(d), 0.03)[:len(t)]; add(S, x / np.abs(x).max() * np.clip(t / 1, 0, 1) * np.clip((d - t) / 1.5, 0, 1) * 0.08, t0, 0.5)
    for k_ in range(3): th = T(0.4); add(S, np.sign(np.sin(2 * np.pi * (400 + 60 * k_) * th)) * np.clip((0.4 - th) / 0.05, 0, 1) * 0.015, t0 + 1 + k_ * 1.6, 0.3 + 0.2 * k_)
def birds(t0, d=6.0):
    for k_ in range(8): t = T(0.18); f = 2800 + 900 * np.sin(np.pi * t / 0.18); add(S, np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * t / 0.18) * 0.02, t0 + k_ * 0.7 + rng.random() * 0.3, 0.3 + rng.random() * 0.4)
def fire(t0, d=4.0):
    t = T(d); x = noise(d, 1)[:len(t)] * (rng.random(len(t)) > 0.997) * 4 + lp(noise(d), 0.05)[:len(t)] * 0.3; add(S, x * np.clip(t / 0.5, 0, 1) * np.clip((d - t) / 1, 0, 1) * 0.05, t0, 0.5)
def beep(t0):
    for i in range(3): t = T(0.12); add(S, np.sin(2 * np.pi * 1760 * t) * 0.03, t0 + i * 1.2, 0.6)
def hum(t0, d=11.0): t = T(d); add(S, (np.sin(2 * np.pi * 60 * t) + 0.4 * np.sin(2 * np.pi * 120 * t) + 0.1 * lp(noise(d), 0.1)[:len(t)]) * np.clip(t / 1, 0, 1) * np.clip((d - t) / 1, 0, 1) * 0.02, t0, 0.5)
def crunch(t0):
    t = T(1.6); s = noise(1.6, 1)[:len(t)] * np.exp(-t * 3) * 0.5 + np.sin(2 * np.pi * (50 + 40 * np.exp(-t * 10)) * t) * np.exp(-t * 4)
    for f in (420, 690, 1130): s += np.sin(2 * np.pi * f * t + rng.random()) * np.exp(-t * 2.5) * 0.15
    add(S, s * 0.3, t0, 0.5)
def blast(t0): t = T(2.0); add(S, (np.sin(2 * np.pi * (40 + 60 * np.exp(-t * 12)) * t) + lp(noise(2.0), 0.2)[:len(t)] * 0.8) * np.exp(-t * 3) * 0.4, t0, 0.5)
def shots(t0):
    for i in range(2): t = T(0.25); add(S, (lp(noise(0.25), 0.25)[:len(t)] + np.sin(2 * np.pi * 120 * t) * 0.5) * np.exp(-t * 30) * 0.18, t0 + i * 0.28, 0.45)
def radio(t0):
    t = T(0.5); add(S, noise(0.5, 2)[:len(t)] * np.exp(-t * 6) * 0.05, t0, 0.5); t2 = T(0.12); add(S, np.sin(2 * np.pi * 1200 * t2) * 0.03, t0 + 0.5, 0.5)
def explosion(t0): t = T(5.0); add(S, (np.sin(2 * np.pi * (28 + 50 * np.exp(-t * 6)) * t) + lp(noise(5.0), 0.1)[:len(t)] * 1.2) * np.exp(-t * 1.0) * 0.4, t0, 0.5)
def waves(t0, d=14.0):
    t = T(d); x = lp(noise(d), 0.05)[:len(t)]; add(S, x / np.abs(x).max() * (0.5 + 0.5 * np.sin(2 * np.pi * 0.18 * t) ** 2) * np.clip(t / 2, 0, 1) * np.clip((d - t) / 2, 0, 1) * 0.12, t0, 0.5)
def crowd(t0, d=6.0):
    t = T(d); x = lp(noise(d), 0.25)[:len(t)]; e = np.clip(t / 1.2, 0, 1) * np.clip((d - t) / 2, 0, 1); add(S, x / np.abs(x).max() * e * (0.6 + 0.4 * np.sin(2 * np.pi * 0.6 * t)) * 0.08, t0, 0.5)
def rubble(t0, d=4.0):
    for i in range(14): tk = T(0.2); add(S, lp(noise(0.2), 0.3)[:len(tk)] * np.exp(-tk * 20) * (0.12 - i * 0.006), t0 + i * 0.22 + rng.random() * 0.1, 0.3 + rng.random() * 0.4)
FX = dict(rotor=rotor, jets=jets, thump=thump, wind=wind, type=typing, phone=phone, traffic=traffic, birds=birds, fire=fire, beep=beep, hum=hum, crunch=crunch, blast=blast, shots=shots, radio=radio, explosion=explosion, waves=waves, crowd=crowd, rubble=rubble)
cnt = 0
for b in TL["beats"]:
    for e in b["sfx"]:
        if e["name"] in FX: FX[e["name"]](e["t"]); cnt += 1
sfx = np.stack(S, 1)
sf.write("build/sfx.wav", sfx * (0.8 / np.abs(sfx).max()), sr)
print("music", round(dur, 1), "sfx", cnt)
