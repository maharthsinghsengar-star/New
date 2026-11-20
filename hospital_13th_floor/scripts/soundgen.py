"""Procedural sound design: one-shot SFX, ambience beds and the minimal horror score.

Everything is synthesized from scratch with numpy (no sample libraries needed), so the whole
soundtrack is reproducible and every element can be swapped for a recorded/licensed sound later
by dropping a WAV with the same name into sound_effects/ or music/overrides/.
"""
from __future__ import annotations

import numpy as np

from common import (SR, VOICE, secs, butter, reverb, stereo, fade, normalize, env_adsr, read_audio,
                    pitch_tempo, delay)

R = np.random.default_rng(1313)


def t_(d):
    return np.arange(secs(d)) / SR


def noise(d, color="white"):
    n = secs(d)
    x = R.standard_normal(n).astype(np.float32)
    if color == "pink":
        x = butter(x, "low", 4000, 1) + 0.5 * butter(x, "low", 800, 1) + 0.3 * butter(x, "low", 150, 1)
    elif color == "brown":
        x = np.cumsum(x)
        x = butter(x - x.mean(), "high", 15, 2)
        x /= np.abs(x).max() + 1e-9
    return x.astype(np.float32)


def expdec(d, tau):
    return np.exp(-t_(d) / tau).astype(np.float32)


def sine(f, d, phase=0.0):
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * t_(d) + phase).astype(np.float32)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase).astype(np.float32)


def saw(f, d, harm=24):
    t = t_(d)
    x = np.zeros_like(t)
    for k in range(1, harm + 1):
        if f * k > 9000:
            break
        x += np.sin(2 * np.pi * f * k * t) / k
    return (x * 0.6).astype(np.float32)


def pad_to(x, d):
    n = secs(d)
    if x.ndim == 1:
        return np.pad(x, (0, max(0, n - len(x))))[:n]
    return np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]


def add(dst, src, at):
    i = max(0, secs(at))
    if i >= len(dst):
        return dst
    j = min(len(dst), i + len(src))
    dst[i:j] += src[: j - i]
    return dst


def st(x, pan=0.0):
    return stereo(x, pan) if x.ndim == 1 else x


# =============================================================================== one-shot SFX
def thump(f0=60, d=0.6, drop=0.5):
    f = f0 * (1 - drop * (1 - np.exp(-t_(d) / 0.08)))
    return sine(f, d) * expdec(d, d / 4)


def click(d=0.02, hp=2000):
    x = noise(d) * expdec(d, 0.003)
    return butter(x, "high", hp, 2)


def metal(partials, d, tau=0.6, amp=None):
    x = np.zeros(secs(d), np.float32)
    for i, p in enumerate(partials):
        a = amp[i] if amp else 1 / (1 + i * 0.5)
        x += a * sine(p, d, R.random() * 6) * expdec(d, tau * (1.2 - i * 0.07))
    return x / len(partials)


def bell_partials(f):
    return [f * r for r in (0.56, 0.92, 1.19, 1.71, 2.0, 2.74, 3.0, 3.76, 4.07)]


def sfx_thunder_far():
    d = 7.0
    x = noise(d, "brown")
    e = np.interp(t_(d), [0, 0.3, 1.2, 2.5, 4, 7], [0, 1, 0.6, 0.9, 0.3, 0])
    x = butter(x * e, "low", 180, 2)
    return reverb(st(normalize(x)), 3.0, 0.4, bright=0.2)


def sfx_ecg_beep():
    d = 3.8
    x = np.zeros(secs(d), np.float32)
    b = sine(1000, 0.11) * env_adsr(secs(0.11), 0.003, 0.02, 0.8, 0.03)
    for k in range(4):
        add(x, b * 0.5, k * 0.9)
    return reverb(st(x), 1.0, 0.25)


def sfx_ecg_flatline():
    d = 3.5
    x = sine(1000, d) * 0.4 * env_adsr(secs(d), 0.01, 0.1, 1, 1.5)
    return reverb(st(x), 1.4, 0.3)


def sfx_low_hit():
    d = 4.5
    x = thump(55, d, 0.6) * 1.0 + butter(noise(d) * expdec(d, 0.05), "low", 1200, 2) * 0.4
    x += 0.4 * butter(saw(36.7, d), "low", 300, 2) * expdec(d, 1.2)
    return reverb(st(normalize(x)), 3.5, 0.35, bright=0.3)


def sfx_sub_drop():
    d = 2.5
    f = np.geomspace(90, 24, secs(d))
    return st(sine(f, d) * env_adsr(secs(d), 0.02, 0.2, 0.9, 1.0))


def sfx_low_drone_swell():
    d = 6.0
    x = sum(butter(saw(f, d), "low", 220, 2) for f in (41.2, 43.65, 55.0))
    x *= np.interp(t_(d), [0, 4.5, 5.6, 6], [0, 1, 0.8, 0]) ** 2
    hi = sine(1760 + 9 * sine(0.3, d), d) * 0.02 * np.interp(t_(d), [0, 5, 6], [0, 1, 0])
    return reverb(st(normalize(x) + hi), 3.0, 0.3, bright=0.2)


def sfx_fluoro_buzz():
    d = 5.0
    t = t_(d)
    x = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.2 + sine(240, d) * 0.3 + sine(360, d) * 0.1
    x = butter(x, "band", [100, 3000], 2) * (0.7 + 0.3 * (R.random(len(t)) > 0.002))
    return st(fade(x * 0.5, 0.5, 0.8), 0.3)


def sfx_electric_flicker():
    d = 1.8
    t = t_(d)
    buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.35
    gate = np.repeat(R.random(int(d * 40)) > 0.45, secs(1 / 40))[: len(t)]
    crackle = (R.random(len(t)) > 0.996) * R.standard_normal(len(t)) * 0.9
    x = butter(buzz * gate, "band", [100, 4000], 2) + butter(crackle, "high", 1500, 2)
    return reverb(st(fade(x, 0.005, 0.2)), 0.8, 0.2)


def sfx_glitch():
    d = 1.2
    x = np.zeros(secs(d), np.float32)
    pos = 0.0
    while pos < d - 0.05:
        L = R.uniform(0.02, 0.09)
        f = R.choice([220, 440, 880, 1760, 3520]) * R.uniform(0.9, 1.1)
        seg = np.sign(sine(f, L)) * 0.3 if R.random() < 0.5 else noise(L) * 0.4
        add(x, seg, pos)
        pos += L + R.uniform(0, 0.04)
    return st(butter(x, "band", [150, 7000], 2))


def sfx_phone_ring():
    d = 6.0
    x = np.zeros(secs(d), np.float32)
    ring = metal(bell_partials(1050), 1.8, tau=0.4) * (0.5 + 0.5 * np.sign(sine(20, 1.8)))
    ring += metal(bell_partials(1180), 1.8, tau=0.4) * 0.6 * (0.5 - 0.5 * np.sign(sine(20, 1.8)))
    ring *= env_adsr(len(ring), 0.005, 0.05, 1, 0.15)
    add(x, ring, 0.0)
    add(x, ring, 3.6)
    return reverb(st(normalize(x)), 0.7, 0.18)


def sfx_phone_pickup():
    d = 0.6
    x = np.zeros(secs(d), np.float32)
    add(x, click(0.04, 600) * 0.8, 0)
    add(x, butter(noise(0.15) * expdec(0.15, 0.03), "band", [300, 3000], 2) * 0.5, 0.08)
    add(x, thump(180, 0.12, 0.3) * 0.4, 0.05)
    return st(x)


def sfx_phone_hangup():
    d = 0.5
    x = np.zeros(secs(d), np.float32)
    add(x, thump(140, 0.2, 0.3) * 0.7 + click(0.2, 800)[: secs(0.2)] * 0.5, 0)
    add(x, click(0.03, 1500) * 0.5, 0.12)
    return st(x)


def sfx_line_dead():
    d = 3.2
    x = np.zeros(secs(d), np.float32)
    add(x, click(0.03, 1000) * 0.6, 0)
    tone = (sine(480, 0.45) + sine(620, 0.45)) * 0.15 * env_adsr(secs(0.45), 0.005, 0.02, 1, 0.02)
    for k in range(3):
        add(x, tone, 0.4 + k * 0.9)
    x = butter(x, "band", [300, 3400], 4)
    return st(x, 0.1)


def sfx_clock_tick():
    d = 6.0
    x = np.zeros(secs(d), np.float32)
    for k in range(6):
        add(x, click(0.03, 2500) * (0.6 if k % 2 else 0.45) + metal([3100, 4700], 0.03, 0.01) * 0.3, k * 1.0)
    return reverb(st(x), 0.6, 0.2)


def footsteps(n, interval, heel_db=0.0, d_extra=1.0, run=False):
    d = n * interval + d_extra
    x = np.zeros(secs(d), np.float32)
    for k in range(n):
        g = 10 ** (heel_db / 20) * R.uniform(0.8, 1.0)
        step = butter(noise(0.12) * expdec(0.12, 0.018), "band", [300, 2500 if not run else 3500], 2) * 0.8
        step = step + thump(90, 0.12, 0.3) * 0.5
        add(x, step * g, k * interval + R.uniform(-0.02, 0.02))
    return x


def sfx_footsteps_walk():
    return reverb(st(footsteps(8, 0.56)), 1.6, 0.3, bright=0.4)


def sfx_footsteps_run():
    return reverb(st(footsteps(14, 0.29, run=True) * 1.2), 1.4, 0.25, bright=0.4)


def ding(notes=(1318.5, 1046.5), detune=False):
    d = 3.0
    x = np.zeros(secs(d), np.float32)
    for i, f in enumerate(notes):
        L = 2.2
        if detune:
            ff = f * (1 - 0.06 * t_(L) / L) * (1 + 0.006 * sine(5, L))
            tone = sine(ff, L) + 0.3 * sine(ff * 2.01, L)
        else:
            tone = sine(f, L) + 0.3 * sine(f * 2.0, L) + 0.1 * sine(f * 3.0, L)
        add(x, tone * expdec(L, 0.6) * 0.4, i * 0.45)
    return x


def sfx_elevator_ding():
    return reverb(st(ding()), 1.2, 0.25)


def sfx_elevator_ding_detuned():
    return reverb(st(ding(detune=True)), 2.5, 0.45, bright=0.3)


def sfx_button_press():
    x = pad_to(click(0.025, 1500), 0.05) * 0.8 + metal([2400, 3900], 0.05, 0.01) * 0.2
    return st(pad_to(x, 0.2))


def doors(d=2.4, heavy=1.0):
    x = butter(noise(d, "brown"), "low", 260, 2) * env_adsr(secs(d), 0.25, 0.3, 0.7, 0.5)
    x += butter(noise(d), "band", [1500, 3500], 2) * 0.03 * env_adsr(secs(d), 0.3, 0.2, 0.5, 0.5)
    out = pad_to(x, d + 1.0)
    add(out, thump(70, 0.6, 0.4) * 0.8 * heavy + metal([310, 520, 870], 0.6, 0.15) * 0.3 * heavy, d - 0.05)
    return out


def sfx_elevator_doors():
    return reverb(st(normalize(doors(2.2))), 1.0, 0.2)


def sfx_elevator_doors_slow():
    return reverb(st(normalize(doors(4.2, 0.6))), 2.0, 0.35, bright=0.3)


def sfx_elevator_doors_shut():
    x = pad_to(thump(55, 1.2, 0.5) + metal([180, 290, 455, 730], 1.2, 0.3) * 0.5, 3.0)
    return reverb(st(normalize(x)), 2.8, 0.4, bright=0.3)


def sfx_elevator_motor_start():
    d = 4.5
    f = 48 + 30 * (1 - np.exp(-t_(d) / 1.0))
    x = sum(sine(f * k, d) / k for k in (1, 2, 3, 4)) * 0.5
    whine = sine(380 + 180 * (1 - np.exp(-t_(d) / 1.4)), d) * 0.05
    x = (x + whine) * env_adsr(secs(d), 0.4, 0.5, 0.8, 1.2)
    return reverb(st(normalize(x) * 0.8), 0.6, 0.15)


def sfx_elevator_jolt():
    d = 3.5
    x = thump(48, d, 0.5) * 1.0
    x += metal([143, 237, 389, 571, 830, 1190], d, 0.5) * 1.4
    x += butter(noise(d) * expdec(d, 0.08), "low", 2500, 2) * 0.7
    x += butter(noise(d, "brown") * expdec(d, 0.8), "low", 400, 2) * 0.3
    return reverb(st(normalize(x)), 1.4, 0.3, bright=0.3)


def creak(d, f0=700, rough=60, q=0.15):
    t = t_(d)
    am = np.abs(np.sin(2 * np.pi * np.cumsum(rough * (1 + 0.5 * np.sin(2 * np.pi * 0.7 * t))) / SR)) ** 6
    x = noise(d) * am
    f = f0 * (1 + q * np.sin(2 * np.pi * 0.35 * t))
    out = np.zeros_like(x)
    for lo in (0.9, 1.0, 1.1):  # crude moving resonance
        out += butter(x, "band", [f0 * lo * 0.9, f0 * lo * 1.12], 2)
    return out * env_adsr(len(out), 0.3, 0.2, 0.8, 0.6) + 0.2 * sine(f * 0.5, d) * am * 0.3


def sfx_cable_creak():
    return reverb(st(normalize(creak(3.0, 520, 45))), 1.5, 0.3, bright=0.3)


def sfx_elevator_stop():
    d = 3.0
    scr = creak(1.6, 1400, 120, 0.4) * 0.6
    x = pad_to(scr, d)
    add(x, thump(60, 1.0, 0.5) + metal([160, 260, 410], 1.0, 0.25) * 0.6, 1.4)
    return reverb(st(normalize(x)), 1.2, 0.25)


def sfx_wind_gust():
    d = 5.0
    x = noise(d, "pink")
    t = t_(d)
    c = 400 + 300 * np.sin(2 * np.pi * 0.2 * t)
    out = butter(x, "band", [250, 900], 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    out *= np.interp(t, [0, 1.5, 3.5, 5], [0, 1, 0.7, 0])
    return st(normalize(out) * 0.7, -0.2)


def sfx_wheelchair_creak():
    d = 3.0
    x = np.zeros(secs(d), np.float32)
    for k, at in enumerate((0.0, 0.9, 1.7)):
        L = 0.45
        f = 900 + 250 * np.sin(2 * np.pi * 2 * t_(L)) + 40 * R.standard_normal(secs(L)).cumsum() / 200
        s = sine(f, L) * env_adsr(secs(L), 0.05, 0.1, 0.6, 0.2) * (0.5 + 0.5 * (R.random(secs(L)) > 0.3))
        add(x, butter(s, "band", [500, 3000], 2) * 0.4, at)
    return reverb(st(x, 0.4), 1.8, 0.35)


def sfx_sign_chain():
    d = 2.5
    x = np.zeros(secs(d), np.float32)
    for k in range(9):
        at = R.uniform(0, 2.0)
        add(x, metal([R.uniform(2500, 4200), R.uniform(5000, 7000)], 0.3, 0.05) * 0.4, at)
    return reverb(st(x), 2.0, 0.35)


def sfx_wall_thud():
    x = pad_to(thump(80, 0.6, 0.4) + butter(noise(0.6) * expdec(0.6, 0.03), "low", 600, 2) * 0.6, 2.0)
    return reverb(st(normalize(x)), 1.5, 0.3, bright=0.3)


def sfx_flashlight_click():
    x = np.zeros(secs(0.5), np.float32)
    add(x, click(0.02, 2000), 0)
    add(x, click(0.02, 1500) * 0.6, 0.07)
    return st(x)


def sfx_breath_unison():
    d = 8.0
    x = np.zeros((secs(d), 2), np.float32)
    for pan, off in ((-0.6, 0.0), (0.0, 0.12), (0.6, 0.25)):
        b = butter(noise(d), "band", [400, 1800], 2)
        e = np.clip(np.sin(2 * np.pi * (t_(d) - off) / 4.0), 0, 1) ** 2
        x += stereo(b * e * 0.2, pan)
    return reverb(x, 2.0, 0.4, bright=0.3)


def sfx_bed_creak():
    d = 2.0
    x = np.zeros(secs(d), np.float32)
    for k in range(10):
        at = 0.1 + k * 0.12 + R.uniform(0, 0.04)
        f = 1100 + k * 25
        add(x, sine(f, 0.06) * expdec(0.06, 0.015) * 0.4 + pad_to(click(0.01, 1000), 0.06) * 0.2, at)
    x += creak(d, 600, 30) * 0.3
    return reverb(st(x), 1.8, 0.35, bright=0.35)


def grains(src_files, d, n, glen=(0.06, 0.16), pitch=(0.9, 1.1), rev_p=0.4):
    pool = [read_audio(f)[:, 0] for f in src_files]
    x = np.zeros((secs(d), 2), np.float32)
    for _ in range(n):
        p = pool[R.integers(len(pool))]
        L = secs(R.uniform(*glen))
        i = R.integers(0, max(1, len(p) - L))
        g = p[i:i + L].copy()
        if np.abs(g).max() < 0.02:
            continue
        if R.random() < rev_p:
            g = g[::-1]
        ps = R.uniform(*pitch)
        idx = np.arange(0, len(g) - 1, ps)
        g = np.interp(idx, np.arange(len(g)), g) * np.hanning(len(idx))
        add(x, stereo(g, R.uniform(-0.9, 0.9)), R.uniform(0, d - len(g) / SR))
    return x


def sfx_whisper_swirl():
    src = [VOICE / "_source/patient_1.mp3", VOICE / "_source/patients_2_and_1.mp3"]
    x = grains(src, 6.0, 70)
    x = butter(x, "high", 700, 2) * np.interp(t_(6.0), [0, 2, 4, 6], [0, 1, 0.8, 0])[:, None]
    return reverb(normalize(x) * 0.8, 2.8, 0.5, bright=0.4)


def sfx_child_laugh():
    """Placeholder 'distant child laugh': syllable grains of the little-girl recording, pitched up."""
    src = read_audio(VOICE / "_source/little_girl.mp3")[:, 0]
    env = np.convolve(np.abs(src), np.ones(secs(0.03)) / secs(0.03), "same")
    peaks = np.nonzero(env > env.max() * 0.5)[0]
    d = 2.6
    x = np.zeros(secs(d), np.float32)
    for k in range(5):
        c = peaks[R.integers(len(peaks))]
        g = src[c: c + secs(0.11)]
        idx = np.arange(0, len(g) - 1, 1.35 - k * 0.03)
        g = np.interp(idx, np.arange(len(g)), g) * np.hanning(len(idx)) * (1 - k * 0.15)
        add(x, g, 0.1 + k * 0.17)
    x = butter(x, "high", 300, 2)
    return reverb(delay(st(normalize(x) * 0.6), 0.21, 0.4, 0.3, 4), 3.0, 0.55, bright=0.4)


def heartbeat(bpm, d):
    x = np.zeros(secs(d), np.float32)
    beat = 60 / bpm
    k = 0
    while k * beat < d - 0.5:
        add(x, thump(55, 0.25, 0.4) * 0.9, k * beat)
        add(x, thump(50, 0.22, 0.4) * 0.6, k * beat + beat * 0.32)
        k += 1
    return st(butter(x, "low", 200, 2))


def sfx_heartbeat_slow():
    return heartbeat(58, 9.0)


def sfx_heartbeat_fast():
    return heartbeat(118, 7.0)


def sfx_door_creak():
    d = 2.8
    f = 220 + 160 * np.sin(2 * np.pi * 0.25 * t_(d)) + 30 * np.sin(2 * np.pi * 7 * t_(d))
    x = saw(1, d, 1) * 0
    x = sine(f, d) + 0.5 * sine(f * 2.03, d) + 0.25 * sine(f * 3.1, d)
    stick = (R.random(secs(d)) > 0.6).astype(np.float32)
    stick = np.convolve(stick, np.ones(200) / 200, "same")
    x = butter(x * stick, "band", [200, 3000], 2) * env_adsr(secs(d), 0.2, 0.3, 0.8, 0.6)
    return reverb(st(normalize(x) * 0.8), 1.6, 0.35)


def sfx_door_slam():
    x = pad_to(thump(65, 0.8, 0.5) * 1.2 + butter(noise(0.8) * expdec(0.8, 0.05), "low", 1800, 2) * 0.8
               + metal([420, 690, 1130], 0.8, 0.12) * 0.3, 2.5)
    return reverb(st(normalize(x)), 1.6, 0.3)


def paper(d=0.5):
    x = noise(d) * (R.random(secs(d)) > 0.7) * env_adsr(secs(d), 0.05, 0.1, 0.7, 0.2)
    return butter(x, "high", 2500, 2) * 0.5 + butter(noise(d), "band", [400, 1500], 2) * 0.1 * env_adsr(secs(d), 0.05, 0.1, 0.7, 0.2)


def sfx_paper_turn():
    return reverb(st(pad_to(paper(0.55), 1.2)), 0.7, 0.15)


def sfx_pages_flutter():
    d = 3.6
    x = np.zeros(secs(d), np.float32)
    at = 0.0
    k = 0
    while at < 2.8:
        add(x, paper(0.18) * (0.6 + 0.4 * R.random()), at)
        at += 0.28 * (0.82 ** k) + 0.05
        k += 1
    add(x, paper(0.5) * 0.9, 3.0)
    return reverb(st(x), 1.0, 0.2)


def sfx_pen_scratch():
    d = 7.0
    x = np.zeros(secs(d), np.float32)
    at = 0.0
    while at < d - 0.5:
        L = R.uniform(0.15, 0.5)
        s = butter(noise(L), "band", [2500, 7000], 2) * (0.6 + 0.4 * np.sin(2 * np.pi * R.uniform(6, 14) * t_(L)))
        add(x, s * env_adsr(secs(L), 0.02, 0.05, 0.8, 0.05) * 0.25, at)
        at += L + R.uniform(0.05, 0.3)
    return reverb(st(x), 1.2, 0.3)


def sfx_power_down():
    d = 3.0
    f = np.geomspace(120, 18, secs(d))
    x = (np.sign(sine(f, d)) * 0.3 + sine(f * 2, d) * 0.3) * np.interp(t_(d), [0, 0.1, 2.5, 3], [0, 1, 0.4, 0])
    x = butter(x, "low", 1500, 2)
    add(x, click(0.05, 600) * 1.2, 0.0)
    return reverb(st(normalize(x)), 2.2, 0.35, bright=0.3)


def sfx_hospital_bell():
    d = 7.0
    x = np.zeros(secs(d), np.float32)
    ring = np.zeros(secs(2.2), np.float32)
    for k in range(int(2.0 * 22)):
        add(ring, metal(bell_partials(880), 0.4, 0.15) * 0.25, k / 22)
    add(x, ring, 0.0)
    add(x, ring * 0.8, 3.0)
    x = butter(x, "band", [400, 6000], 2)
    return reverb(st(normalize(x) * 0.7, -0.3), 3.5, 0.6, predelay=0.05, bright=0.35)


def sfx_pa_chime():
    x = np.zeros(secs(2.5), np.float32)
    for i, f in enumerate((783.99, 659.25, 523.25)):
        add(x, (sine(f, 1.4) + 0.2 * sine(2 * f, 1.4)) * expdec(1.4, 0.5) * 0.35, i * 0.35)
    x = butter(x, "band", [400, 4000], 2)
    return reverb(st(x), 2.5, 0.45, predelay=0.05)


def sfx_static_burst():
    d = 1.4
    x = butter(noise(d), "band", [600, 6000], 2) * 0.4 * env_adsr(secs(d), 0.01, 0.2, 0.6, 0.6)
    x += (R.random(secs(d)) > 0.995) * R.standard_normal(secs(d)) * 0.7
    return st(x.astype(np.float32))


def sfx_keyboard():
    d = 3.0
    x = np.zeros(secs(d), np.float32)
    at = 0.0
    while at < 2.4:
        add(x, click(0.03, 1200) * R.uniform(0.3, 0.6) + thump(300, 0.03, 0.2) * 0.2, at)
        at += R.uniform(0.07, 0.22)
    return reverb(st(x), 0.6, 0.15)


SFX = {k[4:]: v for k, v in dict(globals()).items() if k.startswith("sfx_")}


# =============================================================================== ambience beds
def amb_loop(d, kind):
    t = t_(d)
    if kind == "rain_exterior":
        x = butter(noise(d, "pink"), "band", [400, 8000], 2) * 0.35
        drops = (R.random(secs(d)) > 0.9985) * R.standard_normal(secs(d))
        x += butter(drops.astype(np.float32), "high", 2500, 2) * 0.4
        x += butter(noise(d, "brown"), "low", 120, 2) * 0.25
        return reverb(np.stack([x, np.roll(x, secs(0.37))], 1), 1.0, 0.2)
    if kind == "hospital_night":
        hum = sine(60, d) * 0.08 + sine(120, d) * 0.05 + sine(180, d) * 0.02
        air = butter(noise(d, "pink"), "low", 900, 2) * 0.18
        buzz = butter(np.sign(sine(120, d)), "band", [800, 3000], 2) * 0.006
        x = hum + air + buzz
        return np.stack([x, butter(noise(d, "pink"), "low", 900, 2) * 0.18 + hum + buzz], 1)
    if kind == "elevator":
        hum = sum(sine(55 * k, d) / k for k in (1, 2, 3)) * 0.1
        whir = butter(noise(d), "band", [180, 600], 2) * 0.08 * (1 + 0.2 * sine(0.5, d))
        ticks = np.zeros(secs(d), np.float32)
        for k in range(int(d / 2.3)):
            add(ticks, click(0.02, 800) * 0.15, k * 2.3 + R.uniform(0, 0.5))
        return st(hum + whir + ticks)
    if kind in ("ward13", "ward_room"):
        wind = butter(noise(d, "pink"), "band", [200, 700], 2) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 11)) * 0.25
        drone = (sine(36.7, d) + 0.5 * sine(55.1, d)) * 0.07 * (0.7 + 0.3 * np.sin(2 * np.pi * t / 17))
        buzz = butter(np.sign(sine(120, d)), "band", [600, 2500], 2) * 0.008 * (R.random(secs(d)) > 0.001)
        drips = np.zeros(secs(d), np.float32)
        for k in range(int(d / 4)):
            add(drips, sine(1700 + R.uniform(-200, 200), 0.08) * expdec(0.08, 0.02) * 0.08, R.uniform(0, d - 0.1))
        x = np.stack([wind + drone + buzz + drips, np.roll(wind, secs(0.6)) + drone + buzz], 1)
        if kind == "ward_room":
            x = x * 0.8 + sfx_breath_tile(d) * 0.4
        return reverb(x, 2.0, 0.25, bright=0.3)
    if kind == "records":
        tone = butter(noise(d, "pink"), "low", 500, 2) * 0.12 + sine(50, d) * 0.03
        ticks = np.zeros(secs(d), np.float32)
        for k in range(int(d)):
            add(ticks, click(0.02, 3000) * 0.05, k + 0.0)
        return reverb(st(tone + ticks), 1.0, 0.25)
    if kind == "dark":
        x = (sine(30.9, d) + 0.6 * sine(46.2, d)) * 0.08 + butter(noise(d, "pink"), "low", 300, 2) * 0.05
        return st(x)
    if kind == "lobby_morning":
        src = [VOICE / "_source" / f for f in ("narrator.mp3", "nurse.mp3", "john.mp3", "old_doctor.mp3")]
        walla = grains(src, d, int(d * 9), glen=(0.25, 0.6), pitch=(0.85, 1.15), rev_p=0.5)
        walla = butter(walla, "band", [200, 1400], 2)
        walla = reverb(normalize(walla) * 0.12, 1.8, 0.6, bright=0.4)[: secs(d)]
        room = butter(noise(d, "pink"), "band", [80, 3000], 2) * 0.08
        steps = reverb(st(footsteps(int(d / 3), 2.7) * 0.15), 1.5, 0.5)[: secs(d)]
        return walla + st(room) + pad_to(steps, d)
    if kind == "cctv":
        x = sine(60, d) * 0.06 + sine(120, d) * 0.03 + butter(noise(d), "high", 3000, 2) * 0.025
        return st(x)
    raise ValueError(kind)


def sfx_breath_tile(d):
    x = np.zeros((secs(d), 2), np.float32)
    b = sfx_breath_unison()
    for k in range(0, int(d / 8) + 1):
        add(x, b, k * 8.0)
    return x


# =============================================================================== music
def piano(f, d=4.0, vel=0.6):
    t = t_(d)
    x = np.zeros_like(t)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        x += np.sin(2 * np.pi * fk * t) * np.exp(-t * (0.8 + k * 0.6)) / k ** 1.1
    x += butter(noise(d) * expdec(d, 0.006), "band", [f, min(f * 8, 9000)], 2) * 0.3
    return (x * vel * 0.4).astype(np.float32)


def strings(freqs, d, cutoff=1800, vib=5.0):
    t = t_(d)
    x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.005):
            ff = f * (1 + det) * (1 + 0.003 * np.sin(2 * np.pi * vib * t + R.random() * 6))
            ph = 2 * np.pi * np.cumsum(ff) / SR
            for k in range(1, 12):
                if f * k > 6000:
                    break
                x += np.sin(k * ph) / k
    x = butter(x / (len(freqs) * 3), "low", cutoff, 2)
    return x.astype(np.float32)


def music_box(f, d=2.5):
    t = t_(d)
    wow = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * t)
    x = np.sin(2 * np.pi * np.cumsum(f * wow) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 4.02 * wow) / SR) * np.exp(-t * 6)
    return (x * np.exp(-t * 1.6) * 0.3).astype(np.float32)


def drone(d, root=55.0, cutoff=260, level=0.5):
    x = butter(saw(root, d) + saw(root * 1.498, d) * 0.5 + saw(root * 0.5, d) * 0.6, "low", cutoff, 2)
    x *= 0.8 + 0.2 * np.sin(2 * np.pi * t_(d) / 13)
    return x * level


A = 440.0
N = {n: A * 2 ** ((i - 9) / 12) for i, n in enumerate("C Db D Eb E F Gb G Ab A Bb B".split())}


def note(name, octave):
    return N[name] * 2 ** (octave - 4)


def music(cue, d):
    """Return a stereo music bed of length d seconds for the named cue."""
    d = max(d, 1.0)
    t = t_(d)
    x = np.zeros((secs(d), 2), np.float32)
    if cue == "opening":
        x += st(drone(d, 55.0, 200, 0.35))
        seq = [("A", 3), ("E", 4), ("C", 4), ("Bb", 3), ("A", 3), ("F", 3), ("E", 4), ("Eb", 4)]
        for i, at in enumerate(np.arange(2.0, d - 2, 4.3)):
            nm, o = seq[i % len(seq)]
            add(x, stereo(piano(note(nm, o), 5.0, 0.55), R.uniform(-0.4, 0.4)), at)
        x += st(strings([note("A", 5), note("Bb", 5)], d, 2500) * 0.05 * np.clip(t / 30, 0, 1))
        return reverb(x, 3.5, 0.45, bright=0.4)[: secs(d)]
    if cue == "tension":
        x += st(drone(d, 41.2, 220, 0.4))
        sw = strings([note("E", 4), note("F", 4), note("B", 4)], d, 1200) * np.clip(t / d, 0, 1) ** 1.5 * 0.5
        x += st(sw)
        return reverb(x, 2.5, 0.35)[: secs(d)]
    if cue == "ward":
        x += st(strings([note("C", 3), note("Db", 3), note("G", 3)], d, 900) * 0.35 * (0.85 + 0.15 * np.sin(2 * np.pi * 5.5 * t)))
        for at in np.arange(3.0, d - 3, 9.0):
            add(x, st(piano(note("D", 1), 6.0, 0.9)), at)
        return reverb(x, 3.0, 0.4, bright=0.3)[: secs(d)]
    if cue == "girl":
        mel = [("E", 6), ("G", 6), ("B", 6), ("A", 6), ("G", 6), ("E", 6), ("Gb", 6), ("Eb", 6),
               ("E", 6), ("B", 5), ("C", 6), ("B", 5)]
        for i, at in enumerate(np.arange(0.5, d - 1, 0.85)):
            nm, o = mel[i % len(mel)]
            detune = 1 + 0.012 * np.sin(i * 1.3)
            add(x, stereo(music_box(note(nm, o) * detune), 0.3 * np.sin(i)), at)
        x += st(drone(d, 82.4, 300, 0.12))
        return reverb(x, 3.2, 0.5, bright=0.5)[: secs(d)]
    if cue == "record":
        x += st(drone(d, 36.7, 180, 0.4))
        pulse = np.zeros(secs(d), np.float32)
        for at in np.arange(0, d, 1.1):
            add(pulse, thump(45, 0.6, 0.3) * 0.5, at)
        x += st(pulse)
        x += st(strings([note("D", 4), note("Eb", 4), note("A", 4)], d, 1500) * 0.35 * np.clip(t / d, 0, 1) ** 2)
        return reverb(x, 2.5, 0.35)[: secs(d)]
    if cue == "doctor":
        x += st(butter(saw(65.4, d) + saw(65.4 * 1.06, d) * 0.4, "low", 300, 2) * 0.35)
        x += st(sine(1046.5 * (1 + 0.004 * np.sin(2 * np.pi * 0.2 * t)), d) * 0.025)
        for at in np.arange(4.0, d - 3, 11.0):
            add(x, stereo(piano(note("Gb", 2), 6.0, 0.7), -0.3), at)
        return reverb(x, 3.5, 0.45, bright=0.3)[: secs(d)]
    if cue in ("chase", "escape"):
        bpm = 132 if cue == "chase" else 148
        step = 60 / bpm / 2
        osc = np.zeros(secs(d), np.float32)
        for k, at in enumerate(np.arange(0, d, step)):
            f = note("D", 2) if k % 8 not in (6, 7) else note("Eb", 2)
            add(osc, butter(saw(f, step * 0.9), "low", 600, 2) * env_adsr(secs(step * 0.9), 0.005, 0.05, 0.6, 0.05) * 0.5, at)
        x += st(osc)
        hb = heartbeat(bpm / 2, d)
        x += pad_to(hb, d) * 0.5
        x += st(strings([note("D", 5), note("Eb", 5), note("A", 5)], d, 2500) * 0.25 * np.clip(t / d, 0, 1))
        return reverb(x, 1.6, 0.25)[: secs(d)]
    if cue == "relief":
        x += st(strings([note("F", 3), note("C", 4), note("G", 4), note("A", 4)], d, 1600) * 0.35)
        x *= np.interp(t, [0, 3, d - 3, d], [0, 1, 0.8, 0])[:, None]
        for at, (nm, o) in zip(np.arange(1.5, d - 2, 3.0), [("A", 4), ("C", 5), ("G", 4), ("F", 4)]):
            add(x, st(piano(note(nm, o), 4.0, 0.4)), at)
        return reverb(x, 3.0, 0.4, bright=0.6)[: secs(d)]
    if cue == "twist":
        x += st(drone(d, 49.0, 200, 0.35) * np.clip(t / 6, 0, 1))
        seq = [("G", 4), ("Gb", 4), ("E", 4), ("Eb", 4), ("D", 4)]
        for i, at in enumerate(np.arange(1.0, d - 2, 3.4)):
            nm, o = seq[i % len(seq)]
            add(x, st(piano(note(nm, o), 5.0, 0.5)), at)
        return reverb(x, 3.5, 0.45)[: secs(d)]
    if cue == "final":
        x += st(drone(d, 41.2, 200, 0.4))
        for i, at in enumerate(np.arange(2.0, d - 3, 6.0)):
            nm = ["E", "F", "B", "Bb"][i % 4]
            add(x, stereo(piano(note(nm, 3), 6.0, 0.55), R.uniform(-0.5, 0.5)), at)
        hi = strings([note("E", 6), note("F", 6)], d, 4000) * 0.06 * np.clip(t / d, 0, 1) ** 2
        x += st(hi)
        x *= np.interp(t, [0, d - 6, d - 1.5, d], [1, 1.4, 1.6, 0])[:, None]
        return reverb(x, 4.0, 0.5, bright=0.35)[: secs(d)]
    raise ValueError(cue)


AMBIENCES = ["rain_exterior", "hospital_night", "elevator", "ward13", "ward_room", "records", "dark",
             "lobby_morning", "cctv"]
MUSIC_CUES = ["opening", "tension", "ward", "girl", "record", "doctor", "chase", "escape", "relief", "twist", "final"]
