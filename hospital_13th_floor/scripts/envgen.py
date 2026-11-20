"""Procedural placeholder keyframes for the animatic.

These are NOT the final anime frames. They are deliberately simple, atmospheric 'previs' plates —
correct composition, palette, lighting direction and story information — so the full film can be
timed, mixed and reviewed before AI keyframes exist. Drop a generated image into
scene_images/generated/<SHOT>.png and the renderer uses it instead.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops, ImageEnhance

from common import CHARS, load_yaml

KW, KH = 2560, 1440          # keyframe resolution (renderer crops/moves inside this)
R = np.random.default_rng(213)

FONT_DIR = "/usr/share/fonts/truetype"
F_MONO = f"{FONT_DIR}/dejavu/DejaVuSansMono.ttf"
F_MONO_B = f"{FONT_DIR}/dejavu/DejaVuSansMono-Bold.ttf"
F_SANS_B = f"{FONT_DIR}/dejavu/DejaVuSans-Bold.ttf"
F_SANS = f"{FONT_DIR}/dejavu/DejaVuSans.ttf"
F_SERIF_I = f"{FONT_DIR}/freefont/FreeSerifBoldItalic.ttf"
F_SERIF_B = f"{FONT_DIR}/dejavu/DejaVuSerif-Bold.ttf"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rgb(*c):
    return tuple(int(max(0, min(255, v))) for v in c)


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def noise_img(w, h, scale=8, amp=1.0, seed=None):
    rng = np.random.default_rng(seed) if seed is not None else R
    small = rng.random((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return (np.asarray(img).astype(np.float32) / 255 - 0.5) * amp


def blotches(w, h, seed=0):
    """Peeling-paint / stain mask, 0..1."""
    n = noise_img(w, h, 40, 1, seed) + 0.5 * noise_img(w, h, 12, 1, seed + 1) + 0.25 * noise_img(w, h, 4, 1, seed + 2)
    return np.clip((n + 0.2) * 3, 0, 1)


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def radial(w, h, cx, cy, r, power=2.0):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
    return np.clip(1 - d, 0, 1) ** power


def glow(img, layer, radius=30, strength=1.0):
    g = layer.filter(ImageFilter.GaussianBlur(radius))
    g = ImageEnhance.Brightness(g).enhance(strength)
    return ImageChops.add(img, g)


# =============================================================================== perspective corridor
class Persp:
    def __init__(self, w=KW, h=KH, cx=None, cy=None, f=None):
        self.w, self.h = w, h
        self.cx = w / 2 if cx is None else cx
        self.cy = h * 0.47 if cy is None else cy
        self.f = f or w * 0.42

    def p(self, x, y, z):
        return (self.cx + self.f * x / z, self.cy + self.f * y / z)

    def quad(self, pts):
        return [self.p(*q) for q in pts]


def figure(d: ImageDraw.ImageDraw, P: Persp, x, z, kind="patient", face=False, alpha=255, color=None):
    """Silhouette standing on the floor (y = 1.6) at lateral x, depth z."""
    scale = {"patient": 1.0, "girl": 0.72, "doctor": 1.05, "john_back": 1.0}[kind]
    top = 1.6 - 1.7 * scale
    hx, hy = P.p(x, top + 0.13 * scale, z)
    head_r = P.f * 0.11 * scale / z
    sh_l, sh_r = P.p(x - 0.24 * scale, top + 0.3 * scale, z), P.p(x + 0.24 * scale, top + 0.3 * scale, z)
    ft_l, ft_r = P.p(x - 0.22 * scale, 1.6, z), P.p(x + 0.22 * scale, 1.6, z)
    body = color or {"patient": (150, 170, 175), "girl": (165, 185, 195), "doctor": (205, 210, 205),
                     "john_back": (220, 225, 228)}[kind]
    body = rgb(*body) + (alpha,)
    d.polygon([sh_l, sh_r, ft_r, ft_l], fill=body)
    hair = (12, 12, 16, alpha)
    d.ellipse([hx - head_r, hy - head_r * 1.15, hx + head_r, hy + head_r * 1.1], fill=hair)
    if kind == "girl":  # long hair down the back
        d.polygon([(hx - head_r * 1.05, hy), (hx + head_r * 1.05, hy), (hx + head_r * 1.2, hy + head_r * 3.2),
                   (hx - head_r * 1.2, hy + head_r * 3.2)], fill=hair)
    if face:
        fr = head_r * 0.78
        d.ellipse([hx - fr, hy - fr * 1.05, hx + fr, hy + fr * 1.15], fill=(200, 205, 205, alpha))
        e = fr * 0.28
        for sx in (-1, 1):
            ex = hx + sx * fr * 0.38
            d.ellipse([ex - e, hy - e * 0.6, ex + e, hy + e * 0.9], fill=(10, 10, 12, alpha))


def wheelchair(d, P, x, z, col=(40, 45, 45)):
    cx, cy = P.p(x, 1.28, z)
    r = P.f * 0.32 / z
    wdt = max(2, int(P.f * 0.03 / z))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=wdt)
    seat_l, seat_r = P.p(x - 0.25, 1.0, z), P.p(x + 0.25, 1.0, z)
    back_t = P.p(x - 0.25, 0.45, z)
    d.line([seat_l, seat_r], fill=col, width=wdt * 2)
    d.line([seat_l, back_t], fill=col, width=wdt * 2)


def bed(d, P, x, z, length=1.9, col=(55, 60, 58), sheet=(120, 135, 135), lump=True, sitting=False, face=False):
    # iron bed along the wall (length along z)
    y_top, y_leg = 1.05, 1.6
    a, b = P.p(x - 0.45, y_top, z), P.p(x + 0.45, y_top, z)
    c, dd = P.p(x + 0.45, y_top, z + length), P.p(x - 0.45, y_top, z + length)
    d.polygon([a, b, c, dd], fill=sheet)
    for px in (x - 0.45, x + 0.45):
        d.line([P.p(px, y_top, z), P.p(px, y_leg, z)], fill=col, width=max(2, int(P.f * 0.025 / z)))
    head_bar = [P.p(x - 0.45, 0.55, z + length), P.p(x + 0.45, 0.55, z + length)]
    d.line(head_bar, fill=col, width=max(2, int(P.f * 0.03 / z)))
    if lump and not sitting:
        lx, ly = P.p(x, y_top - 0.12, z + length * 0.5)
        rw = P.f * 0.33 / (z + length * 0.5)
        d.ellipse([lx - rw, ly - rw * 0.45, lx + rw, ly + rw * 0.35], fill=rgb(*[s * 0.75 for s in sheet]))
        hx, hy = P.p(x, y_top - 0.18, z + length * 0.88)
        hr = P.f * 0.12 / (z + length * 0.88)
        d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(18, 18, 20))
    if sitting:
        zz = z + length * 0.75
        top = y_top - 0.95
        hx, hy = P.p(x, top, zz)
        hr = P.f * 0.12 / zz
        sl, sr = P.p(x - 0.25, top + 0.2, zz), P.p(x + 0.25, top + 0.2, zz)
        bl, br = P.p(x - 0.3, y_top, zz), P.p(x + 0.3, y_top, zz)
        d.polygon([sl, sr, br, bl], fill=(140, 158, 162))
        d.ellipse([hx - hr, hy - hr * 1.2, hx + hr, hy + hr], fill=(15, 15, 18))
        if face:
            fr = hr * 0.78
            d.ellipse([hx - fr, hy - fr, hx + fr, hy + fr * 1.15], fill=(205, 210, 210))
            e = fr * 0.28
            for sx in (-1, 1):
                ex = hx + sx * fr * 0.38
                d.ellipse([ex - e, hy - e * 0.5, ex + e, hy + e * 0.9], fill=(8, 8, 10))


def corridor(style="modern", red=False, props=False, figures=0, girl_bed=False, empty_bed=False,
             girl_stand=False, figure_back=False, flashlight=False, frame=None, seed=1):
    P = Persp()
    W, H = P.w, P.h
    if style == "modern":
        wall, floor, ceil, fog, lamp = (70, 92, 104), (40, 52, 60), (55, 70, 78), (60, 85, 100), (210, 235, 245)
    else:
        wall, floor, ceil, fog, lamp = (62, 78, 70), (34, 40, 38), (44, 52, 48), (52, 66, 62), (190, 230, 210)
    if red:
        wall, floor, ceil, fog, lamp = (70, 28, 30), (30, 12, 14), (40, 16, 18), (60, 14, 16), (255, 70, 60)
    img = Image.new("RGB", (W, H), rgb(*fog))
    d = ImageDraw.Draw(img, "RGBA")
    xw, yc, yf = 1.25, -1.35, 1.6
    period = 4.0 if style != "endless" else 3.0
    zs = np.geomspace(60, 0.6, 260)
    lights_on = {k: (R.random() > 0.25) for k in range(40)}
    for i in range(len(zs) - 1):
        z1, z0 = zs[i], zs[i + 1]
        zm = (z0 + z1) / 2
        k = int(zm // period)
        ph = (zm % period) / period
        lit = lights_on.get(k, True)
        pool = (math.exp(-((ph - 0.5) ** 2) / 0.05) if lit else 0.1)
        fogt = 1 - math.exp(-zm / (14 if style != "endless" else 9))
        lightf = 0.35 + 0.9 * pool
        if red:
            lightf = 0.3 + 0.6 * pool
        def col(base):
            c = tuple(v * lightf for v in base)
            return rgb(*mix(c, fog, fogt))
        d.polygon(P.quad([(-xw, yf, z1), (xw, yf, z1), (xw, yf, z0), (-xw, yf, z0)]), fill=col(floor))
        d.polygon(P.quad([(-xw, yc, z1), (xw, yc, z1), (xw, yc, z0), (-xw, yc, z0)]), fill=col(ceil))
        d.polygon(P.quad([(-xw, yc, z1), (-xw, yf, z1), (-xw, yf, z0), (-xw, yc, z0)]), fill=col(wall))
        d.polygon(P.quad([(xw, yc, z1), (xw, yf, z1), (xw, yf, z0), (xw, yc, z0)]), fill=col(wall))
    # wall texture
    a = np.asarray(img).astype(np.float32)
    if style != "modern":
        b = blotches(W, H, seed)[..., None]
        a = a * (1 - 0.22 * b) + np.array([20, 18, 10]) * 0.22 * b
    a += noise_img(W, H, 3, 14, seed)[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img, "RGBA")
    # doors
    for zd in np.arange(2.2, 40, period if style == "endless" else 5.3):
        fogt = 1 - math.exp(-zd / 14)
        for side in (-1, 1):
            if style == "endless" or R.random() > 0.2:
                dcol = rgb(*mix((28, 30, 30) if not red else (35, 10, 10), fog, fogt))
                d.polygon(P.quad([(side * xw, -0.55, zd), (side * xw, yf, zd), (side * xw, yf, zd + 1.0),
                                  (side * xw, -0.55, zd + 1.0)]), fill=dcol)
                fr = rgb(*mix((90, 95, 90) if not red else (90, 30, 30), fog, fogt))
                d.line(P.quad([(side * xw, yf, zd), (side * xw, -0.55, zd), (side * xw, -0.55, zd + 1.0),
                               (side * xw, yf, zd + 1.0)]), fill=fr, width=max(1, int(18 / zd)))
    # ceiling lights + reflections
    refl = Image.new("RGB", (W, H), (0, 0, 0))
    rd = ImageDraw.Draw(refl)
    lights = Image.new("RGB", (W, H), (0, 0, 0))
    ld = ImageDraw.Draw(lights)
    for k in range(1, int(40 / period)):
        zl = k * period + period * 0.5 - 1.6
        if zl < 0.9 or not lights_on.get(int(zl // period), True):
            continue
        fogt = 1 - math.exp(-zl / 14)
        c = rgb(*mix(lamp, fog, fogt * 0.8))
        q = P.quad([(-0.28, yc, zl), (0.28, yc, zl), (0.28, yc, zl + 0.9), (-0.28, yc, zl + 0.9)])
        ld.polygon(q, fill=c)
        qr = P.quad([(-0.28, yf + (yf - yc) * 0.0, zl), (0.28, yf, zl), (0.28, yf, zl + 0.9), (-0.28, yf, zl + 0.9)])
        rd.polygon(qr, fill=rgb(*[v * 0.35 for v in c]))
    img = ImageChops.add(img, lights)
    img = glow(img, lights, 40, 0.9)
    img = ImageChops.add(img, refl.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(img, "RGBA")
    if props:
        for zp, side in ((3.0, -1), (6.5, 1), (11.0, -1), (17.0, 1)):
            if R.random() < 0.6:
                wheelchair(d, P, side * 0.9, zp, (25, 28, 28) if not red else (30, 8, 8))
            else:
                bed(d, P, side * 0.75, zp, 1.9, col=(30, 32, 30), sheet=(70, 80, 78) if not red else (60, 25, 25), lump=False)
    if girl_bed:
        bed(d, P, -0.6, 4.0, 1.9, col=(40, 45, 42), sheet=(130, 145, 148), lump=False,
            sitting=not empty_bed, face=False)
        if not empty_bed:
            figure(d, P, -0.6, 5.2, "girl", face=True)
    if girl_stand:
        figure(d, P, 0.0, 9.0, "girl", face=True)
    if figures:
        spots = [(-0.7, 4.5), (0.6, 6.0), (-0.3, 8.5), (0.8, 11.0), (-0.8, 14.0), (0.2, 18.0)][:figures]
        for x, z in spots:
            figure(d, P, x, z, "patient", face=True)
    if figure_back:
        figure(d, P, 0.15, 2.4, "john_back")
    # fog veil near the vanishing point
    a = np.asarray(img).astype(np.float32)
    fogm = radial(W, H, P.cx, P.cy, W * 0.35, 1.5)[..., None]
    a = a * (1 - 0.5 * fogm) + np.array(fog) * 1.3 * 0.5 * fogm
    if flashlight:
        cone = radial(W, H, W * 0.5, H * 0.55, W * 0.28, 1.2)[..., None]
        a = a * (0.35 + 1.4 * cone)
    img = to_img(a)
    if frame == "elevator":
        img = elevator_frame(img)
    elif frame == "door":
        img = door_frame(img, red)
    return img


def elevator_frame(img, steel=(70, 78, 80)):
    W, H = img.size
    d = ImageDraw.Draw(img)
    m = int(W * 0.17)
    d.rectangle([0, 0, m, H], fill=steel)
    d.rectangle([W - m, 0, W, H], fill=steel)
    d.rectangle([0, 0, W, int(H * 0.08)], fill=rgb(*[v * 0.8 for v in steel]))
    a = np.asarray(img).astype(np.float32)
    streak = noise_img(W, H, 2, 18, 9)
    a[:, :m] += streak[:, :m, None]
    a[:, W - m:] += streak[:, W - m:, None]
    a[:, m - 14:m] *= 0.4
    a[:, W - m:W - m + 14] *= 0.4
    return to_img(a)


def door_frame(img, red=False):
    W, H = img.size
    d = ImageDraw.Draw(img)
    col = (45, 20, 18) if red else (50, 42, 34)
    m = int(W * 0.2)
    d.rectangle([0, 0, m, H], fill=col)
    d.rectangle([W - m, 0, W, H], fill=col)
    d.rectangle([0, 0, W, int(H * 0.1)], fill=col)
    # the door leaf swung inward on the right
    d.polygon([(W - m, int(H * 0.1)), (W - m + int(W * 0.12), 0), (W - m + int(W * 0.12), H), (W - m, H)],
              fill=rgb(*[c * 0.6 for c in col]))
    return img


# =============================================================================== elevator
def seg_text(d, xy, text, size, color=(255, 40, 30)):
    f = font(F_MONO_B, size)
    d.text(xy, text, font=f, fill=color, anchor="mm")


def elevator_in(display="1", dark=False, red=False, morning=False):
    W, H = KW, KH
    img = Image.new("RGB", (W, H), (20, 24, 26))
    d = ImageDraw.Draw(img)
    steel = (95, 104, 108) if not morning else (130, 128, 120)
    bx0, by0, bx1, by1 = int(W * 0.27), int(H * 0.16), int(W * 0.73), int(H * 0.86)
    d.polygon([(0, 0), (bx0, by0), (bx0, by1), (0, H)], fill=rgb(*[v * 0.8 for v in steel]))
    d.polygon([(W, 0), (bx1, by0), (bx1, by1), (W, H)], fill=rgb(*[v * 0.7 for v in steel]))
    d.polygon([(0, 0), (W, 0), (bx1, by0), (bx0, by0)], fill=(60, 66, 68))
    d.polygon([(0, H), (W, H), (bx1, by1), (bx0, by1)], fill=(38, 40, 40))
    d.rectangle([bx0, by0, bx1, by1], fill=steel)
    # doors with seam
    dx0, dx1 = bx0 + int((bx1 - bx0) * 0.12), bx1 - int((bx1 - bx0) * 0.12)
    d.rectangle([dx0, by0 + int(H * 0.08), dx1, by1], fill=rgb(*[v * 1.1 for v in steel]))
    mid = (dx0 + dx1) // 2
    d.line([(mid, by0 + int(H * 0.08)), (mid, by1)], fill=(30, 30, 32), width=6)
    # handrails
    d.line([(0, int(H * 0.62)), (bx0, int(by0 + (by1 - by0) * 0.6))], fill=(170, 175, 175), width=18)
    d.line([(W, int(H * 0.62)), (bx1, int(by0 + (by1 - by0) * 0.6))], fill=(150, 155, 155), width=18)
    # ceiling light
    d.polygon([(int(W * 0.35), int(H * 0.03)), (int(W * 0.65), int(H * 0.03)), (int(W * 0.6), int(H * 0.11)),
               (int(W * 0.4), int(H * 0.11))], fill=(235, 240, 235) if not dark else (90, 95, 92))
    # display over the doors
    dw, dh = int(W * 0.09), int(H * 0.06)
    dcx, dcy = (bx0 + bx1) // 2, by0 + int(H * 0.04)
    d.rectangle([dcx - dw, dcy - dh, dcx + dw, dcy + dh], fill=(8, 8, 8))
    glow_l = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(glow_l)
    seg_text(gd, (dcx, dcy), display, int(dh * 1.5), (255, 30, 20) if (red or display == "13") else (255, 120, 40))
    img = ImageChops.add(img, glow_l)
    img = glow(img, glow_l, 25, 1.5 if red else 0.8)
    a = np.asarray(img).astype(np.float32)
    a += noise_img(W, H, 2, 10, 3)[..., None]
    if dark:
        a *= 0.55
    if red:
        a = a * np.array([1.15, 0.55, 0.5])
    return to_img(a)


def display_closeup(text="1", red=False, down=False):
    W, H = KW, KH
    img = Image.new("RGB", (W, H), (30, 33, 35))
    a = np.asarray(img).astype(np.float32) + noise_img(W, H, 2, 16, 4)[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W * 0.2, H * 0.2, W * 0.8, H * 0.8], 40, fill=(70, 74, 76))
    d.rounded_rectangle([W * 0.24, H * 0.26, W * 0.76, H * 0.74], 24, fill=(6, 5, 5))
    g = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(g)
    col = (255, 25, 15) if red or text == "13" else (255, 95, 30)
    if text == "##":
        for _ in range(14):
            x0 = R.uniform(W * 0.3, W * 0.68)
            y0 = R.uniform(H * 0.32, H * 0.66)
            gd.rectangle([x0, y0, x0 + R.uniform(20, 160), y0 + R.uniform(10, 40)], fill=col)
    else:
        seg_text(gd, (W * 0.55, H * 0.5), text, int(H * 0.36), col)
        ax, ay = W * 0.33, H * 0.5
        s = H * 0.08
        tri = [(ax - s, ay + s * 0.6), (ax + s, ay + s * 0.6), (ax, ay - s)] if not down else \
              [(ax - s, ay - s * 0.6), (ax + s, ay - s * 0.6), (ax, ay + s)]
        gd.polygon(tri, fill=col)
    img = ImageChops.add(img, g)
    return glow(img, g, 45, 1.6)


def panel(lit="12"):
    W, H = KW, KH
    a = np.full((H, W, 3), 110, np.float32) + noise_img(W, H, 1, 30, 5)[..., None] * np.array([1, 1, 1])
    a += np.linspace(-20, 20, W)[None, :, None]
    img = to_img(a)
    d = ImageDraw.Draw(img)
    f = font(F_SANS_B, 64)
    labels = [str(i) for i in range(12, 0, -1)]
    for i, lab in enumerate(labels):
        col, row = i % 2, i // 2
        cx = W * (0.42 if col else 0.58)
        cy = H * (0.12 + row * 0.14)
        r = 70
        on = lab == lit
        d.ellipse([cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10], fill=(70, 72, 72))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(200, 200, 195) if not on else (255, 190, 90))
        d.text((cx, cy), lab, font=f, fill=(40, 40, 40), anchor="mm")
    if lit:
        g = Image.new("RGB", (W, H))
        gd = ImageDraw.Draw(g)
        i = labels.index(lit)
        cx, cy = W * (0.42 if i % 2 else 0.58), H * (0.12 + (i // 2) * 0.14)
        gd.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], fill=(255, 150, 50))
        img = glow(img, g, 50, 0.7)
    return img


def elevator_out(style="lobby", doors="closed", display="1", figure_in=False):
    if style.startswith("inside"):
        return elevator_in(display="13" if "morning" not in style else "1", morning="morning" in style,
                           red="morning" not in style)
    W, H = KW, KH
    if style in ("lobby", "lobby_night"):
        wallc = (58, 80, 92) if style == "lobby" else (30, 44, 54)
        steel = (120, 132, 138) if style == "lobby" else (80, 90, 96)
    else:
        wallc, steel = (56, 66, 58), (78, 80, 74)
    a = np.zeros((H, W, 3), np.float32) + np.array(wallc)
    a += noise_img(W, H, 3, 12, 6)[..., None]
    if style == "old":
        b = blotches(W, H, 3)[..., None]
        a = a * (1 - 0.3 * b) + np.array([25, 20, 10]) * 0.3 * b
    a *= (0.7 + 0.3 * radial(W, H, W / 2, H * 0.3, W * 0.8, 1.0))[..., None]
    floor_y = int(H * 0.86)
    a[floor_y:] = a[floor_y:] * 0.55
    img = to_img(a)
    d = ImageDraw.Draw(img)
    x0, x1, y0 = int(W * 0.34), int(W * 0.66), int(H * 0.2)
    d.rectangle([x0 - 40, y0 - 40, x1 + 40, floor_y], fill=rgb(*[v * 0.75 for v in steel]))
    if doors == "closed":
        d.rectangle([x0, y0, x1, floor_y], fill=steel)
        d.line([((x0 + x1) // 2, y0), ((x0 + x1) // 2, floor_y)], fill=(25, 25, 25), width=8)
    else:
        gap = (x1 - x0) // 2 if doors == "open" else int(W * 0.018)
        mid = (x0 + x1) // 2
        inner = (225, 232, 228) if style != "lobby_night" else (150, 160, 158)
        d.rectangle([mid - gap, y0, mid + gap, floor_y], fill=inner)
        d.rectangle([x0, y0, mid - gap, floor_y], fill=steel)
        d.rectangle([mid + gap, y0, x1, floor_y], fill=steel)
        if figure_in:  # a man in a white coat, just visible through the gap
            P = Persp(cx=mid, cy=H * 0.47)
            fd = ImageDraw.Draw(img, "RGBA")
            figure(fd, P, 0.0, 2.6, "doctor", face=False, alpha=230, color=(210, 215, 212))
            # mask everything outside the gap back to steel
            d.rectangle([x0, y0, mid - gap, floor_y], fill=steel)
            d.rectangle([mid + gap, y0, x1, floor_y], fill=steel)
        lightspill = Image.new("RGB", (W, H))
        ld = ImageDraw.Draw(lightspill)
        ld.polygon([(mid - gap, floor_y), (mid + gap, floor_y), (mid + gap * 2.2, H), (mid - gap * 2.2, H)],
                   fill=rgb(*[v * 0.4 for v in inner]))
        img = ImageChops.add(img, lightspill.filter(ImageFilter.GaussianBlur(20)))
        d = ImageDraw.Draw(img)
    # indicator
    dcx, dcy = W // 2, y0 - 120
    d.rectangle([dcx - 120, dcy - 55, dcx + 120, dcy + 55], fill=(8, 8, 8))
    g = Image.new("RGB", (W, H))
    seg_text(ImageDraw.Draw(g), (dcx, dcy), display, 90, (255, 30, 20) if display == "13" else (255, 110, 40))
    img = ImageChops.add(img, g)
    img = glow(img, g, 30, 1.2)
    d = ImageDraw.Draw(img)
    if style == "lobby":
        d.rectangle([int(W * 0.75), int(H * 0.3), int(W * 0.88), int(H * 0.62)], fill=(25, 35, 40))
        f = font(F_SANS, 30)
        for i in range(12):
            d.text((int(W * 0.765), int(H * 0.32) + i * 34), f"{12 - i:>2}  ··········", font=f, fill=(170, 185, 190))
        # call button
        d.ellipse([x1 + 90, int(H * 0.5), x1 + 140, int(H * 0.5) + 50], fill=(200, 200, 190))
    else:
        d.ellipse([x1 + 90, int(H * 0.5), x1 + 140, int(H * 0.5) + 50], fill=(110, 105, 90))
    return img


def wall():
    return elevator_out_wall()


def elevator_out_wall():
    W, H = KW, KH
    a = np.zeros((H, W, 3), np.float32) + np.array([56, 66, 58])
    a += noise_img(W, H, 3, 12, 6)[..., None]
    b = blotches(W, H, 3)[..., None]
    a = a * (1 - 0.3 * b) + np.array([25, 20, 10]) * 0.3 * b
    # water stain where the doors were
    st = radial(W, H, W / 2, H * 0.5, W * 0.2, 1.0)[..., None]
    a = a * (1 - 0.25 * st)
    a *= (0.7 + 0.3 * radial(W, H, W / 2, H * 0.3, W * 0.8, 1.0))[..., None]
    a[int(H * 0.86):] *= 0.55
    img = to_img(a)
    d = ImageDraw.Draw(img)
    for _ in range(6):  # cracks
        x, y = R.uniform(W * 0.35, W * 0.65), R.uniform(H * 0.2, H * 0.8)
        pts = [(x, y)]
        for _ in range(8):
            x += R.uniform(-60, 60)
            y += R.uniform(-60, 60)
            pts.append((x, y))
        d.line(pts, fill=(25, 28, 25), width=3)
    return img


# =============================================================================== rooms
def ward(turned=False, close=False, corner=False):
    P = Persp(cy=KH * 0.45, f=KW * 0.38)
    W, H = P.w, P.h
    fog = (40, 55, 55)
    img = Image.new("RGB", (W, H), fog)
    d = ImageDraw.Draw(img, "RGBA")
    xw, yc, yf = 3.6, -2.0, 1.6
    zs = np.geomspace(30, 0.6, 160)
    for i in range(len(zs) - 1):
        z1, z0 = zs[i], zs[i + 1]
        zm = (z0 + z1) / 2
        fogt = 1 - math.exp(-zm / 12)
        lf = 0.55 + 0.25 * math.sin(zm * 0.9)
        c = lambda base: rgb(*mix(tuple(v * lf for v in base), fog, fogt))
        d.polygon(P.quad([(-xw, yf, z1), (xw, yf, z1), (xw, yf, z0), (-xw, yf, z0)]), fill=c((38, 44, 42)))
        d.polygon(P.quad([(-xw, yc, z1), (xw, yc, z1), (xw, yc, z0), (-xw, yc, z0)]), fill=c((45, 52, 50)))
        d.polygon(P.quad([(-xw, yc, z1), (-xw, yf, z1), (-xw, yf, z0), (-xw, yc, z0)]), fill=c((66, 80, 76)))
        d.polygon(P.quad([(xw, yc, z1), (xw, yf, z1), (xw, yf, z0), (xw, yc, z0)]), fill=c((58, 70, 66)))
    # moonlit windows on the left wall + beams
    beams = Image.new("RGB", (W, H))
    bd = ImageDraw.Draw(beams)
    for zwin in (3.0, 7.0, 11.0, 15.0):
        q = P.quad([(-xw, -1.3, zwin), (-xw, 0.2, zwin), (-xw, 0.2, zwin + 1.4), (-xw, -1.3, zwin + 1.4)])
        d.polygon(q, fill=(150, 175, 190))
        bq = P.quad([(-xw, -1.3, zwin), (-xw, 0.2, zwin + 1.4), (0.5, yf, zwin + 3.5), (0.5, yf, zwin + 1.0)])
        bd.polygon(bq, fill=(40, 55, 65))
    img = ImageChops.add(img, beams.filter(ImageFilter.GaussianBlur(25)))
    d = ImageDraw.Draw(img, "RGBA")
    zstart = 1.4 if close else 2.2
    for k in range(5):
        z = zstart + k * 2.6
        for side in (-1, 1):
            if turned:
                bed(d, P, side * 2.5, z, 1.9, sitting=True, face=True)
            else:
                bed(d, P, side * 2.5, z, 1.9, lump=True)
    a = np.asarray(img).astype(np.float32) + noise_img(W, H, 3, 12, 7)[..., None]
    fogm = radial(W, H, P.cx, P.cy, W * 0.4, 1.4)[..., None]
    a = a * (1 - 0.45 * fogm) + np.array(fog) * 1.2 * 0.45 * fogm
    if corner:
        a *= (0.25 + 0.9 * radial(W, H, W * 0.7, H * 0.5, W * 0.35, 1.0))[..., None]
        img = to_img(a)
        d = ImageDraw.Draw(img, "RGBA")
        P2 = Persp(cx=W * 0.7, cy=H * 0.45)
        figure(d, P2, 0.0, 3.2, "patient", face=False, color=(60, 70, 72))
        return img
    return to_img(a)


def records(flashlight=False):
    P = Persp(cy=KH * 0.48, f=KW * 0.4)
    W, H = P.w, P.h
    fog = (36, 44, 46)
    img = Image.new("RGB", (W, H), fog)
    d = ImageDraw.Draw(img, "RGBA")
    xw, yc, yf = 2.2, -1.6, 1.6
    zs = np.geomspace(20, 0.6, 120)
    for i in range(len(zs) - 1):
        z1, z0 = zs[i], zs[i + 1]
        fogt = 1 - math.exp(-((z0 + z1) / 2) / 8)
        c = lambda base: rgb(*mix(base, fog, fogt))
        d.polygon(P.quad([(-xw, yf, z1), (xw, yf, z1), (xw, yf, z0), (-xw, yf, z0)]), fill=c((44, 40, 34)))
        d.polygon(P.quad([(-xw, yc, z1), (xw, yc, z1), (xw, yc, z0), (-xw, yc, z0)]), fill=c((30, 32, 32)))
    # shelves with files
    for side in (-1, 1):
        x = side * xw
        for z in np.arange(1.0, 16, 0.35):
            fogt = 1 - math.exp(-z / 8)
            for yy in np.arange(-1.4, 1.5, 0.45):
                col = rgb(*mix((R.uniform(120, 170), R.uniform(105, 140), R.uniform(70, 95)), fog, fogt))
                d.polygon(P.quad([(x, yy, z), (x, yy + 0.35, z), (x, yy + 0.35, z + 0.3), (x, yy, z + 0.3)]), fill=col)
            for yy in np.arange(-1.45, 1.6, 0.45):
                d.line([P.p(x, yy, z), P.p(x, yy, z + 0.35)], fill=rgb(*mix((40, 36, 30), fog, fogt)), width=max(1, int(14 / z)))
    # desk + papers
    d.polygon(P.quad([(-0.8, 0.85, 3.0), (0.8, 0.85, 3.0), (0.8, 0.85, 4.0), (-0.8, 0.85, 4.0)]), fill=(70, 52, 36))
    d.polygon(P.quad([(-0.8, 0.85, 3.0), (0.8, 0.85, 3.0), (0.8, 1.6, 3.0), (-0.8, 1.6, 3.0)]), fill=(48, 36, 26))
    d.polygon(P.quad([(-0.2, 0.84, 3.2), (0.3, 0.84, 3.2), (0.3, 0.84, 3.6), (-0.2, 0.84, 3.6)]), fill=(205, 195, 160))
    for _ in range(40):
        x, z = R.uniform(-1.8, 1.8), R.uniform(1.0, 8)
        s = R.uniform(0.12, 0.2)
        d.polygon(P.quad([(x, 1.59, z), (x + s, 1.59, z), (x + s, 1.59, z + s), (x, 1.59, z + s)]),
                  fill=rgb(*mix((180, 175, 150), fog, 1 - math.exp(-z / 8))))
    a = np.asarray(img).astype(np.float32) + noise_img(W, H, 3, 12, 8)[..., None]
    # moonlight through blinds
    y, x = np.mgrid[0:H, 0:W]
    stripes = ((np.sin((x * 0.4 + y) / 22.0) > 0.3) * radial(W, H, W * 0.75, H * 0.3, W * 0.5, 1.0))[..., None]
    a += stripes * np.array([30, 40, 50])
    if flashlight:
        a *= (0.3 + 1.6 * radial(W, H, W * 0.42, H * 0.5, W * 0.3, 1.3))[..., None]
    return to_img(a)


def doorway(figure_on=False):
    W, H = KW, KH
    a = np.zeros((H, W, 3), np.float32) + np.array([30, 36, 34])
    a += noise_img(W, H, 3, 10, 10)[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img, "RGBA")
    x0, x1, y0 = int(W * 0.4), int(W * 0.6), int(H * 0.12)
    d.rectangle([x0 - 30, y0 - 30, x1 + 30, H], fill=(52, 44, 36))
    d.rectangle([x0, y0, x1, H], fill=(70, 86, 82))
    corr = Image.new("RGB", (W, H))
    cd = ImageDraw.Draw(corr)
    cd.rectangle([x0, y0, x1, H], fill=(60, 80, 75))
    img = glow(img, corr, 60, 0.6)
    d = ImageDraw.Draw(img, "RGBA")
    if figure_on:
        P = Persp(cx=W / 2, cy=H * 0.42, f=W * 0.5)
        figure(d, P, 0.0, 2.2, "doctor", color=(28, 30, 30))
        # faint white coat rim light
        figure(d, P, 0.0, 2.25, "doctor", color=(150, 158, 155), alpha=60)
    # foreground: John's shoulder (dark) at left
    d.ellipse([-W * 0.12, H * 0.62, W * 0.22, H * 1.5], fill=(70, 78, 78))
    d.ellipse([W * 0.01, H * 0.36, W * 0.15, H * 0.66], fill=(8, 8, 10))
    return img.filter(ImageFilter.GaussianBlur(1.2))


def office():
    W, H = KW, KH
    a = np.zeros((H, W, 3), np.float32) + np.array([24, 32, 40])
    a += noise_img(W, H, 3, 8, 11)[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img, "RGBA")
    # window with city lights & rain
    wx0, wy0, wx1, wy1 = int(W * 0.5), int(H * 0.08), int(W * 0.95), int(H * 0.62)
    d.rectangle([wx0, wy0, wx1, wy1], fill=(20, 34, 52))
    for _ in range(140):
        x, y = R.uniform(wx0, wx1), R.uniform(wy0 + (wy1 - wy0) * 0.45, wy1)
        r = R.uniform(3, 14)
        c = (255, 200, 120) if R.random() < 0.6 else (150, 200, 255)
        d.ellipse([x - r, y - r, x + r, y + r], fill=c + (int(R.uniform(60, 160)),))
    win = img.crop((wx0, wy0, wx1, wy1)).filter(ImageFilter.GaussianBlur(10))
    img.paste(win, (wx0, wy0))
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(260):  # rain streaks
        x, y = R.uniform(wx0, wx1), R.uniform(wy0, wy1)
        L = R.uniform(15, 70)
        d.line([(x, y), (x + 2, y + L)], fill=(170, 200, 230, 90), width=2)
    for i in range(3):
        d.line([(wx0 + (wx1 - wx0) * i / 2, wy0), (wx0 + (wx1 - wx0) * i / 2, wy1)], fill=(15, 18, 22), width=14)
    d.rectangle([wx0, wy0, wx1, wy1], outline=(15, 18, 22), width=18)
    # desk
    d.polygon([(0, H * 0.7), (W, H * 0.66), (W, H), (0, H)], fill=(52, 40, 30))
    # monitor
    d.rectangle([W * 0.12, H * 0.32, W * 0.36, H * 0.6], fill=(15, 18, 20))
    d.rectangle([W * 0.13, H * 0.34, W * 0.35, H * 0.58], fill=(40, 70, 95))
    d.rectangle([W * 0.22, H * 0.6, W * 0.26, H * 0.68], fill=(15, 18, 20))
    # lamp pool
    lamp = Image.new("RGB", (W, H))
    ld = ImageDraw.Draw(lamp)
    ld.ellipse([W * 0.33, H * 0.6, W * 0.62, H * 0.9], fill=(110, 80, 40))
    img = glow(img, lamp, 80, 0.9)
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(W * 0.43, H * 0.3), (W * 0.5, H * 0.3), (W * 0.53, H * 0.4), (W * 0.4, H * 0.4)], fill=(30, 30, 25))
    d.line([(W * 0.465, H * 0.4), (W * 0.47, H * 0.7)], fill=(30, 30, 25), width=10)
    # coffee cup, files, clock
    d.rectangle([W * 0.6, H * 0.64, W * 0.64, H * 0.72], fill=(220, 220, 210))
    for k in range(5):
        d.rectangle([W * 0.68, H * (0.66 - k * 0.018), W * 0.82, H * (0.675 - k * 0.018)], fill=(170 - k * 8, 150, 110))
    cx, cy, r = W * 0.27, H * 0.14, H * 0.07
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(200, 200, 190), outline=(30, 30, 30), width=8)
    clock_hands(d, cx, cy, r, 2, 13)
    return img


def clock_hands(d, cx, cy, r, hh, mm, col=(20, 20, 20)):
    am = math.radians(mm * 6 - 90)
    ah = math.radians((hh % 12 + mm / 60) * 30 - 90)
    d.line([(cx, cy), (cx + r * 0.85 * math.cos(am), cy + r * 0.85 * math.sin(am))], fill=col, width=max(3, int(r * 0.05)))
    d.line([(cx, cy), (cx + r * 0.55 * math.cos(ah), cy + r * 0.55 * math.sin(ah))], fill=col, width=max(5, int(r * 0.08)))


def clock(time="2:13"):
    W, H = KW, KH
    hh, mm = map(int, time.split(":"))
    morning = hh == 6
    bg = (90, 110, 105) if morning else (32, 42, 46)
    a = np.zeros((H, W, 3), np.float32) + np.array(bg) + noise_img(W, H, 3, 10, 12)[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img)
    cx, cy, r = W / 2, H / 2, H * 0.4
    d.ellipse([cx - r - 30, cy - r - 30, cx + r + 30, cy + r + 30], fill=(25, 25, 25))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(225, 222, 210) if morning else (190, 192, 180))
    f = font(F_SANS_B, int(r * 0.16))
    for k in range(1, 13):
        ang = math.radians(k * 30 - 90)
        d.text((cx + r * 0.8 * math.cos(ang), cy + r * 0.8 * math.sin(ang)), str(k), font=f, fill=(30, 30, 30), anchor="mm")
    for k in range(60):
        ang = math.radians(k * 6)
        r0 = r * (0.92 if k % 5 else 0.88)
        d.line([(cx + r0 * math.cos(ang), cy + r0 * math.sin(ang)), (cx + r * 0.96 * math.cos(ang), cy + r * 0.96 * math.sin(ang))],
               fill=(40, 40, 40), width=4)
    clock_hands(d, cx, cy, r, hh, mm)
    d.line([(cx, cy), (cx + r * 0.9 * math.cos(math.radians(130)), cy + r * 0.9 * math.sin(math.radians(130)))], fill=(170, 20, 20), width=4)
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=(20, 20, 20))
    if not morning:  # cracked glass
        for _ in range(7):
            x, y = cx + R.uniform(-r * 0.3, r * 0.5), cy + R.uniform(-r * 0.6, r * 0.2)
            pts = [(x, y)]
            for _ in range(6):
                x += R.uniform(-90, 90)
                y += R.uniform(-90, 90)
                pts.append((x, y))
            d.line(pts, fill=(240, 240, 240), width=2)
    # glass reflection
    g = Image.new("RGB", (W, H))
    ImageDraw.Draw(g).ellipse([cx - r * 0.7, cy - r * 0.9, cx - r * 0.1, cy - r * 0.4], fill=(40, 45, 50))
    return glow(img, g, 40, 1.0)


def phone(light="night"):
    W, H = KW, KH
    bg = (40, 34, 28) if light != "off" else (24, 26, 30)
    a = np.zeros((H, W, 3), np.float32) + np.array(bg) + noise_img(W, H, 2, 16, 13)[..., None]
    a *= (0.4 + 0.9 * radial(W, H, W * 0.4, H * 0.35, W * 0.7, 1.0))[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img)
    body = (200, 188, 160) if light != "off" else (120, 125, 130)
    d.rounded_rectangle([W * 0.3, H * 0.42, W * 0.72, H * 0.86], 80, fill=body)
    d.rounded_rectangle([W * 0.33, H * 0.3, W * 0.69, H * 0.46], 70, fill=rgb(*[v * 0.92 for v in body]))
    d.rounded_rectangle([W * 0.28, H * 0.26, W * 0.38, H * 0.42], 40, fill=rgb(*[v * 0.85 for v in body]))
    d.rounded_rectangle([W * 0.64, H * 0.26, W * 0.74, H * 0.42], 40, fill=rgb(*[v * 0.85 for v in body]))
    f = font(F_SANS_B, 46)
    for i in range(12):
        cx, cy = W * (0.42 + (i % 3) * 0.07), H * (0.52 + (i // 3) * 0.075)
        d.rounded_rectangle([cx - 55, cy - 30, cx + 55, cy + 30], 12, fill=(235, 230, 215) if light != "off" else (150, 155, 160))
        d.text((cx, cy), "123456789*0#"[i], font=f, fill=(50, 50, 50), anchor="mm")
    if light == "night":
        g = Image.new("RGB", (W, H))
        ImageDraw.Draw(g).ellipse([W * 0.34, H * 0.55, W * 0.37, H * 0.6], fill=(255, 30, 20))
        img = ImageChops.add(img, g)
        img = glow(img, g, 30, 2.0)
    return img


def sign(text="FLOOR 13 — EMERGENCY WARD"):
    img = corridor("old", seed=4).filter(ImageFilter.GaussianBlur(14))
    W, H = img.size
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = W * 0.14, H * 0.32, W * 0.86, H * 0.6
    d.line([(x0 + 100, 0), (x0 + 100, y0)], fill=(30, 30, 30), width=8)
    d.line([(x1 - 100, 0), (x1 - 100, y0)], fill=(30, 30, 30), width=8)
    d.rectangle([x0, y0, x1, y1], fill=(205, 200, 180), outline=(40, 40, 40), width=14)
    a = np.asarray(img).astype(np.float32)
    b = blotches(W, H, 21)[..., None]
    box = np.zeros((H, W, 1), np.float32)
    box[int(y0):int(y1), int(x0):int(x1)] = 1
    a = a * (1 - 0.35 * b * box) + np.array([70, 50, 30]) * 0.35 * b * box
    img = to_img(a)
    d = ImageDraw.Draw(img)
    f = font(F_SANS_B, 86)
    d.text((W / 2, (y0 + y1) / 2), text, font=f, fill=(150, 20, 18), anchor="mm")
    return img


def door_sign(text="MEDICAL RECORDS"):
    W, H = KW, KH
    a = np.zeros((H, W, 3), np.float32) + np.array([40, 48, 44]) + noise_img(W, H, 3, 12, 14)[..., None]
    img = to_img(a)
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.3, H * 0.05, W * 0.7, H], fill=(70, 50, 34))
    for k in range(6):
        d.line([(W * 0.3, H * (0.05 + k * 0.16)), (W * 0.7, H * (0.05 + k * 0.16))], fill=(55, 38, 26), width=3)
    d.rectangle([W * 0.36, H * 0.14, W * 0.64, H * 0.52], fill=(150, 165, 160))
    glass = img.crop((int(W * 0.36), int(H * 0.14), int(W * 0.64), int(H * 0.52)))
    gn = np.asarray(glass).astype(np.float32) + noise_img(glass.width, glass.height, 1, 40, 15)[..., None]
    img.paste(to_img(gn).filter(ImageFilter.GaussianBlur(2)), (int(W * 0.36), int(H * 0.14)))
    d = ImageDraw.Draw(img)
    f = font(F_SERIF_B, 96)
    d.text((W / 2, H * 0.33), text, font=f, fill=(25, 25, 25), anchor="mm")
    d.ellipse([W * 0.6, H * 0.6, W * 0.64, H * 0.66], fill=(150, 130, 70))
    return img


def exit_sign():
    W, H = KW, KH
    img = Image.new("RGB", (W, H), (4, 3, 3))
    d = ImageDraw.Draw(img)
    g = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(g)
    gd.rectangle([W * 0.4, H * 0.36, W * 0.6, H * 0.5], fill=(230, 25, 20))
    gd.text((W / 2, H * 0.43), "EXIT", font=font(F_SANS_B, 130), fill=(40, 0, 0), anchor="mm")
    img = ImageChops.add(img, g)
    img = glow(img, g, 120, 0.8)
    img = glow(img, g, 30, 0.8)
    return img


def lobby(people=False, figure_back=False, frame=None):
    W, H = KW, KH
    a = np.zeros((H, W, 3), np.float32)
    y = np.linspace(0, 1, H)[:, None, None]
    a += np.array([170, 160, 140]) * (1 - y) + np.array([120, 110, 95]) * y
    img = to_img(a + noise_img(W, H, 3, 6, 16)[..., None])
    d = ImageDraw.Draw(img, "RGBA")
    # tall windows
    for k in range(5):
        x0 = W * (0.05 + k * 0.12)
        d.rectangle([x0, H * 0.06, x0 + W * 0.09, H * 0.62], fill=(250, 240, 210))
    sun = Image.new("RGB", (W, H))
    sd = ImageDraw.Draw(sun)
    for k in range(5):
        x0 = W * (0.05 + k * 0.12)
        sd.polygon([(x0, H * 0.06), (x0 + W * 0.09, H * 0.06), (x0 + W * 0.35, H), (x0 + W * 0.18, H)], fill=(70, 55, 30))
    img = ImageChops.add(img, sun.filter(ImageFilter.GaussianBlur(30)))
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, H * 0.72, W, H], fill=(140, 128, 110, 120))
    d.rounded_rectangle([W * 0.62, H * 0.5, W * 0.96, H * 0.74], 20, fill=(235, 235, 230))
    d.rectangle([W * 0.62, H * 0.5, W * 0.96, H * 0.54], fill=(70, 120, 150))
    for x in (0.6, 0.98):
        d.ellipse([W * x - 70, H * 0.42, W * x + 70, H * 0.6], fill=(60, 110, 60))
        d.rectangle([W * x - 30, H * 0.58, W * x + 30, H * 0.72], fill=(120, 90, 60))
    if people:
        P = Persp(cy=H * 0.45)
        for x, z, c in ((-1.8, 5, (230, 235, 240)), (0.9, 7, (100, 120, 150)), (2.4, 4.5, (230, 235, 240)),
                        (-0.4, 9, (150, 110, 100)), (1.6, 11, (90, 90, 110))):
            figure(d, P, x, z, "patient", color=c, alpha=200)
    if figure_back:
        P = Persp(cy=H * 0.45)
        figure(d, P, 0.3, 3.2, "john_back")
    img = img.filter(ImageFilter.GaussianBlur(2.0))
    if frame == "elevator":
        img = elevator_frame(img, (120, 120, 112))
    return img


def staff_record():
    W, H = KW, KH
    img = Image.new("RGB", (W, H), (30, 30, 28))
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.1, H * 0.08, W * 0.9, H * 0.86], fill=(12, 12, 12))
    d.rectangle([W * 0.12, H * 0.11, W * 0.88, H * 0.83], fill=(232, 238, 242))
    d.rectangle([W * 0.12, H * 0.11, W * 0.88, H * 0.18], fill=(40, 90, 130))
    f, fb, fs = font(F_SANS, 46), font(F_SANS_B, 52), font(F_SANS, 40)
    d.text((W * 0.14, H * 0.145), "CITY GENERAL HOSPITAL  ·  STAFF DIRECTORY", font=fb, fill=(255, 255, 255), anchor="lm")
    rows = [("Name", "Dr. John K. Smith"), ("Department", "Emergency Medicine"), ("Position", "Resident Physician"),
            ("Start date", "19 Nov 2026  (yesterday)"), ("Assigned floors", "1 – 12"), ("Shift", "Nights")]
    for i, (k, v) in enumerate(rows):
        yy = H * (0.25 + i * 0.07)
        d.text((W * 0.16, yy), k, font=fs, fill=(100, 110, 120))
        d.text((W * 0.4, yy), v, font=f, fill=(20, 25, 30))
    d.rectangle([W * 0.16, H * 0.69, W * 0.84, H * 0.79], outline=(150, 160, 170), width=4)
    d.text((W * 0.18, H * 0.74), "Search records:  \"Floor 13\"   —   0 results found", font=f, fill=(170, 30, 30), anchor="lm")
    img = img.filter(ImageFilter.GaussianBlur(1.0))
    g = Image.new("RGB", (W, H))
    ImageDraw.Draw(g).rectangle([W * 0.12, H * 0.11, W * 0.88, H * 0.83], fill=(20, 30, 40))
    return glow(img, g, 60, 0.5)


def paper_bg(w, h, seed, tint=(222, 212, 182)):
    a = np.zeros((h, w, 3), np.float32) + np.array(tint)
    a += noise_img(w, h, 2, 18, seed)[..., None]
    b = blotches(w, h, seed)[..., None]
    a = a * (1 - 0.15 * b) + np.array([150, 120, 70]) * 0.15 * b
    return to_img(a)


def doc(page="cover", far=False, close=False):
    W, H = KW, KH
    desk = np.zeros((H, W, 3), np.float32) + np.array([62, 44, 30])
    y, x = np.mgrid[0:H, 0:W]
    desk += (np.sin(x / 9.0 + np.sin(y / 60.0) * 3) * 8)[..., None]
    img = to_img(desk + noise_img(W, H, 2, 12, 17)[..., None])
    pw, ph = int(W * 0.5), int(H * 0.92)
    tint = (196, 160, 105) if page == "cover" else (226, 218, 192)
    pg = paper_bg(pw, ph, 30 + len(page), tint)
    d = ImageDraw.Draw(pg)
    mono, mono_b = font(F_MONO, 34), font(F_MONO_B, 40)
    if page == "cover":
        d.rectangle([40, 40, pw - 40, 160], outline=(90, 70, 40), width=4)
        d.text((pw / 2, 100), "PATIENT FILE  ·  FLOOR 13", font=font(F_MONO_B, 50), fill=(60, 40, 20), anchor="mm")
        try:
            crops = load_yaml("characters.yaml")["key_art_crops"]
            ka = Image.open(CHARS / "key_art_master.png")
            ph_img = ka.crop(tuple(crops["john_face"])).crop((60, 0, 330, 259)).convert("L").convert("RGB")
            ph_img = ImageEnhance.Contrast(ph_img).enhance(1.2).resize((330, 320))
            pg.paste(ph_img, (60, 220))
            d.rectangle([60, 220, 390, 540], outline=(40, 40, 40), width=5)
            d.line([(150, 205), (300, 235)], fill=(120, 120, 120), width=10)  # paper clip
        except Exception:
            pass
        lines = [("NAME", "JOHN K. SMITH"), ("D.O.B.", "14 / 03 / 1999"), ("ADDRESS", "27 Alder Lane, Apt 4B"),
                 ("HOSP. ID", "EM-2026-0213"), ("ADMITTED", "02:13 AM"), ("WARD", "13 — EMERGENCY")]
        for i, (k, v) in enumerate(lines):
            d.text((430, 240 + i * 62), f"{k:<9}", font=mono, fill=(80, 60, 35))
            d.text((640, 240 + i * 62), v, font=mono_b, fill=(25, 20, 15))
        d.text((pw / 2, ph - 120), "CONFIDENTIAL", font=font(F_SANS_B, 70), fill=(150, 40, 30), anchor="mm")
    else:
        d.text((60, 60), "ST. ALDER CITY HOSPITAL — PSYCHIATRIC OBSERVATION", font=mono_b, fill=(30, 30, 30))
        d.line([(60, 120), (pw - 60, 120)], fill=(30, 30, 30), width=3)
        if page in ("p1", "p3"):
            body = ["DATE: 20 NOV 2008              TIME: 02:13 AM", "", "PATIENT: SMITH, JOHN K.", "",
                    "Patient admitted at 2:13 AM.", "",
                    "Patient repeatedly claims to be a", "doctor and insists he has been",
                    "working at this hospital.", "", "Patient is calm, articulate. Wears a",
                    "white coat he will not remove.", "", "Refuses to leave the ward."]
        else:
            body = ["DATE: 21 NOV 2008  (day 2)", "", "Patient reports seeing Floor 13",
                    "in the elevator.", "", "Patient states he 'took a call' at",
                    "2:13 AM. Asks repeatedly for the", "elevator to Floor 1.", "",
                    "Night staff report the patient", "speaking to people who are not there:",
                    "'a little girl', 'an old doctor'."]
        for i, line in enumerate(body):
            d.text((60, 160 + i * 52), line, font=mono, fill=(35, 32, 28))
        if page == "p2":
            d.ellipse([40, 145, 560, 215], outline=(160, 30, 25), width=5)
        if page == "p3":
            d.text((60, ph - 260), "Discharge review:", font=mono, fill=(35, 32, 28))
            d.text((70, ph - 180), "STATUS: NEVER DISCHARGED", font=font(F_SERIF_I, 74), fill=(165, 15, 12))
            d.line([(60, ph - 95), (pw - 120, ph - 100)], fill=(165, 15, 12), width=5)
    pg = pg.rotate(R.uniform(-3, 3), expand=True, fillcolor=(0, 0, 0, 0)) if False else pg
    if far:
        small = pg.resize((int(pw * 0.55), int(ph * 0.55)))
        img.paste(small, (int(W / 2 - small.width / 2), int(H * 0.4)))
        a = np.asarray(img).astype(np.float32)
        a *= (0.15 + 1.2 * radial(W, H, W / 2, H * 0.62, W * 0.35, 1.2))[..., None]
        return to_img(a)
    if close:
        crop = pg.crop((0, 120, pw, 120 + int(pw * 9 / 16)))
        return crop.resize((W, H), Image.LANCZOS)
    if page == "p3":
        crop = pg.crop((0, ph - int(pw * 9 / 16) - 20, pw, ph - 20))
        return crop.resize((W, H), Image.LANCZOS)
    img.paste(pg, (int(W / 2 - pw / 2), int(H * 0.04)))
    a = np.asarray(img).astype(np.float32)
    a *= (0.35 + 0.9 * radial(W, H, W * 0.5, H * 0.45, W * 0.45, 1.0))[..., None]
    return to_img(a)


def register(written=False):
    W, H = KW, KH
    img = Image.new("RGB", (W, H), (50, 38, 28))
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.06, H * 0.05, W * 0.94, H * 0.97], fill=(70, 25, 20))
    for side in (0, 1):
        x0 = W * (0.08 + side * 0.43)
        pg = paper_bg(int(W * 0.41), int(H * 0.88), 40 + side, (220, 205, 170))
        pd = ImageDraw.Draw(pg)
        for k in range(18):
            pd.line([(30, 120 + k * 64), (pg.width - 30, 120 + k * 64)], fill=(150, 160, 175), width=2)
        pd.line([(150, 60), (150, pg.height - 40)], fill=(190, 90, 90), width=2)
        if side == 0:
            f = font(F_SERIF_I, 38)
            entries = ["Dr. A. Mehra — Fl. 13 — 2:13 AM", "Dr. R. Okafor — Fl. 13 — 2:13 AM",
                       "Dr. L. Chen — Fl. 13 — 2:13 AM", "Dr. P. Haldane — Fl. 13 — 2:13 AM",
                       "Dr. S. Ivanova — Fl. 13 — 2:13 AM", "Dr. M. Duarte — Fl. 13 — 2:13 AM"]
            for i, e in enumerate(entries):
                pd.text((170, 75 + i * 128), e, font=f, fill=(70, 60, 80))
        if side == 1 and written:
            f = font(F_SERIF_I, 70)
            pd.text((170, 160), "Dr. John K. Smith", font=f, fill=(160, 12, 10))
            pd.text((170, 320), "Floor 13", font=f, fill=(160, 12, 10))
            pd.text((170, 480), "Shift tonight: 2:13 AM", font=f, fill=(160, 12, 10))
        img.paste(pg, (int(x0), int(H * 0.07)))
    d = ImageDraw.Draw(img)
    d.line([(W / 2, H * 0.07), (W / 2, H * 0.95)], fill=(60, 40, 30), width=12)
    a = np.asarray(img).astype(np.float32)
    a *= (0.45 + 0.7 * radial(W, H, W * 0.55, H * 0.45, W * 0.6, 1.0))[..., None]
    return to_img(a)


def cctv(view="reception", doors="closed"):
    W, H = KW, KH
    if view == "elevator":
        base = elevator_out("lobby_night", doors=doors, display="1" if doors == "closed" else "13")
    elif view == "desk":
        base = phone("night")
        dd = ImageDraw.Draw(base, "RGBA")
        P = Persp(cx=W * 0.8, cy=H * 0.4)
        figure(dd, P, 0, 3.0, "patient", color=(200, 205, 210), alpha=200)
    else:
        base = lobby(frame=None)
        base = ImageEnhance.Brightness(base).enhance(0.35)
        bd = ImageDraw.Draw(base)
        bd.rectangle([W * 0.06, H * 0.2, W * 0.2, H * 0.72], fill=(60, 64, 66))
        bd.line([(W * 0.13, H * 0.2), (W * 0.13, H * 0.72)], fill=(20, 20, 20), width=6)
    # high-angle feel: slight keystone by resizing top narrower
    g = base.convert("L")
    g = ImageEnhance.Contrast(g).enhance(1.3)
    img = Image.merge("RGB", (g, g.point(lambda v: min(255, v * 1.05)), g))
    d = ImageDraw.Draw(img)
    f = font(F_MONO_B, 52)
    cam = {"reception": "CAM 03  RECEPTION", "elevator": "CAM 04  LIFT LOBBY", "desk": "CAM 02  FRONT DESK"}[view]
    d.text((70, 60), cam, font=f, fill=(235, 235, 235))
    d.text((W - 70, H - 60), "2026-11-21  02:13:07", font=f, fill=(235, 235, 235), anchor="rd")
    d.ellipse([W - 230, 62, W - 194, 98], fill=(230, 30, 30))
    d.text((W - 180, 60), "REC", font=f, fill=(235, 235, 235))
    return img


def black(text=None):
    img = Image.new("RGB", (KW, KH), (0, 0, 0))
    if text:
        g = Image.new("RGB", (KW, KH))
        ImageDraw.Draw(g).text((KW / 2, KH / 2), text, font=font(F_SERIF_B, 150), fill=(170, 10, 10), anchor="mm")
        img = ImageChops.add(img, g)
        img = glow(img, g, 40, 0.6)
    return img


# =============================================================================== key-art crops
def crop(name, doll_john=False):
    crops = load_yaml("characters.yaml")["key_art_crops"]
    ka = Image.open(CHARS / "key_art_master.png").convert("RGB")
    box = crops[name]
    im = ka.crop(tuple(box))
    if doll_john:
        # stitch a faded, sepia copy of John's face over the doll's face (story beat S082)
        jf = ka.crop(tuple(crops["john_face"])).crop((90, 20, 300, 230))
        jf = ImageEnhance.Color(jf).enhance(0.25).resize((70, 70))
        mask = Image.new("L", jf.size, 0)
        ImageDraw.Draw(mask).ellipse([4, 4, 66, 66], fill=200)
        mask = mask.filter(ImageFilter.GaussianBlur(4))
        im.paste(jf, (407 - box[0] - 35, 702 - box[1] - 38), mask)
        dd = ImageDraw.Draw(im)
        for k in range(8):  # stitches
            a0 = k * 45
            x = 407 - box[0] + 34 * math.cos(math.radians(a0))
            y = 702 - box[1] - 3 + 34 * math.sin(math.radians(a0))
            dd.line([(x - 3, y - 3), (x + 3, y + 3)], fill=(60, 30, 20), width=2)
    im = im.resize((KW, KH), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(4, 60, 2))
    return im


# =============================================================================== grading
GRADES = {
    "night":   dict(mul=(0.82, 0.97, 1.12), lift=(4, 10, 18), sat=0.75, gamma=1.08, contrast=1.05),
    "ward":    dict(mul=(0.80, 0.98, 0.92), lift=(6, 12, 10), sat=0.55, gamma=1.15, contrast=1.08),
    "red":     dict(mul=(1.15, 0.45, 0.45), lift=(10, 0, 0), sat=0.9, gamma=1.2, contrast=1.15),
    "morning": dict(mul=(1.10, 1.02, 0.88), lift=(10, 8, 4), sat=0.9, gamma=0.95, contrast=1.0),
    "paper":   dict(mul=(0.95, 0.97, 1.02), lift=(4, 6, 10), sat=0.85, gamma=1.05, contrast=1.05),
    "cctv":    dict(mul=(0.9, 1.0, 0.9), lift=(8, 10, 8), sat=0.0, gamma=1.0, contrast=1.15),
}


def grade(img: Image.Image, name: str) -> Image.Image:
    g = GRADES.get(name)
    if not g:
        return img
    img = ImageEnhance.Color(img).enhance(g["sat"])
    a = np.asarray(img).astype(np.float32) / 255
    a = (a - 0.5) * g["contrast"] + 0.5
    a = np.clip(a, 0, 1) ** g["gamma"]
    a = a * np.array(g["mul"]) + np.array(g["lift"]) / 255
    return to_img(a * 255)


# =============================================================================== dispatcher
def render_kf(kf: dict) -> Image.Image:
    if "crop" in kf:
        return crop(kf["crop"], kf.get("doll_john", False))
    env = kf["env"]
    if env == "corridor":
        return corridor(kf.get("style", "old"), kf.get("red", False), kf.get("props", False), kf.get("figures", 0),
                        kf.get("girl_bed", False), kf.get("empty_bed", False), kf.get("girl_stand", False),
                        kf.get("figure_back", False), kf.get("flashlight", False), kf.get("frame"))
    if env == "elevator_in":
        return elevator_in(kf.get("display", "1"), kf.get("dark", False), kf.get("red", False))
    if env == "display":
        return display_closeup(kf["seq"][0][1], kf.get("red", False), kf.get("down", False))
    if env == "panel":
        return panel(kf.get("lit", ""))
    if env == "elevator_out":
        return elevator_out(kf.get("style", "lobby"), kf.get("doors", "closed"), kf.get("display", "13"),
                            kf.get("figure", False))
    if env == "wall":
        return wall()
    if env == "ward":
        return ward(kf.get("turned", False), kf.get("close", False), kf.get("corner", False))
    if env == "records":
        return records(kf.get("flashlight", False))
    if env == "doorway":
        return doorway(kf.get("figure", False))
    if env == "office":
        return office()
    if env == "clock":
        return clock(kf.get("time", "2:13"))
    if env == "phone":
        return phone(kf.get("light", "night"))
    if env == "sign":
        return sign(kf.get("text", ""))
    if env == "door_sign":
        return door_sign(kf.get("text", ""))
    if env == "exit":
        return exit_sign()
    if env == "lobby":
        return lobby(kf.get("people", False), kf.get("figure_back", False), kf.get("frame"))
    if env == "staff_record":
        return staff_record()
    if env == "doc":
        return doc(kf.get("page", "cover"), kf.get("far", False), kf.get("close", False))
    if env == "register":
        return register(kf.get("written", False))
    if env == "cctv":
        return cctv(kf.get("view", "reception"), kf.get("doors", "closed"))
    if env == "black":
        return black(kf.get("text"))
    raise ValueError(f"unknown keyframe env {env}")
