"""Procedural score + sound design + narration mix -> build/audio.wav
happy city groove -> tape-stop freeze -> ticking tension -> eerie ghosts / zombies -> thunder -> chase drums -> store bangs -> scare -> music box."""
import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
TL = json.load(open("build/timeline.json")); TR = json.load(open("build/track.json"))
DUR = TL["duration"]; N = int((DUR + 1) * SR)
B = {b["id"]: b for b in TL["beats"]}
SFX = [(s["name"], s["t"]) for b in TL["beats"] for s in b["sfx"]]
R = np.random.default_rng(11)
T = lambda d: np.arange(int(d * SR)) / SR

def add(buf, t0, sig, g=1.0):
    i = int(round(t0 * SR))
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i + n] += sig[:n] * g
def filt(x, kind, f, order=2):
    if kind == "bp": sos = butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], "band", output="sos")
    else: sos = butter(order, f / (SR / 2), kind, output="sos")
    return sosfilt(sos, x)
lp = lambda x, f, o=2: filt(x, "low", f, o); hp = lambda x, f, o=2: filt(x, "high", f, o); bp = lambda x, a, b, o=2: filt(x, "bp", (a, b), o)
def env(n, a=0.005, r=0.2, sus=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-t / r) if sus is None else e * np.clip((n / SR - t) / max(sus, 1e-3), 0, 1)
def fade(x, a=0.01, r=0.05):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * e
def reverb(x, sec=2.2, wet=0.3, seed=1, damp=5000):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t / (sec / 6.9)); ir = lp(ir, damp); ir[:int(0.012 * SR)] *= 0.2; ir /= np.sqrt((ir ** 2).sum())
    return x * (1 - wet) + fftconvolve(x, ir)[:len(x)] * wet * 2.2
noise = lambda d: R.standard_normal(int(d * SR))
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def saw(f, t, det=0.0):
    ph = (f * t) % 1; s = 2 * ph - 1
    if det: s = 0.5 * s + 0.5 * (2 * ((f * (1 + det)) * t % 1) - 1)
    return s
def tri(f, t): return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1

# ------------------------------------------------------------------ instruments
def pluck(f, d=0.35, bright=1.0):
    t = T(d); s = sum(np.sin(2 * np.pi * f * k * t) * (bright ** (k - 1)) / k * np.exp(-t * (6 + 5 * k)) for k in range(1, 6)); return fade(s * env(len(t), 0.002, d), 0.002, 0.02)
def marimba(f, d=0.5):
    t = T(d); return fade((np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 7), 0.001, 0.03)
def glock(f, d=1.2):
    t = T(d); return fade(sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dd) for a, m, dd in [(1, 1, 2.2), (0.4, 2.76, 5), (0.25, 5.4, 9), (0.1, 8.9, 14)]), 0.001, 0.05)
def musicbox(f, d=1.6):
    t = T(d); vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * t); return fade(sum(a * np.sin(2 * np.pi * f * m * vib * t) * np.exp(-t * dd) for a, m, dd in [(1, 1, 2.5), (0.5, 3.0, 6), (0.2, 5.1, 10)]), 0.001, 0.05)
def kick(d=0.4):
    t = T(d); f = 48 + 120 * np.exp(-t * 32); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)
def snare(d=0.25):
    t = T(d); return bp(noise(d), 1200, 7000) * np.exp(-t * 18) * 0.7 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5
def hat(d=0.06): t = T(d); return hp(noise(d), 7000) * np.exp(-t * 70)
def clap(d=0.3):
    t = T(d); e = sum(np.exp(-np.maximum(t - o, 0) * 60) * (t >= o) for o in (0, 0.012, 0.024)) + 0.6 * np.exp(-t * 12); return bp(noise(d), 900, 5000) * e * 0.5
def tom(f=90, d=0.6):
    t = T(d); ff = f * (1 + 0.6 * np.exp(-t * 20)); return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 5.5) + 0.25 * lp(noise(d), 1500) * np.exp(-t * 30)
def pad(fs, d, cut=1800, det=0.006, a=0.6, r=1.2):
    t = T(d); s = sum(saw(f, t, det) + saw(f * 0.5, t, det * 1.3) * 0.5 for f in fs); s = lp(s, cut, 2)
    e = np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1); return s * e / len(fs)
def boom(d=3.0, f0=60):
    t = T(d); f = f0 * (1 + 1.5 * np.exp(-t * 6)); return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)) + 0.5 * lp(noise(d), 300) * np.exp(-t * 3)
def whoosh(d=1.2, up=True, lo=300, hi=5000):
    n = int(d * SR); t = np.arange(n) / n; s = noise(d); out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        u = t[i] if up else 1 - t[i]; fc = lo * (hi / lo) ** u; out[i:i + seg] = bp(s[i:i + seg + 0], fc * 0.7, min(fc * 1.4, 20000))[:len(out[i:i + seg])]
    e = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.5 if up else np.sin(np.pi * np.clip(t, 0, 1)) ** 0.8; return lp(out * e, 9000)
def riser(d=1.5):
    t = T(d); f = 200 * 2 ** (t / d * 3); return (whoosh(d, True, 400, 9000) * 0.8 + 0.25 * saw(1, t) * 0 + 0.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d)) * (t / d) ** 2
def groan(d=1.6, f0=None, seed=0):
    r = np.random.default_rng(seed); t = T(d); f0 = f0 or r.uniform(70, 120)
    f = f0 * (1 + 0.25 * np.sin(2 * np.pi * r.uniform(0.3, 0.8) * t + r.uniform(0, 6))) * (1 - 0.25 * t / d)
    src = saw(1, t) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + 0.6 * r.standard_normal(len(t)) * 0.4
    s = sum(bp(src, fc * 0.8, fc * 1.25) * g for fc, g in [(r.uniform(450, 650), 1.0), (r.uniform(900, 1200), 0.6), (r.uniform(2300, 2700), 0.25)])
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7 * (1 + 0.3 * np.sin(2 * np.pi * 9 * t)); return np.tanh(s * e * 3) * 0.6
def wail(d=2.5, f0=520, seed=0):
    r = np.random.default_rng(seed); t = T(d); f = f0 * (1 + 0.35 * np.sin(np.pi * t / d)) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph) + 0.15 * bp(r.standard_normal(len(t)), f0, f0 * 3)
    return s * np.sin(np.pi * t / d) ** 2
def thunder(d=5.0, seed=0):
    r = np.random.default_rng(seed); t = T(d); crack = hp(r.standard_normal(len(t)), 1500) * np.exp(-t * 14) * 0.9
    rumble = lp(r.standard_normal(len(t)), 180, 2) * (np.exp(-t * 0.9) * (1 + 0.6 * np.sin(2 * np.pi * 1.7 * t + 1))) * 4
    return crack + rumble + 0.6 * lp(r.standard_normal(len(t)), 900) * np.exp(-t * 3)
def scream(d=1.3):
    t = T(d); f = 900 * (1 + 0.8 * np.exp(-t * 3)) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t)); src = saw(1, t) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    s = bp(src, 1800, 3600) + 0.6 * bp(src, 3800, 5200) + 0.5 * bp(noise(d), 2000, 7000)
    return np.tanh(s * 2) * np.exp(-t * 1.6)
def tape_stop(x, t0, d=0.55):
    i0 = int(t0 * SR); n = int(d * SR); seg = x[i0:i0 + n * 3].copy(); out = np.zeros(n)
    rate = np.linspace(1, 0.02, n) ** 1.4; pos = np.cumsum(rate); pos = np.clip(pos, 0, len(seg) - 2)
    out = np.interp(pos, np.arange(len(seg)), seg) * np.linspace(1, 0, n) ** 0.5
    x[i0:i0 + n] = out; x[i0 + n:] = 0
    return x

# ------------------------------------------------------------------ buses
music = np.zeros(N); amb = np.zeros(N); fx = np.zeros(N)
T_FRZ, T_CLK, T_RUN, T_ARR, T_SLAM, T_SCARE, T_DARK, T_ZB, T_TURN, T_CHASE, T_DOOR = (TR[k] for k in ["T_FRZ", "T_CLK", "T_RUN", "T_ARR", "T_SLAM", "T_SCARE", "T_DARK", "T_ZB", "T_TURN", "T_CHASE", "T_DOOR"])

# ---- 1. bright city groove (hook intro -> full groove -> tape stop at the freeze)
BPM = 112; bt = 60 / BPM; bar = 4 * bt
CH = [[60, 64, 67], [55, 59, 62, 67], [57, 60, 64], [53, 57, 60, 65]]   # C G Am F
BASS = [36, 43, 45, 41]
MEL = [(0, 76), (0.5, 79), (1, 81), (2, 79), (2.5, 76), (3, 74), (4, 72), (4.5, 74), (5, 76), (6, 79), (7, 76),
       (8, 76), (8.5, 79), (9, 84), (10, 81), (11, 79), (12, 77), (12.5, 76), (13, 74), (14, 72), (15, 74)]
g0 = B["normal"]["start"] - 0.05
# intro under the hook: shimmering pad + glock
music_intro = pad([mtof(m) for m in [60, 64, 67, 71]], g0 + 0.4, 2400, 0.004, 1.5, 0.6) * 0.35
add(music, 0.0, music_intro)
for k, (b, m) in enumerate(MEL[:8]): add(music, 0.6 + b * bt * 1.3, glock(mtof(m + 12), 1.4), 0.12)
for k in range(int((T_FRZ - g0) / bt) + 2):
    t0 = g0 + k * bt; bi = (k // 4) % 4; beat = k % 4
    if beat in (0, 2): add(music, t0, kick(), 0.55)
    if beat in (1, 3): add(music, t0, clap(), 0.35)
    for h in (0, 0.5): add(music, t0 + h * bt, hat(), 0.16 if h else 0.1)
    for h in (0.5,): [add(music, t0 + h * bt, marimba(mtof(m + 12), 0.4), 0.11) for m in CH[bi]]
    if beat in (0, 2, 3): add(music, t0, pluck(mtof(BASS[bi]), 0.45, 0.5), 0.42 if beat != 3 else 0.25)
for k in range(int((T_FRZ - g0) / (16 * bt)) + 1):
    for b, m in MEL: add(music, g0 + k * 16 * bt + b * bt, glock(mtof(m), 1.0), 0.14)
music = tape_stop(music, T_FRZ - 0.02, 0.55)
music = reverb(music, 1.4, 0.18, 2)

# ---- 2. after the freeze: ticking clock, heartbeat, rising drone
post = np.zeros(N)
tk = 0; t = T_FRZ + 0.6
while t < B["ghosts"]["start"] + 1.5:
    s = hp(noise(0.03), 2000) * np.exp(-T(0.03) * 120) + np.sin(2 * np.pi * (2400 if tk % 2 else 1800) * T(0.03)) * np.exp(-T(0.03) * 90) * 0.5
    add(post, t, s, 0.22); tk += 1; t += 0.5
hb = B["stare"]["start"]
while hb < B["ghosts"]["start"]:
    for o, g in ((0, 1), (0.22, 0.7)): add(post, hb + o, lp(kick(0.3), 120), 0.5 * g)
    hb += 60 / 66
dr = pad([mtof(38), mtof(45), mtof(50)], B["ghosts"]["start"] - T_FRZ + 1, 500, 0.01, 4, 1.5)
add(post, T_FRZ + 0.3, dr * np.linspace(0.4, 1.0, len(dr)), 0.5)

# ---- 3. eerie: ghosts and zombies (detuned music box, choir pad, low cluster)
e0, e1 = B["ghosts"]["start"], T_DARK + 0.3
add(post, e0, pad([mtof(m) for m in [57, 60, 64, 71]], e1 - e0, 1400, 0.012, 2.0, 1.0), 0.45)
add(post, e0, pad([mtof(m) for m in [33, 40]], e1 - e0 + 4, 300, 0.02, 2.0, 2.0), 0.5)
LULL = [76, 72, 69, 72, 76, 77, 76, 72, 74, 71, 67, 71, 74, 76, 74, 69]
for k, m in enumerate(LULL * 2):
    tt = e0 + 0.4 + k * 0.42
    if tt < e1: add(post, tt, musicbox(mtof(m) * (1 + 0.006 * np.sin(k)), 1.5), 0.13)
# choir 'ooh' (formant-filtered saw chord)
ch_t = T(e1 - e0); chs = sum(saw(mtof(m) * (1 + 0.003 * np.sin(2 * np.pi * 0.2 * ch_t + m)), ch_t) for m in [69, 72, 76])
choir = (bp(chs, 300, 600) + 0.6 * bp(chs, 700, 1100)) * np.minimum(1, ch_t / 2) * np.clip((e1 - e0 - ch_t) / 1, 0, 1)
add(post, e0, choir, 0.18)

# ---- 4. dark: brass drone, wind
d0 = T_DARK; d1 = B["chase"]["start"] + 1.0
br_t = T(d1 - d0 + 2); brass = lp(sum(saw(mtof(m), br_t, 0.004) for m in [38, 45, 50, 53]), 700) * np.minimum(1, br_t / 1.5) * np.clip((d1 - d0 + 2 - br_t) / 2, 0, 1)
add(post, d0, brass, 0.3)

# ---- 5. chase: taiko + string ostinato (D minor), from the build-up to the slam
c0 = B["chase"]["start"] + 0.2; cbpm = 150; cb = 60 / cbpm
k = 0; t = c0
while t < T_SLAM:
    inten = np.clip((t - c0) / max(T_RUN - c0, 0.1), 0.25, 1.0)
    beat = k % 4
    if beat == 0 or (t > T_RUN and beat == 2): add(post, t, tom(70), 0.7 * inten)
    if t > T_RUN and beat in (1, 3): add(post, t, tom(110, 0.35), 0.45)
    if t > T_RUN - 1: add(post, t, snare(0.12), 0.1 * inten) if beat in (1, 3) else None
    for h in range(4):   # 16th ostinato
        m = [50, 53, 57, 53][h] + (0 if (k // 8) % 2 == 0 else -2)
        s = lp(saw(mtof(m), T(0.11), 0.005), 2600) * env(int(0.11 * SR), 0.003, 0.06)
        add(post, t + h * cb / 4, s, 0.12 * inten)
    k += 1; t += cb
add(post, T_RUN - 1.6, riser(1.6), 0.35)
add(post, T_SLAM, boom(2.0, 50), 0.45)
# after the slam: low tremolo strings, then nearly nothing before the scare
tr_d = B["ghost"]["start"] - T_SLAM + 0.6; tr_t = T(tr_d)
trem = lp(sum(saw(mtof(m), tr_t, 0.003) for m in [38, 41, 45]), 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tr_t)) * np.minimum(1, tr_t / 0.5) * np.clip((tr_d - tr_t) / 1.0, 0, 1)
add(post, T_SLAM + 0.3, trem, 0.25)
# dread: high string cluster crescendo into the scare
g0d = B["ghost"]["start"] + 0.3; dd = T_SCARE - g0d; dt = T(dd)
dread = sum(np.sin(2 * np.pi * f * dt * (1 + 0.002 * np.sin(2 * np.pi * 6 * dt))) for f in [mtof(86), mtof(87), mtof(92)]) * (dt / dd) ** 2.2
add(post, g0d, dread, 0.12)
# scare stinger
st = T(1.6); clus = sum(saw(mtof(m), st, 0.01) for m in [49, 50, 55, 56, 61, 62]) / 6
stinger = lp(clus, 5000) * np.exp(-st * 1.8) * 1.2 + boom(1.6, 45) * 0.8 + bp(noise(1.6), 1500, 9000) * np.exp(-st * 6) * 0.8
add(post, T_SCARE - 0.02, stinger, 0.9); add(post, T_SCARE, scream(1.2), 0.45)
# ending: slow, detuned music box over a drone, the opening melody turned sad
en0 = B["end"]["start"] + 0.2
add(post, en0, pad([mtof(38), mtof(45)], DUR - en0 + 0.5, 400, 0.02, 1.2, 1.5), 0.45)
for k, m in enumerate([69, 72, 76, 74, 72, 69, 67, 69]):
    add(post, en0 + 0.3 + k * 0.55, musicbox(mtof(m) * 0.995, 2.0), 0.16)
add(post, B["end"]["start"] + 0.35, boom(3.5, 40), 0.35)
music += reverb(post, 2.8, 0.3, 3)

# ------------------------------------------------------------------ ambience
# city until the freeze: traffic bed, passing cars, birds, murmur, your footsteps
cd = T_FRZ + 0.05; ct = T(cd)
traffic = lp(R.standard_normal(len(ct)), 220, 2) * 2.2 + bp(R.standard_normal(len(ct)), 300, 1200) * 0.35 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.13 * ct))
murmur = bp(R.standard_normal(len(ct)), 250, 2200) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 2.7 * ct) * np.sin(2 * np.pi * 0.9 * ct + 1))) * 0.35
city = (traffic + murmur) * np.minimum(1, ct / 0.8); city[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
add(amb, 0, city, 0.13)
t = 1.3
while t < T_FRZ - 0.8:
    d = R.uniform(1.6, 2.6); w = whoosh(d, True, 120, 1600) * 0.6 + lp(noise(d), 400) * np.sin(np.pi * np.linspace(0, 1, int(d * SR))) ** 2 * 0.8
    add(amb, t, w, R.uniform(0.04, 0.09)); t += R.uniform(1.2, 2.8)
for t in np.arange(0.8, T_FRZ - 0.5, 1.7):
    for j in range(R.integers(2, 5)):
        bt_ = T(0.09); f = R.uniform(3200, 4800) * (1 + 0.25 * np.sin(2 * np.pi * 14 * bt_)); add(amb, t + R.uniform(0, 0.8) + j * 0.12, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(bt_), 0.005, 0.03), 0.03)
fs_t = 0.4
while fs_t < T_FRZ + 0.6:
    s = lp(noise(0.08), 1800) * np.exp(-T(0.08) * 50) + np.sin(2 * np.pi * 80 * T(0.08)) * np.exp(-T(0.08) * 40) * 0.5
    add(amb, fs_t, s, 0.05 if fs_t < T_FRZ else 0.03); fs_t += 1 / 1.57
# freeze: whoosh down + ring + sub; then a cold quiet wind that grows at dark
add(fx, T_FRZ - 0.25, whoosh(0.9, False, 200, 6000), 0.4)
add(fx, T_FRZ, boom(2.5, 38), 0.3)
rt = T(3.0); add(fx, T_FRZ + 0.05, np.sin(2 * np.pi * 3520 * rt) * np.exp(-rt * 1.2) * np.minimum(1, rt / 0.05), 0.03)
wd = DUR - T_FRZ; wt = T(wd)
wind = bp(R.standard_normal(len(wt)), 250, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * wt + 1) * np.sin(2 * np.pi * 0.07 * wt))
wgain = 0.03 + 0.09 * np.clip((wt + T_FRZ - T_DARK) / 3, 0, 1)
inside = (wt + T_FRZ > B["store"]["start"] + 1.5) & (wt + T_FRZ < B["end"]["start"])
wind = wind * wgain * np.where(inside, 0.25, 1.0)
add(amb, T_FRZ, wind * np.minimum(1, wt / 2), 1.0)
# ghosts appearing: shimmer whooshes (a handful, spread out)
gts = TR["ghostT"]
for i, gt in enumerate(gts[::max(1, len(gts) // 12)]):
    add(fx, gt - 0.6, whoosh(1.4, True, 800, 9000) + 0.3 * sum(np.sin(2 * np.pi * f * T(1.4)) for f in (1760, 2217, 2637)) * np.sin(np.pi * np.linspace(0, 1, int(1.4 * SR))) ** 2, 0.06)
# zombie groans: a few from T_ZB, a crowd during the chase, muffled behind glass
zt = T_ZB + 0.2; k = 0
while zt < B["end"]["start"] + 3:
    dens = 1.3 if zt < T_CHASE else 0.35 if zt < T_SLAM else 0.5
    g = groan(R.uniform(1.0, 2.2), None, k); gain = R.uniform(0.05, 0.11)
    if B["store"]["start"] + 1.5 < zt < B["end"]["start"]: g = lp(g, 900); gain *= 0.7
    if B["ghost"]["start"] + 0.3 < zt < B["end"]["start"]: gain *= 0.35
    add(fx, zt, g, gain); zt += R.uniform(0.4, 1.0) * dens; k += 1
# running footsteps (you) and the zombie stampede
t = T_RUN + 0.1
while t < T_ARR:
    s = lp(noise(0.07), 2500) * np.exp(-T(0.07) * 45) + np.sin(2 * np.pi * 70 * T(0.07)) * np.exp(-T(0.07) * 35) * 0.6
    add(fx, t, s, 0.18); t += 1 / 3.7
st_t = T(T_SLAM - T_CHASE + 1); stamp = lp(R.standard_normal(len(st_t)), 400) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3.3 * st_t))) * np.minimum(1, st_t / 1.5) * np.clip((T_SLAM + 1 - T_CHASE - st_t) / 1.0, 0, 1)
add(fx, T_CHASE, stamp, 0.35)
# store: fluorescent hum, flicker buzz when the ghost comes
hd_ = B["end"]["start"] - B["store"]["start"]; ht = T(hd_)
hum = (np.sin(2 * np.pi * 120 * ht) + 0.4 * np.sin(2 * np.pi * 240 * ht) + 0.2 * np.sin(2 * np.pi * 360 * ht)) * np.minimum(1, ht / 0.3)
hum *= np.where(ht + B["store"]["start"] > B["ghost"]["start"] + 0.9, 0.3, 1.0)
add(amb, B["store"]["start"], hum, 0.012)
for k in range(9):
    t0 = B["ghost"]["start"] + 0.15 + k * 0.085 + R.uniform(0, 0.03)
    add(fx, t0, hp(noise(0.05), 1500) * np.exp(-T(0.05) * 40) + 0.5 * np.sign(np.sin(2 * np.pi * 120 * T(0.05))) * np.exp(-T(0.05) * 30), 0.07)
add(fx, B["ghost"]["start"] + 0.95, lp(boom(1.0, 60), 200), 0.25)   # power dies

# ------------------------------------------------------------------ timeline sfx
for name, t in SFX:
    if name == "whoosh": add(fx, t, whoosh(1.3, True, 300, 8000), 0.22)
    elif name == "sting":
        add(fx, t - 0.9, riser(0.9), 0.22); add(fx, t, boom(2.0, 55), 0.3)
        st2 = T(1.4); add(fx, t, lp(sum(saw(mtof(m), st2, 0.01) for m in [50, 53, 56, 62]) / 4, 4000) * np.exp(-st2 * 2.5), 0.3)
    elif name == "horn":
        ht2 = T(0.45); h = lp(np.sign(np.sin(2 * np.pi * 415 * ht2)) + np.sign(np.sin(2 * np.pi * 523 * ht2)), 2500) * env(len(ht2), 0.01, 0.4, 0.05)
        add(fx, t, reverb(h, 1.0, 0.3, 4), 0.035); add(fx, t + 0.55, reverb(h[: int(0.2 * SR)], 1.0, 0.3, 4), 0.03)
    elif name == "bell":
        bt2 = T(0.9); b = (np.sin(2 * np.pi * 2350 * bt2) + 0.7 * np.sin(2 * np.pi * 3170 * bt2) + 0.3 * np.sin(2 * np.pi * 5100 * bt2)) * np.exp(-bt2 * 6) * (1 + 0.5 * np.sin(2 * np.pi * 28 * bt2))
        add(fx, t, b, 0.03); add(fx, t + 0.22, b, 0.025)
    elif name == "tick":
        for o in (0, 0.18): add(fx, T_CLK + o, np.sin(2 * np.pi * 1975 * T(0.12)) * env(int(0.12 * SR), 0.002, 0.08, 0.02), 0.07)
    elif name == "freeze": pass   # handled with the ambience cut
    elif name == "rise":
        d = 4.0; rt2 = T(d); add(fx, t, whoosh(d, True, 500, 10000) * 0.6 + 0.2 * sum(np.sin(2 * np.pi * f * (1 + rt2 / d * 0.5) * rt2) for f in (880, 1320, 1760)) * np.sin(np.pi * rt2 / d) ** 2, 0.12)
    elif name == "wail":
        for j, (f0, o) in enumerate([(520, 0), (660, 0.5), (440, 1.1)]): add(fx, t + o, reverb(wail(2.6, f0, j), 2.5, 0.55, 5 + j), 0.07)
    elif name == "groan":
        for j in range(5): add(fx, t + j * 0.35, groan(1.8, 75 + j * 9, 100 + j), 0.1)
    elif name == "snap":
        for j in range(14): add(fx, TR["T_TURN"] + R.uniform(0, 0.45), hp(noise(0.02), 1500) * np.exp(-T(0.02) * 200), 0.25)
    elif name == "thunder": add(fx, t, reverb(thunder(5.0, int(t * 10)), 2.0, 0.3, 7), 0.5)
    elif name == "roar":
        for j in range(8): add(fx, t + R.uniform(0, 0.4), groan(1.6, R.uniform(60, 100), 200 + j), 0.13)
    elif name == "slam":
        add(fx, T_SLAM, lp(boom(0.6, 70), 900), 0.66); add(fx, T_SLAM, hp(noise(0.4), 2500) * np.exp(-T(0.4) * 12), 0.22)
    elif name == "bang":
        tb = T_SLAM + 0.5
        while tb < B["end"]["start"] - 0.1:
            g = 0.32 if tb < B["ghost"]["start"] + 0.3 else 0.08
            add(fx, tb, lp(boom(0.35, 85), 600), g); add(fx, tb, bp(noise(0.25), 2500, 6000) * np.exp(-T(0.25) * 20), g * 0.25); tb += R.uniform(0.16, 0.45)
    elif name == "scare": pass   # in the score
fx = reverb(fx, 1.8, 0.2, 9)

# ------------------------------------------------------------------ narration + mix
v, vsr = sf.read("build/voice.wav"); v = resample_poly(v, SR, vsr); voice = np.zeros(N); add(voice, 0, v)
envv = np.sqrt(np.maximum(lp(voice ** 2, 6), 0)); envv /= envv.max() + 1e-9; duck = 1 - 0.45 * np.clip(envv * 3, 0, 1)
rms = lambda a: np.sqrt((a ** 2).mean()) + 1e-12
vr = rms(voice)
music *= vr * 10 ** (-12 / 20) / rms(music); amb *= vr * 10 ** (-24 / 20) / rms(amb); fx *= vr * 10 ** (-9 / 20) / rms(fx)
fx = np.tanh(fx / (vr * 6)) * vr * 6      # tame the biggest hits
GK = [(0, 10), (B["normal"]["start"], 10), (T_FRZ - 0.1, 10), (T_FRZ + 0.6, 3), (B["ghosts"]["start"], 2), (T_DARK, 1), (B["chase"]["start"], 4), (T_RUN - 0.5, 10), (T_RUN, 12),
      (T_SLAM, 12), (T_SLAM + 0.4, 6), (B["ghost"]["start"], 6), (B["ghost"]["start"] + 0.5, 10), (T_SCARE - 0.05, 10), (T_SCARE, 17), (T_SCARE + 1.0, 17), (B["end"]["start"], 5), (DUR + 1, 5)]
tt = np.arange(N) / SR; gdb = np.interp(tt, [k[0] for k in GK], [k[1] for k in GK]); music *= 10 ** (gdb / 20)
mix = voice + music * duck + amb + fx
mix = np.tanh(mix / 0.6) * 0.6
mix[int((DUR - 0.05) * SR):] *= 0
fo = int(1.3 * SR); i1 = int(DUR * SR); mix[i1 - fo:i1] *= np.linspace(1, 0, fo) ** 1.5
mix = hp(mix, 30)
mix /= np.abs(mix).max() / 0.92
st = np.stack([mix, mix], 1)
sf.write("build/audio.wav", st[: int(DUR * SR)].astype(np.float32), SR)
for nm, a, b in [("music", music, None), ("amb", amb, None), ("fx", fx, None), ("voice", voice, None)]:
    print(nm, round(20 * np.log10(np.sqrt((a ** 2).mean()) + 1e-12), 1), "dB rms")
print("ok", DUR)
