#!/usr/bin/env python3
"""Step 5 — Dialogue: cut every cue in production/voice_cues.yaml out of the source recordings,
apply its character processing preset, and write voice/<character>/<CUE>.wav (48 kHz stereo).
Also exports one narrator clip per shot to voice/narrator/<SHOT>.wav.

Re-run any time; use --only J05,OD02 to regenerate single cues.
"""
import argparse
import subprocess
import tempfile

import numpy as np

from common import (VOICE, SR, load_yaml, read_audio, write_wav, reverb, delay, butter, stereo,
                    pitch_tempo, normalize, fade, secs, RNG, save_json, PROD)

SRC = VOICE / "_source"


# ----------------------------------------------------------------------------- FX presets
def fx_room(x, t60, wet, bright=0.5):
    return reverb(x, t60=t60, wet=wet, bright=bright)


def phone_band(x, lo=320, hi=3300, drive=3.0):
    y = butter(butter(x, "high", lo, 4), "low", hi, 4)
    return np.tanh(y * drive) / np.tanh(drive)


def static(n, level=0.02):
    s = RNG.standard_normal((n, 2)).astype(np.float32) * level
    crackle = (RNG.random((n, 1)) > 0.9993) * RNG.standard_normal((n, 1)) * 0.3
    return butter(s, "band", [800, 5000], 2) + crackle.astype(np.float32)


def p_john(c, x, place):
    return {"office": fx_room(x, 0.5, 0.12), "elevator": fx_room(x, 0.6, 0.18, 0.4), "ward": fx_room(x, 1.6, 0.25, 0.35),
            "lobby": fx_room(x, 0.9, 0.15, 0.6)}[place]


def p_old_doctor(c):
    # hollow, slightly lower and slower, dark long reverb
    x = pitch_tempo(SRC / c["src"], c["in"], c["out"], pitch=0.96, tempo=0.95)
    x = butter(x, "low", 6500, 2)
    return reverb(x, t60=2.2, wet=0.32, predelay=0.03, bright=0.25, seed=2)


def p_girl(c, ghost=False):
    x = pitch_tempo(SRC / c["src"], c["in"], c["out"], tempo=0.94)
    x = butter(x, "high", 180, 2)
    if ghost:  # disembodied whisper inside the elevator, circling L/R
        x = pitch_tempo(SRC / c["src"], c["in"], c["out"], pitch=1.03, tempo=0.8)
        x = butter(x, "high", 400, 2)
        n = len(x)
        pan = np.sin(np.linspace(0, 2.5 * np.pi, n))
        x = np.stack([x[:, 0] * (1 - pan) / 2, x[:, 1] * (1 + pan) / 2], 1) * 1.6
        x = delay(x, 0.18, 0.45, 0.35, 5)
        return reverb(x, t60=3.0, wet=0.55, predelay=0.04, bright=0.4, seed=5)
    x = delay(x, 0.32, 0.3, 0.12, 3)
    return reverb(x, t60=2.4, wet=0.35, predelay=0.02, bright=0.45, seed=3)


def chorus_layers(x_list, pitches=(0.93, 1.0, 1.06), delays=(0.0, 0.045, 0.09), pans=(-0.7, 0.0, 0.7)):
    outs = []
    for k, (p, d, pn) in enumerate(zip(pitches, delays, pans)):
        x = x_list[k % len(x_list)](p)
        x = stereo(x, pn)
        outs.append(np.pad(x, ((secs(d), 0), (0, 0))))
    n = max(len(o) for o in outs)
    y = sum(np.pad(o, ((0, n - len(o)), (0, 0))) for o in outs) / len(outs) * 1.4
    y = butter(y, "high", 220, 2)
    return reverb(y, t60=2.6, wet=0.4, predelay=0.02, bright=0.35, seed=7)


def tts(text, path, voice="en-us+whisper", speed=130, pitch=40):
    subprocess.run(["espeak-ng", "-v", voice, "-s", str(speed), "-p", str(pitch), "-w", str(path), text],
                   check=True)


def p_pa(c):
    with tempfile.TemporaryDirectory() as td:
        f = f"{td}/pa.wav"
        tts(c["tts"], f, voice="en-us+m3", speed=118, pitch=32)
        x = read_audio(f)
    x = butter(butter(x, "high", 450, 4), "low", 3800, 4)
    t = np.arange(len(x)) / SR
    x = x * (0.82 + 0.18 * np.sin(2 * np.pi * 42 * t))[:, None]   # light ring-mod "robotic" tone
    x = np.tanh(x * 2.5) / np.tanh(2.5)
    x = x + static(len(x), 0.006)
    return reverb(x, t60=2.8, wet=0.45, predelay=0.06, bright=0.5, seed=9)


def p_patients_tts(c):
    with tempfile.TemporaryDirectory() as td:
        layers = []
        for k, (v, p) in enumerate([("en-us+whisper", 30), ("en-us+whisperf", 45), ("en-us+whisper", 20)]):
            f = f"{td}/t{k}.wav"
            tts(c["tts"], f, voice=v, speed=105, pitch=p)
            layers.append(read_audio(f))
    return chorus_layers([lambda p, L=L: L for L in layers])


def process(cid, c):
    fx = c["fx"]
    if "tts" in c:
        if fx == "phone_tts":
            with tempfile.TemporaryDirectory() as td:
                tts(c["tts"], f"{td}/p.wav", voice="en-us+f3", speed=150, pitch=45)
                x = phone_band(read_audio(f"{td}/p.wav"), drive=4.0)
            x = x + static(len(x), 0.02)
            return stereo(butter(x, "low", 2400, 2) * 0.55, 0.35)
        return p_pa(c) if fx == "pa" else p_patients_tts(c)
    src = SRC / c["src"]
    raw = lambda: read_audio(src, c["in"], c["out"])
    if fx.startswith("john_"):
        return p_john(c, raw(), fx.split("_")[1])
    if fx == "old_doctor":
        return p_old_doctor(c)
    if fx == "little_girl":
        return p_girl(c)
    if fx == "girl_ghost_elevator":
        return p_girl(c, ghost=True)
    if fx == "patient_solo":
        x = pitch_tempo(src, c["in"], c["out"], tempo=0.9)
        x = butter(x, "high", 150, 2)
        return reverb(x, t60=1.9, wet=0.3, bright=0.3, seed=4)
    if fx == "patients_chorus":
        mk = lambda p: pitch_tempo(src, c["in"], c["out"], pitch=p, tempo=0.85)
        return chorus_layers([mk])
    if fx == "nurse_lobby":
        return reverb(raw(), t60=0.9, wet=0.14, bright=0.6, seed=6)
    if fx == "nurse_night_phone":
        return reverb(raw(), t60=0.7, wet=0.1, bright=0.5, seed=6)
    if fx == "woman_far_call":
        x = pitch_tempo(src, c["in"], c["out"], pitch=0.93, tempo=0.75)
        x = butter(butter(x, "high", 300, 2), "low", 3500, 2) * 0.6
        return reverb(x, t60=3.2, wet=0.7, predelay=0.08, bright=0.3, seed=8)
    if fx in ("phone", "phone_whisper", "phone_earpiece"):
        x = pitch_tempo(src, c["in"], c["out"], tempo=0.92 if fx == "phone_whisper" else 1.0)
        x = phone_band(x, drive=4.0 if fx != "phone_whisper" else 2.0)
        if fx == "phone_whisper":
            x = butter(x, "high", 600, 2)
        x = x + static(len(x), 0.035 if fx != "phone_earpiece" else 0.02)
        if fx == "phone_earpiece":  # heard leaking from John's handset
            x = butter(x, "low", 2400, 2) * 0.55
            x = stereo(x, 0.35)
        return x
    raise ValueError(f"unknown fx preset {fx} for {cid}")


def export_narration(shots):
    out = {}
    src = SRC / "narrator.mp3"
    for s in shots:
        segs = [e["narr"] for e in s.get("audio", []) if "narr" in e]
        for k, (a, b) in enumerate(segs):
            name = s["id"] if len(segs) == 1 else f"{s['id']}_{k + 1}"
            x = read_audio(src, max(0, a - 0.04), b + 0.12)
            x = reverb(x, t60=0.4, wet=0.04, bright=0.7)
            write_wav(VOICE / "narrator" / f"{name}.wav", fade(x, 0.02, 0.06))
            out[name] = [a, b]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma separated cue ids")
    ap.add_argument("--skip-narration", action="store_true")
    a = ap.parse_args()
    cues = load_yaml("voice_cues.yaml")["cues"]
    only = set(a.only.split(",")) if a.only else None
    report = {}
    for cid, c in cues.items():
        if only and cid not in only:
            continue
        x = fade(normalize(process(cid, c), 0.89), 0.01, 0.08)
        path = VOICE / c["char"] / f"{cid}.wav"
        write_wav(path, x)
        env = np.abs(x).max(1)
        loud = np.nonzero(env > 10 ** (-26 / 20))[0]
        speech = (loud[-1] + 1) / SR if len(loud) else len(x) / SR
        report[cid] = {"file": str(path.relative_to(VOICE.parent)), "seconds": round(len(x) / SR, 3),
                       "speech_seconds": round(speech, 3),
                       "placeholder": bool(c.get("placeholder")), "text": c["text"]}
        print(f"{cid:5s} {len(x) / SR:5.2f}s  {c['text']}")
    if not a.skip_narration and not only:
        shots = load_yaml("shots.yaml")["shots"]
        n = export_narration(shots)
        print(f"narration: {len(n)} clips")
    if not only:
        save_json(PROD / "voice_report.json", report)


if __name__ == "__main__":
    main()
