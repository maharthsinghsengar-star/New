"""Original calm soundtrack for the captain story (procedurally composed).
Usage: python3 music_ship.py voice.wav out_music.wav
Writes stereo music already ducked under the voiceover."""
import numpy as np, wave, sys

SR = 44100
DUR = 73.7
N = int(SR * DUR)
rng = np.random.default_rng(11)
BEAT = 60 / 70            # 70 bpm, relaxed
BAR = BEAT * 4

NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
def hz(midi): return 440.0 * 2 ** ((midi - 69) / 12)
def chord(name):
    """'Am' / 'F' / 'E' / 'Dm' / 'Cmaj7' etc -> root midi (octave 3) + intervals"""
    minor = name.endswith('m') and not name.endswith('maj')
    root = name.rstrip('m7aj') if not name.endswith('maj7') else name[:-4]
    r = 48 + NOTE[root]
    iv = [0, 3, 7] if minor else [0, 4, 7]
    if name.endswith('maj7'): iv = [0, 4, 7, 11]
    if name.endswith('7') and not name.endswith('maj7'): iv = iv + [10]
    return r, iv

# sections: (start, end, progression, mood)
SECTIONS = [
    (0.0, 11.98, ['Cmaj7', 'Am', 'F', 'G'], 'calm'),
    (11.98, 23.58, ['Am', 'F', 'C', 'G'], 'curious'),
    (23.58, 35.34, ['Am', 'Em', 'F', 'E'], 'mystery'),
    (35.34, 40.24, ['Am', 'F', 'Dm', 'E'], 'night'),
    (40.24, 47.44, ['F', 'G', 'Em', 'Am'], 'adventure'),
    (47.44, 56.79, ['Dm', 'Am', 'E', 'Am'], 'tense'),
    (56.79, 73.7, ['F', 'G', 'C', 'Am'], 'uplift'),
]
MOOD = {  # pad level, piano level, arp density, bass level, bells
    'calm': (0.55, 0.55, 2, 0.35, 0.0), 'curious': (0.5, 0.5, 2, 0.3, 0.0),
    'mystery': (0.6, 0.35, 1, 0.4, 0.0), 'night': (0.55, 0.25, 1, 0.35, 0.0),
    'adventure': (0.5, 0.6, 2, 0.4, 0.15), 'tense': (0.6, 0.4, 1, 0.45, 0.0),
    'uplift': (0.6, 0.65, 2, 0.4, 0.3),
}
L = np.zeros(N); R = np.zeros(N)
t_all = np.arange(N) / SR

def add(sig, start, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    m = min(len(sig), N - i)
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + m] += sig[:m] * l; R[i:i + m] += sig[:m] * r

def pad_note(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        ff = f * (1 + det)
        s += np.sin(2 * np.pi * ff * t) + 0.35 * np.sin(2 * np.pi * 2 * ff * t) + 0.12 * np.sin(2 * np.pi * 3 * ff * t)
    att = np.minimum(1, t / 1.4); rel = np.minimum(1, (dur - t) / 1.6)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.25 * t)
    return s / 3 * att * np.clip(rel, 0, 1) * trem

def piano_note(f, dur=2.4):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 1.6) + 0.45 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 2.6)
         + 0.18 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 3.8) + 0.06 * np.sin(2 * np.pi * 4.01 * f * t) * np.exp(-t * 5))
    att = np.minimum(1, t / 0.006)
    return s * att

def bell(f, dur=3.5):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 2)) * np.exp(-t * 1.2) * np.minimum(1, t / 0.004)

def bass_note(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.minimum(1, t / 0.08) * np.clip((dur - t) / 0.4, 0, 1) * np.exp(-t * 0.25)

ARP = [0, 2, 1, 2, 3, 2, 1, 2]
for (s0, s1, prog, mood) in SECTIONS:
    padL, piaL, dens, basL, belL = MOOD[mood]
    bar_i = 0; tb = s0
    while tb < s1 - 0.2:
        name = prog[bar_i % len(prog)]
        root, iv = chord(name)
        dur = min(BAR, s1 - tb) + 1.2  # overlap into next for smoothness
        fade = 1.0
        # pad: chord tones in octave 4
        for k, i in enumerate(iv[:4]):
            add(pad_note(hz(root + 12 + i), dur) * padL * 0.11, tb, pan=(-0.5 + k * 0.33))
        # bass
        add(bass_note(hz(root - 12 + 12 * 0), BAR + 0.3) * basL * 0.22, tb, 0.0)
        # piano arpeggio
        tones = [root + 12 + i for i in iv] + [root + 24 + iv[0], root + 24 + iv[1 % len(iv)]]
        steps = 8 if dens == 2 else 4
        for st in range(steps):
            ts = tb + st * BAR / steps
            if ts >= s1: break
            note = tones[ARP[st % 8] % len(tones)] + (12 if st % 4 == 3 else 0)
            vel = (0.75 + 0.25 * rng.random()) * (1.0 if st % 4 == 0 else 0.7)
            add(piano_note(hz(note)) * piaL * 0.085 * vel, ts + rng.normal(0, 0.006), pan=0.25 * np.sin(st))
        # melody on top in calm/uplift sections: gentle motif on beats 1 and 3
        if mood in ('calm', 'uplift', 'adventure', 'curious'):
            motif = [iv[-1] + 12, iv[1] + 12] if bar_i % 2 == 0 else [iv[0] + 24, iv[-1] + 12]
            for j, m in enumerate(motif):
                add(piano_note(hz(root + 12 + m), 3.0) * piaL * 0.07, tb + j * BAR / 2 + BEAT * 0.5, pan=0.1)
        if belL > 0:
            add(bell(hz(root + 36 + iv[bar_i % len(iv)])) * belL * 0.06, tb + BEAT * 2, pan=-0.3 + 0.6 * (bar_i % 2))
        bar_i += 1; tb += BAR

# reverb: FFT convolution with a soft exponential noise tail (stereo-decorrelated)
def reverb(x, seed):
    r = np.random.default_rng(seed); n = int(2.6 * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 2.4); ir[:int(0.012 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    m = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]
    return y
wetL, wetR = reverb(L, 1), reverb(R, 2)
L = L * 0.75 + wetL * 0.45; R = R * 0.75 + wetR * 0.45
# gentle low-pass for warmth (one-pole)
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    b = 1 - a
    # vectorised via recursive filter in chunks is slow in python; use simple FFT-domain shelf instead
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))
L, R = lp(L, 6500), lp(R, 6500)
# fade in/out
fade = np.ones(N); fi = int(2.0 * SR); fo = int(2.5 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade

# normalise music to a calm bed level
rms = np.sqrt(np.mean((L ** 2 + R ** 2) / 2))
target = 0.032
L *= target / rms; R *= target / rms

# ducking under the voiceover so both stay clear
w = wave.open(sys.argv[1], 'rb'); vr = w.getframerate(); vn = w.getnframes(); vch = w.getnchannels()
v = np.frombuffer(w.readframes(vn), dtype=np.int16).astype(np.float64) / 32768; w.close()
if vch == 2: v = v.reshape(-1, 2).mean(axis=1)
v = np.pad(v, (0, max(0, N - len(v))))[:N]
win = int(0.04 * SR); env = np.sqrt(np.convolve(v ** 2, np.ones(win) / win, mode='same'))
speech = np.clip((env - 0.01) / 0.04, 0, 1)
# smooth: fast attack (~120 ms), slow release (~700 ms)
g = np.empty(N); cur = 0.0
att = np.exp(-1 / (0.12 * SR)); rel = np.exp(-1 / (0.7 * SR))
step = 64
for i in range(0, N, step):
    tgt = speech[i:i + step].max()
    k = att if tgt > cur else rel
    cur = tgt + (cur - tgt) * (k ** step)
    g[i:i + step] = cur
duck = 1 - 0.5 * g   # about -6 dB under speech, full level in pauses
L *= duck; R *= duck

out = np.stack([L, R], axis=1)
peak = np.abs(out).max()
if peak > 0.95: out *= 0.95 / peak
wo = wave.open(sys.argv[2], 'wb'); wo.setnchannels(2); wo.setsampwidth(2); wo.setframerate(SR)
wo.writeframes((out * 32767).astype(np.int16).tobytes()); wo.close()
print('music rms', target, 'peak', round(float(peak), 3))
