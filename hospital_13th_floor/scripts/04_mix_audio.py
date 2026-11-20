#!/usr/bin/env python3
"""Step 6b — Mix the soundtrack from editing/timeline.json.

Stems (editing/stems/):  dialogue.wav  sfx.wav  ambience.wav  music.wav
Mix:                     editing/mix_stereo.wav  (loudness-normalized to -16 LUFS, -1.5 dBTP)
Music cues are rendered at their exact on-screen length into music/ (M##_<cue>.wav).
Overrides: sound_effects/overrides/<id>.wav, sound_effects/overrides/ambience/<id>.wav,
           music/overrides/<cue>.wav (looped/trimmed to length) win over the procedural versions.
"""
import subprocess

import numpy as np

from common import (EDIT, ROOT, SFX, MUSIC, SR, load_json, read_wav, write_wav, place, secs, loop_to,
                    fade, butter)
import soundgen as sg

LEVELS_DB = {"dialogue": 0.0, "sfx": -3.0, "ambience": -15.0, "music": -11.0}
NARR_DB = -1.0
DUCK = {"music": -9.0, "ambience": -5.0}   # attenuation under dialogue
XF = 1.5                                   # ambience / music crossfade seconds


def db(x):
    return 10 ** (x / 20)


def sfx_clip(name):
    o = SFX / "overrides" / f"{name}.wav"
    return read_wav(o if o.exists() else SFX / f"{name}.wav")


def amb_clip(name):
    o = SFX / "overrides" / "ambience" / f"{name}.wav"
    return read_wav(o if o.exists() else SFX / "ambience" / f"{name}.wav")


def segments(shots, key):
    """[(name, start, end)] spans for ambience/music, switching where a shot sets the key."""
    segs, cur, start = [], None, 0.0
    for s in shots:
        v = s.get(key)
        if v is None:
            continue
        if cur not in (None, "none"):
            segs.append((cur, start, s["start"]))
        cur, start = v, s["start"]
    if cur not in (None, "none"):
        segs.append((cur, start, shots[-1]["end"]))
    return segs


def main():
    tl = load_json(EDIT / "timeline.json")
    shots = tl["shots"]
    total = tl["total_seconds"]
    n = secs(total) + secs(2)
    bus = {k: np.zeros((n, 2), np.float32) for k in LEVELS_DB}

    # dialogue + narration
    for s in shots:
        for e in s["events"]:
            clip = read_wav(ROOT / e["file"])
            g = db(NARR_DB) if e["type"] == "narration" else 1.0
            place(bus["dialogue"], clip, s["start"] + e["start"], g)
        for x in s["sfx"]:
            place(bus["sfx"], sfx_clip(x["id"]), s["start"] + x["at"], db(x["gain_db"]))

    # ambience beds
    for name, a, b in segments(shots, "amb"):
        L = secs(b - a + XF)
        clip = fade(loop_to(amb_clip(name), L), XF, XF)
        place(bus["ambience"], clip, max(0, a - XF / 2))

    # music cues, rendered to exact length
    MUSIC.mkdir(exist_ok=True)
    for i, (cue, a, b) in enumerate(segments(shots, "mus"), 1):
        d = b - a + 2.5
        o = MUSIC / "overrides" / f"{cue}.wav"
        m = loop_to(read_wav(o), secs(d)) if o.exists() else sg.music(cue, d)
        m = fade(m / (np.abs(m).max() + 1e-9) * 0.8, 1.0, 2.5)
        write_wav(MUSIC / f"M{i:02d}_{cue}.wav", m)
        place(bus["music"], m, a)
        print(f"music M{i:02d} {cue:8s} {a:7.2f}-{b:7.2f}s")

    # ducking: follow the dialogue envelope
    env = np.abs(bus["dialogue"]).max(1)
    win = secs(0.25)
    env = np.convolve(env, np.ones(win) / win, "same")
    on = (env > 0.01).astype(np.float32)
    att = np.convolve(on, np.ones(secs(0.4)) / secs(0.4), "same")  # smooth attack/release
    for k, dB in DUCK.items():
        bus[k] *= (1 - att * (1 - db(dB)))[:, None]

    stems = EDIT / "stems"
    for k, x in bus.items():
        bus[k] = x * db(LEVELS_DB[k])
        write_wav(stems / f"{k}.wav", bus[k][: secs(total)])
    mix = sum(bus.values())[: secs(total)]
    mix = butter(mix, "high", 25, 2)
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix = np.tanh(mix / peak * 1.2) / np.tanh(1.2) * 0.98
    raw = EDIT / "mix_premaster.wav"
    write_wav(raw, mix)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "loudnorm=I=-16:TP=-1.5:LRA=14", "-ar", str(SR), "-ac", "2",
                    str(EDIT / "mix_stereo.wav")], check=True)
    print(f"mix written: {EDIT / 'mix_stereo.wav'}  ({total:.1f}s)")


if __name__ == "__main__":
    main()
