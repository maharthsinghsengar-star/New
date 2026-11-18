"""Procedural soundtrack for 'What if your wanted level kept increasing?' -> build/audio.wav (48 kHz stereo, no voice).
Music: an action score with a different country flavour per chapter (trumpets, flamenco guitar, accordion, synths, oud,
sitar, erhu, koto, taiko...). Sound design: footsteps, store robbery (door chime, register, alarm), engines per vehicle,
road + wind, sirens per country, police helicopter, roadblock crashes, aircraft (jet, props, helicopter, fighter), the map
whoosh, level-up stingers, the arrest (cuffs, car door, cell door)."""
import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, lfilter

SR = 48000
TR = json.load(open("build/track.json"))
DUR = TR["duration"]; N = int((DUR + 1.5) * SR)
CH = TR["chapters"]; LEVELS = TR["levels"]
R = np.random.default_rng(5)
T = lambda d: np.arange(int(d * SR)) / SR

def add(buf, t0, sig, g=1.0):
    i = int(round(t0 * SR))
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i + n] += (sig[:n] * g).astype(np.float32)
def filt(x, kind, f, order=2):
    if kind == "bp": sos = butter(order, [max(20, f[0]) / (SR / 2), min(f[1], SR / 2 - 100) / (SR / 2)], "band", output="sos")
    else: sos = butter(order, min(f, SR / 2 - 100) / (SR / 2), kind, output="sos")
    return sosfilt(sos, x)
lp = lambda x, f, o=2: filt(x, "low", f, o); hp = lambda x, f, o=2: filt(x, "high", f, o); bp = lambda x, a, b, o=2: filt(x, "bp", (a, b), o)
def fade(x, a=0.01, r=0.05):
    n = len(x); e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * e
def reverb(x, sec=2.0, wet=0.25, seed=1, damp=6000):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t / (sec / 6.9)); ir = lp(ir, damp); ir[:int(0.01 * SR)] *= 0.2; ir /= np.sqrt((ir ** 2).sum())
    return x * (1 - wet) + fftconvolve(x, ir)[:len(x)] * wet * 2.0
noise = lambda d: R.standard_normal(int(d * SR))
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def mixl(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def saw(f, t): return 2 * ((f * t) % 1) - 1
def sq(f, t): return np.sign(np.sin(2 * np.pi * f * t))
def osc_ph(f):   # f: per-sample frequency array -> phase in cycles
    return np.cumsum(f) / SR

# ------------------------------------------------------------------ instruments
def kick(d=0.4): t = T(d); f = 46 + 130 * np.exp(-t * 30); ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph) * np.exp(-t * 8) + 0.25 * np.sin(ph) * np.exp(-t * 40)
def snare(d=0.25): t = T(d); return bp(noise(d), 1200, 8000) * np.exp(-t * 17) * 0.75 + np.sin(2 * np.pi * 185 * t) * np.exp(-t * 24) * 0.55
def hat(d=0.05, o=False): t = T(d if not o else 0.22); return hp(noise(d if not o else 0.22), 7500) * np.exp(-t * (75 if not o else 14))
def clap(d=0.3): t = T(d); e = sum(np.exp(-np.maximum(t - o, 0) * 60) * (t >= o) for o in (0, 0.011, 0.023)) + 0.5 * np.exp(-t * 12); return bp(noise(d), 900, 5000) * e * 0.55
def tom(f=95, d=0.6): t = T(d); ff = f * (1 + 0.6 * np.exp(-t * 18)); return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 5) + 0.2 * lp(noise(d), 1500) * np.exp(-t * 30)
def taiko(d=1.2): t = T(d); ff = 62 * (1 + 0.5 * np.exp(-t * 14)); return np.tanh(1.5 * np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 3.2)) + 0.4 * lp(noise(d), 600) * np.exp(-t * 12)
def tabla(f=300, d=0.35): t = T(d); ff = f * (1 + 0.25 * np.exp(-t * 25)); return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 9) + 0.3 * np.sin(2 * np.pi * 2.7 * f * t) * np.exp(-t * 30)
def castanet(d=0.08): t = T(d); return bp(noise(d), 2500, 6000) * np.exp(-t * 90) * 0.8
def gong(d=3.0): t = T(d); return sum(a * np.sin(2 * np.pi * f * t + 0.2 * np.sin(2 * np.pi * 3 * t)) * np.exp(-t * k) for a, f, k in [(1, 110, 0.9), (0.6, 167, 1.2), (0.5, 233, 1.5), (0.3, 389, 2.2), (0.2, 571, 3)]) * 0.5
def shaker(d=0.09): t = T(d); return hp(noise(d), 5000) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.5
def ks(f, d=0.8, damp=0.996, bright=0.5, seed=0):   # Karplus-Strong pluck
    n = int(d * SR); L = max(2, int(round(SR / f))); r = np.random.default_rng(seed)
    x = np.zeros(n); burst = r.uniform(-1, 1, L); burst = lp(burst, 1500 + 7000 * bright) if bright < 1 else burst; x[:L] = burst
    a = np.zeros(L + 2); a[0] = 1; a[L] = -damp * 0.5; a[L + 1] = -damp * 0.5
    return fade(lfilter([1], a, x), 0.001, 0.03)
def guitar(f, d=0.6, seed=0): return ks(f, d, 0.995, 0.75, seed)
def koto(f, d=0.9, seed=0): s = ks(f, d, 0.997, 0.95, seed); return s + 0.2 * hp(s, 2500)
def oud(f, d=0.7, seed=0): return lp(ks(f, d, 0.993, 0.55, seed), 3000)
def sitar(f, d=1.2, seed=0): s = ks(f, d, 0.998, 1.0, seed); return s + 0.35 * np.tanh(bp(s, 1500, 4500) * 3)
def brass(f, d=0.4, vib=True):
    t = T(d); ff = f * (1 + (0.008 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1) if vib else 0)); s = saw(1, 0) * 0 + 2 * (osc_ph(ff) % 1) - 1
    s = bp(s, f * 0.9, 3200) + 0.4 * bp(s, 1100, 1600); e = np.minimum(1, t / 0.03) * np.clip((d - t) / 0.06, 0, 1); return np.tanh(s * e * 1.4)
def accordion(f, d=0.4):
    t = T(d); s = sq(f, t) * 0.5 + sq(f * 1.004, t) * 0.5 + 0.3 * sq(f * 2.002, t); s = lp(s, 2600) * (1 + 0.18 * np.sin(2 * np.pi * 6 * t)); e = np.minimum(1, t / 0.03) * np.clip((d - t) / 0.05, 0, 1); return s * e * 0.6
def synth(f, d=0.25, cut=2400):
    t = T(d); s = saw(f, t) + saw(f * 1.006, t) * 0.7; k = np.exp(-t * 9); s = lp(s, cut, 2) * k + lp(s, cut * 0.4 + 200, 2) * (1 - k); return fade(s * np.exp(-t * 3), 0.003, 0.03) * 0.6
def erhu(f, d=0.5):
    t = T(d); ff = f * (1 + 0.012 * np.sin(2 * np.pi * 6 * t) * np.clip(t / 0.2, 0, 1)) * (1 - 0.03 * np.exp(-t * 18)); ph = osc_ph(ff); s = 2 * (ph % 1) - 1
    s = bp(s, f * 0.9, 3500) + 0.5 * bp(s, 900, 1400); e = np.minimum(1, t / 0.08) * np.clip((d - t) / 0.1, 0, 1); return s * e * 0.8
def power(f, d=0.3):
    t = T(d); s = saw(f, t) + saw(f * 1.5, t) * 0.8 + saw(f * 2, t) * 0.5; return lp(np.tanh(s * 3), 3500) * np.exp(-t * 2.5) * 0.45
def epiano(f, d=1.0): t = T(d); return fade((np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4) + 0.1 * np.sin(2 * np.pi * 7 * f * t) * np.exp(-t * 30)) * np.exp(-t * 2.5), 0.002, 0.05)
def piano(f, d=2.0): t = T(d); return fade(sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.6 + k * 1.1)) for k, a in [(1, 1), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)]), 0.002, 0.1)
def bass(f, d=0.22): t = T(d); k = np.exp(-t * 12); w = saw(f, t); s = (lp(w, 1400) * k + lp(w, 500) * (1 - k)) * 0.7 + np.sin(2 * np.pi * f * t) * 0.6; return fade(s, 0.003, 0.03)
def pad(fs, d, cut=1600, a=0.4, r=0.8):
    t = T(d); s = sum(saw(f, t) * 0.5 + saw(f * 1.005, t) * 0.5 + saw(f * 0.995, t) * 0.4 for f in fs); s = lp(s, cut, 2)
    e = np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1); return s * e / len(fs) * 0.6
def strings(fs, d, a=0.8, r=1.0): return pad(fs, d, 2200, a, r) * (1 + 0.05 * np.sin(2 * np.pi * 5 * T(d)))
def boom(d=2.5, f0=48): t = T(d); f = f0 * (1 + 1.5 * np.exp(-t * 6)); return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.7)) + 0.5 * lp(noise(d), 300) * np.exp(-t * 3)
def whoosh(d=1.2, up=True, lo=300, hi=6000):
    n = int(d * SR); u = np.arange(n) / n; s = noise(d); out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        k = u[i] if up else 1 - u[i]; fc = lo * (hi / lo) ** k; out[i:i + seg] = bp(s[i:i + seg], fc * 0.7, min(fc * 1.4, 20000))[:len(out[i:i + seg])]
    return lp(out * np.sin(np.pi * u) ** 1.2, 10000)
def riser(d=2.0): t = T(d); f = 180 * 2 ** (t / d * 3.5); w = whoosh(d, True, 300, 9000)[:len(t)]; return w * 0.8 * (t[:len(w)] / d) ** 1.5 + 0.18 * np.sin(2 * np.pi * np.cumsum(f) / SR)[:len(w)] * (t[:len(w)] / d) ** 2
def bell(f, d=2.5): t = T(d); return fade(sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for a, m, k in [(1, 1, 1.4), (0.6, 2.4, 2.4), (0.35, 3.9, 3.5), (0.25, 5.4, 5), (0.15, 6.8, 7)]), 0.001, 0.1)

SCALES = {"minor": [0, 2, 3, 5, 7, 8, 10], "major": [0, 2, 4, 5, 7, 9, 11], "phryg": [0, 1, 4, 5, 7, 8, 10], "hijaz": [0, 1, 4, 5, 7, 8, 11], "harm": [0, 2, 3, 5, 7, 8, 11],
          "penta": [0, 2, 4, 7, 9, 12, 14], "hira": [0, 2, 3, 7, 8, 12, 14], "dorian": [0, 2, 3, 5, 7, 9, 10]}
STY = {   # bpm, root midi, scale, progression (scale degrees per bar), lead instrument, percussion flavour
    "usa": (126, 45, "minor", [0, 5, 2, 6], "synthbrass", None), "mex": (132, 50, "major", [0, 4, 5, 3], "trumpet", "shaker"), "esp": (136, 52, "phryg", [0, 1, 0, 6], "guitar", "castanet"),
    "fra": (128, 50, "harm", [0, 3, 4, 0], "accordion", None), "uk": (130, 47, "minor", [0, 5, 6, 4], "power", None), "ger": (138, 45, "minor", [0, 0, 5, 6], "synth", None),
    "uae": (128, 50, "hijaz", [0, 1, 0, 6], "oud", "tabla"), "ind": (132, 49, "hijaz", [0, 1, 0, 1], "sitar", "tabla"), "chn": (136, 50, "penta", [0, 3, 4, 0], "erhu", "gong"),
    "jpn": (140, 50, "hira", [0, 1, 3, 0], "koto", "taiko"), "end": (90, 45, "minor", [0, 5, 3, 4], "piano", None)}
def lead_note(inst, f, d, seed):
    return {"synthbrass": lambda: mixl(brass(f, d) * 0.5, synth(f, d) * 0.6), "trumpet": lambda: brass(f, d) * 0.9, "guitar": lambda: guitar(f, d + 0.4, seed), "accordion": lambda: accordion(f, d),
            "power": lambda: mixl(power(f / 2, d + 0.1), synth(f, d) * 0.5), "synth": lambda: synth(f, d, 3500), "oud": lambda: oud(f, d + 0.5, seed), "sitar": lambda: sitar(f, d + 0.8, seed),
            "erhu": lambda: erhu(f, d), "koto": lambda: koto(f, d + 0.6, seed), "piano": lambda: piano(f, d + 1.2)}[inst]()

music = np.zeros(N, np.float32); fx = np.zeros(N, np.float32); amb = np.zeros(N, np.float32)
fxL = np.zeros(N, np.float32); fxR = np.zeros(N, np.float32)   # panned effects

def deg(scale, root, k, octv=0):
    s = SCALES[scale]; return root + 12 * (octv + k // len(s)) + s[k % len(s)]

# ------------------------------------------------------------------ the score
def score(ch, seg_mode):
    """seg_mode(t) -> intensity 0..3 (0 silent, 1 soft, 2 groove, 3 chase)"""
    bpm, root, sc, prog, inst, perc = STY[ch["id"]]; beat = 60 / bpm; bar = 4 * beat; t0, t1 = ch["t0"], ch["t1"]
    rng = np.random.default_rng(len(ch["id"]) * 31)
    motif = []; k = 0
    for i in range(8): k = int(np.clip(k + rng.choice([-2, -1, 1, 2, 3, 0]), -1, 7)); motif.append((k, rng.choice([1, 1, 2])))
    nb = int((t1 - t0) / bar) + 1
    for b in range(nb):
        tb = t0 + b * bar; m = seg_mode(tb + 0.01)
        if tb >= t1 - 0.05: break
        degr = prog[b % len(prog)]; rootn = deg(sc, root, degr)
        chord = [mtof(deg(sc, root, degr + j, 1)) for j in (0, 2, 4)]
        if m >= 1: add(music, tb, strings(chord, bar + 0.4, 0.3 if m > 1 else 0.8), 0.16 if m > 1 else 0.22)
        for q in range(4):
            tq = tb + q * beat; mq = seg_mode(tq + 0.01)
            if mq == 0: continue
            if mq >= 2: add(music, tq, kick(), 0.9 if (mq == 3 or q in (0, 2)) else 0)
            if mq == 2 and q == 2: add(music, tq + beat / 2, kick(), 0.6)
            if mq >= 2 and q in (1, 3): add(music, tq, snare(), 0.55); add(music, tq, clap(), 0.3)
            for e in range(4 if mq == 3 else 2):
                te = tq + e * beat / (4 if mq == 3 else 2)
                if mq >= 1: add(music, te, hat(), 0.16 if mq >= 2 else 0.08)
            if mq >= 2:   # bass: driving eighths
                for e in range(2): add(music, tq + e * beat / 2, bass(mtof(rootn - 12 + (12 if (e == 1 and q % 2) else 0)), beat / 2 * 0.9), 0.42)
            if perc == "shaker" and mq >= 1: [add(music, tq + e * beat / 4, shaker(), 0.25) for e in range(4)]
            if perc == "castanet" and mq >= 2 and q % 2: [add(music, tq + e * beat / 4, castanet(), 0.4) for e in (0, 1, 3)]
            if perc == "tabla" and mq >= 1: add(music, tq, tabla(220 if q % 2 else 330), 0.35); add(music, tq + beat * 0.75, tabla(440), 0.2)
            if perc == "taiko" and mq >= 2 and q in (0, 3): add(music, tq, taiko(), 0.45)
        if perc == "gong" and b % 4 == 0 and m >= 2: add(music, tb, gong(), 0.18)
        if m >= 2 and b % 4 == 3: [add(music, tb + 3 * beat + i * beat / 4, tom(140 - i * 20), 0.4) for i in range(4)]
        # lead motif: every bar in chase, every other bar in groove, slow in soft
        if m >= 2 and (m == 3 or b % 2 == 1):
            tt = tb
            for j, (kk, ln) in enumerate(motif):
                d = beat / 2 * ln
                if tt >= tb + bar - 1e-3: break
                add(music, tt, lead_note(inst, mtof(deg(sc, root, degr * 0 + kk, 2)), d * 0.95, j + b), 0.32 if inst not in ("guitar", "oud", "koto", "sitar") else 0.5); tt += d
        elif m == 1 and b % 2 == 0:
            for j, (kk, ln) in enumerate(motif[:4]): add(music, tb + j * beat, lead_note(inst, mtof(deg(sc, root, kk, 2)), beat * 0.95, j), 0.22 if inst not in ("guitar", "oud", "koto", "sitar") else 0.4)

def mode_for(ch):
    segs = ch["seg"]; rb = ch["rb"]
    def m(t):
        for s in segs:
            if s["t0"] <= t < s["t1"]:
                ty = s["type"]
                if rb and rb["t"] - 0.5 <= t < rb["t"]: return 0
                return {"walk": 2, "rob": 1, "out": 3, "land": 1, "run": 2, "drive": 3, "board": 3, "fly": 2, "map": 1}.get(ty, 1)
        return 1
    return m

for ch in CH:
    if ch["id"] == "end": continue
    score(ch, mode_for(ch))

# ------------------------------------------------------------------ sound design helpers
def steps(t0, t1, rate, g=0.5, surface=1.0):
    t = t0 + 0.12
    while t < t1:
        d = 0.12; tt = T(d); s = (np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 40) * 0.8 + bp(noise(d), 300, 4000 * surface) * np.exp(-tt * 55) * 0.7)
        add(fx, t, s, g * (0.85 + 0.3 * R.random())); t += 1 / rate * (0.95 + 0.1 * R.random())
def siren(kind, d, seed=0, f_scale=1.0):
    t = T(d); r = np.random.default_rng(seed); ph0 = r.random() * 10
    if kind == "wail": f = 700 + 650 * (0.5 - 0.5 * np.cos(2 * np.pi * (t + ph0) / 4.2))
    elif kind == "yelp": f = 700 + 650 * (0.5 - 0.5 * np.cos(2 * np.pi * (t + ph0) / 0.32))
    elif kind == "jp": f = 650 + 300 * (0.5 - 0.5 * np.cos(2 * np.pi * (t + ph0) / 3.0))
    else:   # hi-lo two tone: (lo, hi, period)
        lo, hi, per = kind; f = np.where(((t + ph0) % per) < per / 2, lo, hi).astype(float); f = lp(f, 40)
    f = f * f_scale; ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5; s = bp(s, 400, 3500) + 0.3 * np.sin(2 * ph)
    return s * 0.45
SIREN = {"usa": ["wail", "yelp"], "mex": ["wail", "wail"], "esp": [(700, 940, 1.0), (680, 920, 1.1)], "fra": [(435, 488, 1.2), (440, 495, 1.25)], "uk": [(600, 800, 1.1), "wail"],
         "ger": [(410, 550, 1.3), (415, 555, 1.25)], "uae": ["wail", "yelp"], "ind": ["wail", "wail"], "chn": ["yelp", "wail"], "jpn": ["jp", "jp"], "end": ["wail", "yelp", (600, 800, 1.1)]}
def engine(v_arr, kind, dur):   # v_arr: speeds at 10 Hz
    n = int(dur * SR); tt = np.arange(n) / SR; v = np.interp(tt, np.arange(len(v_arr)) / 10, v_arr)
    acc = np.gradient(np.interp(np.arange(len(v_arr)) / 10, np.arange(len(v_arr)) / 10, v_arr)) * 10; a = np.interp(tt, np.arange(len(v_arr)) / 10, acc)
    if kind == "moto": edges = [0, 9, 17, 26, 36, 48, 70]; lo, hi, cyl = 3500, 11000, 2
    elif kind == "tuk": edges = [0, 5, 10, 16, 30]; lo, hi, cyl = 2500, 6000, 1
    else: edges = [0, 11, 21, 32, 45, 60, 90]; lo, hi, cyl = 1800, 6500, 4 if kind in ("hatch", "cab", "suv", "sedan", "pickup") else 6
    g = np.clip(np.searchsorted(edges, v) - 1, 0, len(edges) - 2); e0 = np.array(edges)[g]; e1 = np.array(edges)[g + 1]
    rpm = lo + (hi - lo) * np.clip((v - e0) / (e1 - e0), 0, 1); rpm = np.where(v < 0.5, 900, rpm); rpm = lp(rpm, 6)
    f = rpm / 60 * cyl / 2; ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 9)) * 0.35 + 0.35 * np.tanh(3 * np.sin(ph)) * bp(noise(dur), 200, 2500)[:n] * 0.6
    if kind == "tuk": s = np.tanh(4 * np.sin(ph)) * 0.5 + 0.3 * bp(noise(dur), 300, 3000)[:n] * (np.sin(ph) > 0.6)
    thr = 0.55 + 0.45 * np.clip(a / 4, 0, 1); s = lp(s, 2200 if kind != "moto" else 3800) * thr
    road = lp(noise(dur), 300)[:n] * np.clip(v / 40, 0, 1.3) * 0.22; wind = bp(noise(dur), 500, 2500)[:n] * np.clip(v / 70, 0, 1.2) ** 2 * (0.3 if kind in ("moto", "tuk") else 0.08)
    return s * 0.55 + road + wind
def jet_cabin(d, ramp_up=True, kind="jet"):
    t = T(d); u = np.clip(t / d, 0, 1); k = u if ramp_up else 1 - u * 0.6
    if kind in ("twinprop", "prop"):
        f = (60 + 45 * k) * (1 if kind == "twinprop" else 1.3); ph = 2 * np.pi * np.cumsum(f * np.ones_like(t)) / SR; s = lp(np.tanh(3 * np.sin(ph)) + 0.4 * np.sin(2 * ph), 1800) * 0.5 + bp(noise(d), 200, 1800) * 0.3
    elif kind == "heli":
        s = lp(noise(d), 300) * (0.6 + 0.4 * np.sin(2 * np.pi * 17 * t) ** 8) * 1.4 + np.sin(2 * np.pi * (4200 + 600 * k) * t) * 0.008 + bp(noise(d), 800, 3000) * 0.2
    elif kind == "fighter":
        s = lp(noise(d), 900) * 1.4 + bp(noise(d), 60, 200) * 1.2 + np.sin(2 * np.pi * (2500 + 2500 * k) * t) * 0.008
    else: s = lp(noise(d), 1000) * 0.55 + np.sin(2 * np.pi * (2800 + 3000 * k) * t) * 0.012 + bp(noise(d), 100, 400) * 0.45
    return s * (0.35 + 0.65 * k)
def crash(d=1.6, seed=0):
    r = np.random.default_rng(seed); t = T(d); s = np.zeros(len(t))
    for i in range(14): o = r.uniform(0, 0.25); fq = r.uniform(300, 2600); s += np.sin(2 * np.pi * fq * t) * np.exp(-np.maximum(t - o, 0) * r.uniform(8, 20)) * (t >= o) * r.uniform(0.2, 0.6)
    s = mixl(s, bp(noise(d), 500, 6000) * np.exp(-t * 6) * 1.2, boom(d, 40) * 0.9)[:len(t)]
    glass = hp(noise(d), 4000) * np.exp(-t * 4) * (R.random(len(t)) < 0.02) * 6
    return np.tanh((s + glass) * 0.9)
def chime(): return mixl(bell(1318, 1.2) * 0.4, np.concatenate([np.zeros(int(0.35 * SR)), bell(1046, 1.2) * 0.4]))
def ching(): return mixl(bell(2600, 0.9) * 0.5, bell(3900, 0.9) * 0.3, bp(noise(0.12), 1000, 6000) * np.exp(-T(0.12) * 30))
def alarm(d): t = T(d); return np.sign(np.sin(2 * np.pi * 950 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * t))) * 0.25
def click(d=0.05, f=3000): t = T(d); return bp(noise(d), f * 0.6, f * 1.6) * np.exp(-t * 120)
def door_slam(): t = T(0.5); return mixl(boom(0.5, 70) * 0.7, bp(noise(0.5), 200, 3000) * np.exp(-t * 25) * 0.8)
def clank(): t = T(1.8); return np.tanh(mixl(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(220, 3), (347, 4), (523, 5), (811, 7), (1270, 9)]) * 0.8, boom(1.8, 50) * 0.6))
def heartbeat(n, t0, rate=1.25):
    for i in range(n): tt = t0 + i / rate; add(music, tt, boom(0.3, 45) * 0.8, 0.5); add(music, tt + 0.22, boom(0.3, 42) * 0.6, 0.4)
def stinger():   # level up
    return mixl(whoosh(0.5, True, 600, 9000) * 0.5, np.concatenate([np.zeros(int(0.42 * SR)), mixl(boom(1.4, 55) * 0.6, bell(880, 1.4) * 0.35, bell(1320, 1.4) * 0.2)]))

# ------------------------------------------------------------------ per chapter sound design
for ch in CH:
    cid = ch["id"]; S = {s["type"]: s for s in ch["seg"]}; sirs = SIREN[cid]
    if cid == "end": continue
    def chase_sirens(a, b, g, base_seed):
        if b <= a: return
        for i, kind in enumerate(sirs[:2]):
            s = siren(kind, b - a, base_seed + i, 1 + 0.02 * i); s = fade(s, 0.8, 0.8)
            add(fxL if i == 0 else fxR, a, s, g); add(fxR if i == 0 else fxL, a, s, g * 0.55)
    if cid == "usa":
        steps(0.1, 7.9, 1.9, 0.45); add(amb, 0, lp(noise(8.2), 1200) * 0.25 + bp(noise(8.2), 2000, 6000) * 0.05)
        for tb in [0.6, 2.3, 5.9]: add(amb, tb, bell(2600 + 400 * tb, 0.3) * 0.08)   # birds-ish
        add(fx, 4.55, chime(), 0.6); add(fx, 8.4, mixl(click(0.06, 2500), click(0.04, 4000)), 1.0)
        add(fx, 8.9, bp(noise(0.5), 800, 3000) * np.exp(-T(0.5) * 6), 0.3)   # gasp
        add(fx, 9.6, bp(noise(0.25), 500, 3000) * np.exp(-T(0.25) * 10), 0.4); add(fx, 10.5, ching(), 0.8)
        al = alarm(10.0) * np.linspace(1, 0.15, int(10 * SR)); add(fx, 11.2, al, 0.5)
        add(fx, 14.85, chime(), 0.5); steps(14.1, 18.5, 2.9, 0.6)
        add(fx, 13.5, siren("wail", 5.5, 3) * np.linspace(0.1, 1, int(5.5 * SR)), 0.5)
    else:
        ld = S["land"]; kind = ch["prevCraft"]
        add(fx, ld["t0"], fade(jet_cabin(ld["t1"] - ld["t0"], False, kind), 0.4, 0.3), 0.9)
        if kind != "heli": tdn = ld["t0"] + 4.0; add(fx, tdn, bp(noise(0.5), 1500, 5000) * np.exp(-T(0.5) * 7), 0.7); add(fx, tdn, boom(0.8, 60), 0.6); add(fx, tdn + 0.3, fade(lp(noise(2.2), 900) * np.linspace(1, 0, int(2.2 * SR)), 0.2, 0.3), 1.0)
        else: add(fx, ld["t1"] - 1.0, boom(0.6, 60), 0.5)
        chase_sirens(ld["t0"] + 1.5, S["drive"]["t0"], 0.18, 10)
        rn = S["run"]; steps(rn["t0"], rn["t1"] - 0.3, 2.9, 0.6)
    # the drive
    dv = S["drive"]; d = dv["t1"] - dv["t0"]
    add(fx, dv["t0"] - 0.05, door_slam(), 0.6)
    add(fx, dv["t0"], fade(engine(ch["speed"], ch["car"], d + 0.3), 0.05, 0.4), 0.85)
    add(fx, dv["t0"] + 0.3, bp(noise(0.9), 1200, 4500) * np.exp(-T(0.9) * 3), 0.25)   # wheel spin / screech
    chase_sirens(dv["t0"], dv["t1"] + 3.0, 0.32, 20)
    if ch["rb"]:
        rt = ch["rb"]["t"]; add(fx, rt - 0.02, crash(1.8, len(cid)), 1.1); add(fx, rt - 0.4, bp(noise(0.5), 1500, 5000) * np.exp(-T(0.5) * 4), 0.3)
    # police helicopter overhead: low rotor thump (no drone whine)
    add(amb, dv["t0"], fade(lp(noise(d), 260) * (0.5 + 0.5 * np.sin(2 * np.pi * 15.5 * T(d)) ** 10) * np.clip(np.sin(np.pi * np.arange(int(d * SR)) / (d * SR)) * 1.5, 0, 1), 1, 1), 0.22)
    # board + takeoff
    bd = S["board"]; steps(bd["t0"] + 0.2, bd["t1"] - 0.2, 2.9, 0.6); add(fx, bd["t0"], door_slam(), 0.4)
    fl = S["fly"]; add(fx, fl["t0"] - 0.6, fade(jet_cabin(fl["t1"] - fl["t0"] + 0.6, True, ch["craft"]), 0.5, 0.4), 1.0)
    if ch["craft"] == "fighter": add(fx, fl["t0"] + 1.5, boom(2.5, 35), 0.6)
    # map: whoosh in, cabin chime, whoosh out
    mp = S["map"]; add(fx, mp["t0"] - 0.4, whoosh(1.2, True, 300, 7000), 0.5); add(fx, mp["t0"] + 0.9, chime(), 0.35); add(fx, mp["t1"] - 0.9, whoosh(1.2, False, 300, 7000), 0.45)
    add(amb, mp["t0"], fade(lp(noise(mp["t1"] - mp["t0"]), 500) * 0.4, 0.5, 0.5), 0.3)

# level-up stingers
for L in LEVELS: add(fx, L["t"] - 0.42, stinger(), 0.7)

# ------------------------------------------------------------------ the end: forced landing, standoff, cuffs, back seat, cell
E = next(c for c in CH if c["id"] == "end"); ES = {s["type"]: s for s in E["seg"]}; e0 = E["t0"]
add(fx, e0, fade(jet_cabin(7.0, False, "fighter"), 0.3, 0.4), 0.9); add(fx, e0 + 4.0, bp(noise(0.5), 1500, 5000) * np.exp(-T(0.5) * 7), 0.7)
for i, kind in enumerate(SIREN["end"]): s = siren(kind, 19.0, 40 + i, 1 + 0.03 * i); add(fxL if i % 2 else fxR, e0 + 1.0, fade(s, 1.5, 1.5), 0.22)
add(amb, e0 + 7, fade(lp(noise(12), 120) * 1.2, 1, 1), 0.6)   # tanks idling
add(amb, e0 + 4, fade(lp(noise(15), 260) * (0.5 + 0.5 * np.sin(2 * np.pi * 15 * T(15)) ** 10), 1, 1.5), 0.6)   # helicopters
# music: epic arrival -> heartbeat -> silence -> sad piano
bpm, root = 90, 45; beat = 60 / bpm
for b in range(3): add(music, e0 + b * 2.4, strings([mtof(45), mtof(52), mtof(57)], 2.6, 0.5), 0.3); add(music, e0 + b * 2.4, taiko(), 0.6)
add(music, e0 + 7.0, boom(3, 40), 0.8); heartbeat(9, e0 + 7.4, 1.3); add(music, e0 + 7.0, strings([mtof(69), mtof(70)], 7.5, 2, 1), 0.12)
cf = ES["cuffs"]["t0"]; add(fx, cf + 2.0, mixl(click(0.04, 3500), np.concatenate([np.zeros(int(0.09 * SR)), click(0.04, 3000)])), 1.2); add(fx, cf + 2.0, bell(4200, 0.4) * 0.1)
bs = ES["backseat"]["t0"]; add(fx, bs, door_slam(), 0.8); add(fx, bs + 0.1, fade(engine([6 + 3 * i for i in range(70)], "sedan", 7.0), 0.4, 0.6), 0.45)
for i, kind in enumerate(["wail", "yelp"]): add(fxL if i else fxR, bs, fade(lp(siren(kind, 7.0, 60 + i), 1800), 0.5, 0.8), 0.2)
prog = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (52, 55, 59)]   # Am F C E
for b in range(8):
    tb = bs - 0.5 + b * 1.75; ch3 = prog[b % 4]
    if tb > e0 + 33: break
    add(music, tb, piano(mtof(ch3[0] - 12), 2.4), 0.35); [add(music, tb + 0.06 * j, piano(mtof(n), 2.2), 0.22) for j, n in enumerate(ch3)]
    add(music, tb + 0.9, piano(mtof(ch3[2] + 12), 1.4), 0.16)
jl = ES["jail"]["t0"]; add(fx, jl + 0.6, whoosh(0.7, True, 200, 2000) * 0.4); add(fx, jl + 1.15, clank(), 1.0); add(fx, jl + 2.0, boom(3.5, 38), 0.8)
add(music, jl + 2.0, strings([mtof(45), mtof(52), mtof(57), mtof(60)], 5.0, 0.3, 2.5), 0.25)
steps(jl + 1.6, jl + 4.6, 1.7, 0.18)

# ------------------------------------------------------------------ mix
def rms(x): return np.sqrt(np.mean(x.astype(np.float64) ** 2) + 1e-12)
music = reverb(music.astype(np.float64), 1.6, 0.18, 3).astype(np.float32)
mono_fx = fx + 0.5 * (fxL + fxR)
mus_g = 0.27 / rms(music); fx_g = 0.2 / rms(mono_fx); amb_g = 0.045 / rms(amb)
t = np.arange(N) / SR
# music sits a bit lower while driving (engines + sirens carry it), higher on the map / title / ending
mg = np.ones(N, np.float32)
for ch in CH:
    for s in ch["seg"]:
        k = {"map": 1.25, "walk": 1.15, "land": 0.95, "drive": 0.85, "fly": 1.0, "standoff": 1.1, "backseat": 1.2, "jail": 1.2}.get(s["type"], 1.0)
        mg[int(s["t0"] * SR):int(s["t1"] * SR)] = k
mg = lp(mg, 2).astype(np.float32)
L = music * mus_g * mg + (fx + fxL) * fx_g + amb * amb_g
Rr = music * mus_g * mg + (fx + fxR) * fx_g + amb * amb_g
# a little stereo width on the music
Rr = Rr + np.roll(music * mus_g * mg, int(0.011 * SR)) * 0.12
st = np.stack([L, Rr], 1).astype(np.float64)
st = np.tanh(st / 0.7) * 0.7
end = int(DUR * SR); st[end - int(1.2 * SR):end] *= np.linspace(1, 0, int(1.2 * SR))[:, None]; st[end:] = 0
st /= np.abs(st).max() / 0.92
sf.write("build/audio.wav", st[:end + int(0.2 * SR)].astype(np.float32), SR)
print("audio", round(DUR, 1), "s, peak", round(float(np.abs(st).max()), 3))
