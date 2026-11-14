"""Horror score + sound effects, synthesized and driven by the story timeline:
drones and eerie highs that follow each beat's tension, sparse minor piano, heartbeats, stingers on the scares,
and effects (knocks, door, gate, creaks, phone, siren, clock) placed at the moments the narration mentions them."""
import json, numpy as np, soundfile as sf
sr = 44100
TL = json.load(open("build/timeline.json")); BE = TL["beats"]
dur = TL["duration"] + 0.5; n = int(dur * sr); rng = np.random.default_rng(13); t = np.arange(n) / sr
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
dry = np.zeros((n, 2)); wet = np.zeros((n, 2))
def add(buf, sig, start, pan=0.5, g=1.0):
    i = int(start * sr)
    if i >= n or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: n - i] * g; buf[i:i + len(sig), 0] += sig * np.cos(pan * np.pi / 2); buf[i:i + len(sig), 1] += sig * np.sin(pan * np.pi / 2)
def smoothstep(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
# tension curve (0..4), eased between beats
ten = np.zeros(n)
for b in BE: ten[int(b["start"] * sr):int(b["end"] * sr)] = b["tension"]
k = int(2.5 * sr); ker = np.hanning(k); ten = np.convolve(ten, ker / ker.sum(), "same"); T = ten / 4.0
def lfo(f, ph=0.0): return 0.5 + 0.5 * np.sin(2 * np.pi * f * t + ph)
# --- low drone (always there, swelling with tension)
drone = sum(np.sin(2 * np.pi * hz(m) * d * t + p) for m, d, p in [(26, 1.0, 0), (26, 1.006, 1), (33, 0.997, 2), (38, 1.003, 3)]) / 4
drone *= (0.35 + 0.65 * lfo(0.07)) * (0.05 + 0.13 * T)
sub = np.sin(2 * np.pi * hz(14) * t) * 0.10 * smoothstep((T - 0.4) / 0.5) * (0.6 + 0.4 * lfo(0.11, 1))
# --- eerie high cluster, tremolo, only when tense
hi = sum(np.sin(2 * np.pi * (hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 0.13 * t + i))) * t) for i, m in enumerate([86, 87, 93, 94])) / 4
hi *= 0.03 * smoothstep((T - 0.45) / 0.4) * (0.5 + 0.5 * lfo(5.5)) * (0.4 + 0.6 * lfo(0.05, 2))
# --- breathy wind
nz = rng.normal(0, 1, n); nz = np.cumsum(nz); nz -= np.convolve(nz, np.ones(2000) / 2000, "same"); nz /= np.abs(nz).max()
wind = nz * (0.25 + 0.75 * lfo(0.09, 4)) * (0.018 + 0.03 * T)
for ch, sig in ((0, drone + sub + hi * 0.7 + wind), (1, drone + sub + hi + wind * 0.8)): dry[:, ch] += sig
# --- sparse piano: lonely minor figures when calm, dissonant low clusters when tense
def piano(m, t0, vol, pan=0.5, decay=1.1):
    f = hz(m); tt = np.arange(int(5 * sr)) / sr
    s = sum(np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * decay * (1 + 0.6 * h)) / h for h in (1, 2, 3, 4)) * np.clip(tt / 0.006, 0, 1)
    add(wet, s, t0, pan, vol); add(dry, s, t0, pan, vol * 0.5)
SCALE = [62, 65, 69, 70, 73, 74, 77]         # D minor with a sharpened 7th
tt_ = 4.0
while tt_ < dur - 4:
    lvl = T[int(tt_ * sr)]
    if lvl < 0.55:
        m = SCALE[rng.integers(0, 7)]; piano(m, tt_, 0.05, rng.uniform(0.3, 0.7)); 
        if rng.random() < 0.5: piano(m + [3, 7, -5][rng.integers(0, 3)], tt_ + rng.choice([0.55, 1.1]), 0.035, rng.uniform(0.3, 0.7))
        tt_ += rng.uniform(3.2, 5.5)
    else:
        m = [38, 39, 41, 44][rng.integers(0, 4)]; piano(m, tt_, 0.07, 0.5, 0.7); piano(m + [1, 6, 11][rng.integers(0, 3)], tt_ + 0.03, 0.05, 0.5, 0.7)
        if rng.random() < 0.4: piano(rng.choice([85, 86, 90, 92]), tt_ + rng.uniform(0.8, 2), 0.02, rng.uniform(0.2, 0.8), 1.6)
        tt_ += rng.uniform(4.5, 8.0)
# --- heartbeat when tension is high
tb = np.arange(int(0.3 * sr)) / sr; thump = np.sin(2 * np.pi * (46 + 30 * np.exp(-tb * 30)) * tb) * np.exp(-tb * 13)
tt_ = 0.0
while tt_ < dur - 2:
    lvl = T[int(tt_ * sr)]
    if lvl > 0.62: g = 0.16 * smoothstep((lvl - 0.6) / 0.3); add(dry, thump, tt_, 0.5, g); add(dry, thump, tt_ + 0.26, 0.5, g * 0.7); tt_ += 1.25 - 0.45 * smoothstep((lvl - 0.7) / 0.3)
    else: tt_ += 0.5
# --- effects
def noise(d): return rng.normal(0, 1, int(d * sr))
def lp(x, w): return np.convolve(x, np.ones(w) / w, "same")
def fx_sting(big=True):
    d = 2.0; tr = np.arange(int(d * sr)) / sr; riser = lp(noise(d), 6) * (tr / d) ** 3 * 0.5
    ti = np.arange(int(4.5 * sr)) / sr; boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-ti * 9)) * ti) * np.exp(-ti * 1.6)
    brass = sum(np.sign(np.sin(2 * np.pi * hz(m) * ti)) for m in ([38, 39, 44, 50, 51] if big else [38, 44])) / 5; brass = lp(brass, 14) * np.exp(-ti * (1.4 if big else 2.4))
    scr = sum(np.sin(2 * np.pi * hz(m) * (1 + 0.01 * np.sin(2 * np.pi * 7 * ti)) * ti) for m in (97, 98, 103)) / 3 * np.exp(-ti * 2.2) * (0.5 if big else 0.0)
    hit = boom * 0.9 + brass * 0.55 + scr * 0.35 + lp(noise(4.5), 3) * np.exp(-ti * 9) * 0.5
    return riser, hit
def fx_knock(): tk = np.arange(int(0.16 * sr)) / sr; one = (np.sin(2 * np.pi * 150 * tk) + 0.5 * np.sin(2 * np.pi * 310 * tk) + 0.4 * rng.normal(0, 1, len(tk))) * np.exp(-tk * 40); out = np.zeros(int(1.1 * sr)); [out.__setitem__(slice(int(o * sr), int(o * sr) + len(one)), one) for o in (0, 0.26, 0.52)]; return out
def fx_slam(): ts = np.arange(int(1.4 * sr)) / sr; return np.sin(2 * np.pi * (55 + 60 * np.exp(-ts * 25)) * ts) * np.exp(-ts * 5) + lp(noise(1.4), 4) * np.exp(-ts * 14) * 0.9
def fx_creak(lo=180, hi_=420, d=1.1): tc = np.arange(int(d * sr)) / sr; f = lo + (hi_ - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * tc + 1)) + 25 * np.sin(2 * np.pi * 9 * tc); ph = 2 * np.pi * np.cumsum(f) / sr; s = np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 2.01) * 0.5; return lp(s, 8) * np.sin(np.pi * tc / d) ** 0.7 * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tc))
def fx_gate(): return fx_creak(900, 1500, 1.3) * 0.6
def fx_click(): tc = np.arange(int(0.05 * sr)) / sr; return (np.sin(2 * np.pi * 1900 * tc) + rng.normal(0, 0.6, len(tc))) * np.exp(-tc * 130)
def fx_ring(): tr = np.arange(int(3.6 * sr)) / sr; bell = (np.sin(2 * np.pi * 1320 * tr) + np.sin(2 * np.pi * 1650 * tr)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * tr))); gate = ((tr % 1.8) < 1.0).astype(float); return lp(bell * gate, 10)
def fx_siren(): ts = np.arange(int(3.2 * sr)) / sr; f = 700 + 350 * np.sin(2 * np.pi * 0.7 * ts); return lp(np.sin(2 * np.pi * np.cumsum(f) / sr), 6) * np.sin(np.pi * ts / 3.2) ** 0.5
def fx_buzz(): tz = np.arange(int(1.3 * sr)) / sr; return lp(np.sign(np.sin(2 * np.pi * 150 * tz)), 20) * ((tz % 0.65) < 0.4)
G = {"knock": (0.5, 0.25), "slam": (0.6, 0.5), "creak": (0.2, 0.45), "door": (0.14, 0.3), "gate": (0.1, 0.3), "click": (0.3, 0.1), "ring": (0.06, 0.5), "siren": (0.05, 0.25), "buzz": (0.2, 0.1)}
for b in BE:
    for e in b["sfx"]:
        nm, t0 = e["name"], e["t"]
        if nm in ("sting", "sting_soft"):
            r_, h_ = fx_sting(nm == "sting"); g = 0.34 if nm == "sting" else 0.2; add(dry, r_, t0 - 2.0, 0.5, g * 0.5); add(dry, h_, t0, 0.5, g); add(wet, h_, t0, 0.5, g * 0.8)
        else:
            s = {"knock": fx_knock, "slam": fx_slam, "creak": fx_creak, "door": lambda: fx_creak(260, 520, 0.9), "gate": fx_gate, "click": fx_click, "ring": fx_ring, "siren": fx_siren, "buzz": fx_buzz}[nm]()
            gd, gw = G[nm]; add(dry, s, t0, 0.5, gd); add(wet, s, t0, 0.5, gw)
# the old clock ticks all through the night inside the house
ids = [b["id"] for b in BE]; c0, c1 = BE[ids.index("dark")]["start"], BE[ids.index("bhaiya")]["end"]
tk = np.arange(int(0.03 * sr)) / sr; tick = np.sin(2 * np.pi * 2400 * tk) * np.exp(-tk * 220); tock = np.sin(2 * np.pi * 1700 * tk) * np.exp(-tk * 200)
for i, x in enumerate(np.arange(c0, c1, 0.5)): add(dry, tick if i % 2 == 0 else tock, x, 0.35, 0.09); add(wet, tick if i % 2 == 0 else tock, x, 0.35, 0.06)
# --- reverb on the wet bus (convolution with a decaying-noise room)
ir_len = int(3.2 * sr); ti = np.arange(ir_len) / sr; N = 1 << int(np.ceil(np.log2(n + ir_len)))
for ch in (0, 1):
    ir = rng.normal(0, 1, ir_len) * np.exp(-ti * 2.1); ir = lp(ir, 3); ir /= np.sqrt((ir ** 2).sum())
    wet[:, ch] = np.fft.irfft(np.fft.rfft(wet[:, ch], N) * np.fft.rfft(ir, N), N)[:n] * 0.9
out = dry + wet
out *= (np.clip(t / 3, 0, 1) * np.clip((dur - t) / 4, 0, 1))[:, None]
sf.write("build/music.wav", out * (0.8 / np.abs(out).max()), sr)
print("score", round(dur, 1), "s")
