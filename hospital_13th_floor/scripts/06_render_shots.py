#!/usr/bin/env python3
"""Step 4 (animatic) — Render every shot to editing/rendered_shots/<SHOT>.mp4 (1920x1080, 24 fps).

Source priority per shot (first found wins):
  1. video_clips/generated/<SHOT>.mp4            AI image-to-video clip -> conformed to length/size
  2. scene_images/generated/<SHOT>.png|jpg        AI keyframe -> animated with the shot's camera move
     (+ <SHOT>_b.png for crossfade shots)
  3. scene_images/placeholder/<SHOT>.jpg          procedural previs plate

Camera moves, crossfades, light flicker, shake, blackout, CCTV look, film grain and vignette are
applied here so every source gets the same cinematic finish.
Usage: python3 06_render_shots.py [--only S001,S002] [--force] [--jobs 4]
"""
import argparse
import math
import subprocess
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image

from common import EDIT, SCENES, CLIPS, W, H, FPS, load_yaml, load_json

OUT = EDIT / "rendered_shots"
KW, KH = 2560, 1440

MOVES = {  # zoom start, zoom end, (x0, y0) -> (x1, y1) as fraction of frame
    "static": (1.00, 1.015, (0, 0), (0, 0)),
    "push_slow": (1.00, 1.08, (0, 0), (0, 0)),
    "push": (1.00, 1.18, (0, 0), (0, 0)),
    "dolly": (1.00, 1.28, (0, 0), (0, 0)),
    "pull": (1.16, 1.00, (0, 0), (0, 0)),
    "pan_l": (1.14, 1.14, (0.055, 0), (-0.055, 0)),
    "pan_r": (1.14, 1.14, (-0.055, 0), (0.055, 0)),
    "tilt_u": (1.14, 1.14, (0, 0.05), (0, -0.05)),
    "tilt_d": (1.14, 1.14, (0, -0.05), (0, 0.05)),
    "drift": (1.06, 1.10, (-0.015, 0.01), (0.015, -0.01)),
    "handheld": (1.06, 1.14, (0, 0), (0, 0)),
}


def ease(t):
    return t * t * (3 - 2 * t)


def find(base, exts):
    for e in exts:
        p = base.with_suffix(e)
        if p.exists():
            return p
    return None


def cover(img):
    img = img.convert("RGB")
    s = max(KW / img.width, KH / img.height)
    img = img.resize((math.ceil(img.width * s), math.ceil(img.height * s)), Image.LANCZOS)
    x, y = (img.width - KW) // 2, (img.height - KH) // 2
    return img.crop((x, y, x + KW, y + KH))


def vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    return (1 - 0.42 * np.clip(d - 0.35, 0, 1) ** 1.6)[..., None].astype(np.float32)


def smooth_noise(n, k, seed):
    r = np.random.default_rng(seed).standard_normal(n + k)
    return np.convolve(r, np.ones(k) / k, "same")[:n]


def flicker_curve(n, kind, seed):
    rng = np.random.default_rng(seed)
    b = np.ones(n, np.float32)
    if kind == "flicker":
        for i in range(n):
            if rng.random() < 0.06:
                L = rng.integers(1, 4)
                b[i:i + L] = rng.uniform(0.45, 0.8)
    elif kind == "flicker_hard":
        i = 0
        while i < n:
            L = int(rng.integers(1, 6))
            b[i:i + L] = rng.choice([1.0, 0.12, 0.6, 1.1], p=[0.45, 0.3, 0.15, 0.1])
            i += L
    elif kind == "blackout":
        cut = int(n * 0.35)
        for i in range(cut):
            if rng.random() < 0.25:
                b[i] = rng.uniform(0.1, 0.6)
        b[cut:] = 0.03
    return b


def render_stills(shot, tl, out):
    sid, n = shot["id"], tl["frames"]
    gen = find(SCENES / "generated" / sid, [".png", ".jpg", ".jpeg", ".webp"])
    src_kind = "generated_keyframe" if gen else "placeholder"
    a_img = cover(Image.open(gen)) if gen else Image.open(SCENES / "placeholder" / f"{sid}.jpg").convert("RGB")
    b_img = None
    if "kf2" in shot:
        gb = find(SCENES / "generated" / f"{sid}_b", [".png", ".jpg", ".jpeg", ".webp"])
        b_img = cover(Image.open(gb)) if gb else (None if gen else Image.open(SCENES / "placeholder" / f"{sid}_b.jpg").convert("RGB"))
    seq = []
    if shot["kf"].get("env") == "display" and not gen:
        seq = [(t, Image.open(SCENES / "placeholder" / f"{sid}_seq{i}.jpg").convert("RGB"))
               for i, (t, _) in enumerate(shot["kf"]["seq"])]

    move = shot.get("move", "push_slow")
    z0, z1, p0, p1 = MOVES.get(move, MOVES["push_slow"])
    fx = set(shot.get("fx", []))
    seed = sum(ord(c) * (k + 1) for k, c in enumerate(sid))
    shake = "shake" in fx or move == "handheld"
    amp = 14 if "shake" in fx else 6
    sx, sy = smooth_noise(n, 5, seed) * amp, smooth_noise(n, 5, seed + 1) * amp
    bright = np.ones(n, np.float32)
    for k in ("flicker", "flicker_hard", "blackout"):
        if k in fx:
            bright *= flicker_curve(n, k, seed)
    fi, fo = shot.get("fade_in", 0.0), shot.get("fade_out", 0.0)
    xa, xb = shot.get("x", [0.2, 0.8])
    vig = vignette()
    grain = [np.random.default_rng(seed * 7 + k).normal(0, 1, (H // 2, W // 2)).astype(np.float32) for k in range(4)]
    cctv = "cctv" in fx
    scan = ((np.arange(H) % 4) < 2).astype(np.float32)[:, None, None] * 0.12 + 0.88 if cctv else None

    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
                             "-crf", "18", "-pix_fmt", "yuv420p", "-tune", "film", str(out)], stdin=subprocess.PIPE)
    held = None
    for i in range(n):
        t = i / FPS
        u = ease(i / max(1, n - 1))
        if cctv and i % 2 and held is not None:   # CCTV: 12 fps stutter
            proc.stdin.write(held)
            continue
        src = a_img
        if seq:
            for st, im in seq:
                if t >= st:
                    src = im
        if b_img is not None:
            fr = i / max(1, n - 1)
            alpha = ease(min(1, max(0, (fr - xa) / max(1e-3, xb - xa))))
            if alpha > 0:
                src = Image.blend(a_img, b_img, alpha) if alpha < 1 else b_img
        z = z0 + (z1 - z0) * u
        cw, ch = KW / z, KH / z
        cx = KW / 2 + (p0[0] + (p1[0] - p0[0]) * u) * KW
        cy = KH / 2 + (p0[1] + (p1[1] - p0[1]) * u) * KH
        if shake:
            cx += sx[i] * (KW / W)
            cy += sy[i] * (KH / H)
        cx = min(max(cx, cw / 2), KW - cw / 2)
        cy = min(max(cy, ch / 2), KH - ch / 2)
        frame = src.resize((W, H), Image.BILINEAR, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))
        a = np.asarray(frame, dtype=np.float32)
        g = grain[i % 4]
        g = np.repeat(np.repeat(g, 2, 0), 2, 1)[..., None]
        a = a * vig * bright[i] + g * (9 if cctv else 4.5)
        if cctv:
            a = a * scan + np.random.default_rng(i).normal(0, 7, (H, 1, 1)).astype(np.float32)
        f = 1.0
        if fi and t < fi:
            f = t / fi
        if fo and t > tl["duration"] - fo:
            f = min(f, max(0.0, (tl["duration"] - t) / fo))
        if f < 1:
            a *= f
        buf = np.clip(a, 0, 255).astype(np.uint8).tobytes()
        held = buf
        proc.stdin.write(buf)
    proc.stdin.close()
    proc.wait()
    return src_kind


def conform_clip(clip, tl, out):
    d = tl["duration"]
    vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},"
          f"tpad=stop_mode=clone:stop_duration={d},trim=duration={d},setpts=PTS-STARTPTS")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-an", "-vf", vf, "-frames:v", str(tl["frames"]),
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(out)], check=True)
    return "generated_video"


def job(args):
    shot, tl, force = args
    out = OUT / f"{shot['id']}.mp4"
    clip = CLIPS / "generated" / f"{shot['id']}.mp4"
    if out.exists() and not force:
        return shot["id"], "cached"
    kind = conform_clip(clip, tl, out) if clip.exists() else render_stills(shot, tl, out)
    return shot["id"], kind


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    shots = {s["id"]: s for s in load_yaml("shots.yaml")["shots"]}
    tl = {s["id"]: s for s in load_json(EDIT / "timeline.json")["shots"]}
    ids = a.only.split(",") if a.only else list(shots)
    # a timeline change invalidates cached shots whose frame count no longer matches
    with ProcessPoolExecutor(a.jobs) as ex:
        for sid, kind in ex.map(job, [(shots[i], tl[i], a.force or bool(a.only)) for i in ids]):
            print(f"{sid}  {kind}", flush=True)


if __name__ == "__main__":
    main()
