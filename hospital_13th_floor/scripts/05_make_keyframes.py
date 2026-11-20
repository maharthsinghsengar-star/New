#!/usr/bin/env python3
"""Step 3 (animatic stand-in) — Render placeholder keyframes for every shot.

  scene_images/placeholder/<SHOT>.jpg        main keyframe (graded)
  scene_images/placeholder/<SHOT>_b.jpg      second keyframe for crossfade shots (kf2)
  scene_images/placeholder/<SHOT>_seq<N>.jpg indicator states for display shots
  characters/refs/<crop>.png                 character reference crops from the key art
  editing/contact_sheet.jpg                  all keyframes on one page for review

Real AI keyframes go in scene_images/generated/<SHOT>.png and always take priority in the renderer.
Usage: python3 05_make_keyframes.py [--only S001,S017]
"""
import argparse
from concurrent.futures import ProcessPoolExecutor

from PIL import Image, ImageDraw, ImageFont

from common import SCENES, CHARS, EDIT, load_yaml
import envgen

OUT = SCENES / "placeholder"


def build(s):
    OUT.mkdir(parents=True, exist_ok=True)
    g = s.get("grade", "night")
    kf = s["kf"]
    files = []
    if kf.get("env") == "display":
        for i, (_, text) in enumerate(kf["seq"]):
            im = envgen.display_closeup(text, kf.get("red", False), kf.get("down", False))
            p = OUT / f"{s['id']}_seq{i}.jpg"
            envgen.grade(im, g).save(p, quality=90)
            files.append(p.name)
        Image.open(OUT / f"{s['id']}_seq0.jpg").save(OUT / f"{s['id']}.jpg", quality=90)
    else:
        envgen.grade(envgen.render_kf(kf), g).save(OUT / f"{s['id']}.jpg", quality=90)
    if "kf2" in s:
        envgen.grade(envgen.render_kf(s["kf2"]), g).save(OUT / f"{s['id']}_b.jpg", quality=90)
    return s["id"], files


def contact_sheet(shots):
    cols, tw, th = 8, 320, 180
    rows = (len(shots) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 22)), (10, 10, 10))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype(envgen.F_SANS, 14)
    for i, s in enumerate(shots):
        im = Image.open(OUT / f"{s['id']}.jpg").resize((tw, th))
        x, y = (i % cols) * tw, (i // cols) * (th + 22)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + th + 3), f"{s['id']}  ch{s['ch']}  {s['loc'][:28]}", font=f, fill=(200, 200, 200))
    sheet.save(EDIT / "contact_sheet.jpg", quality=85)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    a = ap.parse_args()
    shots = load_yaml("shots.yaml")["shots"]
    todo = [s for s in shots if not a.only or s["id"] in a.only.split(",")]

    refs = CHARS / "refs"
    refs.mkdir(parents=True, exist_ok=True)
    ka = Image.open(CHARS / "key_art_master.png").convert("RGB")
    for name, box in load_yaml("characters.yaml")["key_art_crops"].items():
        ka.crop(tuple(box)).save(refs / f"{name}.png")

    with ProcessPoolExecutor(4) as ex:
        for sid, _ in ex.map(build, todo):
            print("keyframe", sid)
    EDIT.mkdir(exist_ok=True)
    contact_sheet(shots)
    print("contact sheet:", EDIT / "contact_sheet.jpg")


if __name__ == "__main__":
    main()
