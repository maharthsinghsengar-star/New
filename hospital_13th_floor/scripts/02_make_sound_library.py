#!/usr/bin/env python3
"""Step 6a — Build the procedural sound library.

  sound_effects/<id>.wav            every one-shot SFX referenced by shots.yaml
  sound_effects/ambience/<id>.wav   90-second ambience beds (the mixer loops them)

To replace any sound with a recorded/licensed one, put a WAV with the same id in
sound_effects/overrides/ (or sound_effects/overrides/ambience/) — the mixer prefers overrides.
Usage: python3 02_make_sound_library.py [--only id1,id2]
"""
import argparse

from common import SFX as SFX_DIR, load_yaml, write_wav, normalize, fade, crossfade_loop
import soundgen as sg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None

    shots = load_yaml("shots.yaml")["shots"]
    needed = sorted({x[0] for s in shots for x in s.get("sfx", [])})
    missing = [n for n in needed if n not in sg.SFX]
    if missing:
        raise SystemExit(f"no generator for SFX: {missing}")
    for name in needed:
        if only and name not in only:
            continue
        x = fade(normalize(sg.SFX[name](), 0.89), 0.002, 0.05)
        write_wav(SFX_DIR / f"{name}.wav", x)
        print(f"sfx  {name:24s} {len(x) / 48000:5.2f}s")
    for name in sg.AMBIENCES:
        if only and name not in only:
            continue
        x = crossfade_loop(sg.amb_loop(93.0, name), 3.0)
        write_wav(SFX_DIR / "ambience" / f"{name}.wav", normalize(x, 0.7))
        print(f"amb  {name:24s} {len(x) / 48000:5.2f}s")


if __name__ == "__main__":
    main()
