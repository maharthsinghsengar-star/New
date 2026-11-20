"""Shared paths, config loading and audio DSP helpers for The Hospital's 13th Floor pipeline."""
from __future__ import annotations

import json
import subprocess
import wave
from pathlib import Path

import numpy as np
import yaml
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
PROD = ROOT / "production"
VOICE = ROOT / "voice"
SFX = ROOT / "sound_effects"
MUSIC = ROOT / "music"
EDIT = ROOT / "editing"
EXPORTS = ROOT / "exports"
SCENES = ROOT / "scene_images"
CLIPS = ROOT / "video_clips"
PROMPTS = ROOT / "prompts"
CHARS = ROOT / "characters"

SR = 48000          # project audio sample rate
FPS = 24
W, H = 1920, 1080


def load_yaml(name: str):
    with open(PROD / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def load_json(path: Path, default=None):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def shot_ids(shots):
    return [s["id"] for s in shots]


# ----------------------------------------------------------------------------- audio I/O
def read_audio(path: Path | str, start: float | None = None, end: float | None = None,
               ffilter: str | None = None) -> np.ndarray:
    """Decode any audio file with ffmpeg to float32 stereo (n, 2) at SR."""
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    if end is not None:
        cmd += ["-to", f"{end:.3f}"]
    cmd += ["-i", str(path)]
    if ffilter:
        cmd += ["-af", ffilter]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def write_wav(path: Path | str, x: np.ndarray, sr: int = SR) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(pcm.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def read_wav(path: Path | str) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
        x = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float32) / 32768
    x = x.reshape(-1, ch)
    if ch == 1:
        x = np.repeat(x, 2, 1)
    if sr != SR:
        x = read_audio(path)
    return x


def duration(path: Path | str) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True)
    return float(out.stdout.strip())


# ----------------------------------------------------------------------------- DSP helpers
RNG = np.random.default_rng(13)


def secs(n: float) -> int:
    return int(round(n * SR))


def mono(x):
    return x.mean(1) if x.ndim == 2 else x


def stereo(x, pan: float = 0.0):
    """Equal-power pan a mono signal; pan in [-1, 1]."""
    x = mono(x)
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)


def butter(x, kind, freq, order=4):
    sos = signal.butter(order, freq, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0).astype(np.float32)


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.3):
    a, d, r = secs(a), secs(d), secs(r)
    sus = max(n - a - d - r, 0)
    e = np.concatenate([np.linspace(0, 1, a, endpoint=False), np.linspace(1, s, d, endpoint=False),
                        np.full(sus, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n].astype(np.float32)


def fade(x, fin=0.01, fout=0.01):
    x = x.copy()
    a, b = min(secs(fin), len(x)), min(secs(fout), len(x))
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


def make_ir(t60=1.5, predelay=0.01, bright=0.5, seed=0):
    """Synthetic stereo room impulse response (decaying filtered noise)."""
    rng = np.random.default_rng(seed)
    n = secs(t60 * 1.2)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * t / t60)
    ir = rng.standard_normal((n, 2)).astype(np.float32) * decay[:, None]
    cutoff = 1500 + bright * 9000
    ir = butter(ir, "low", cutoff, 2)
    ir = np.concatenate([np.zeros((secs(predelay), 2), np.float32), ir])
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))


def reverb(x, t60=1.5, wet=0.3, predelay=0.01, bright=0.5, seed=0):
    x = x if x.ndim == 2 else stereo(x)
    ir = make_ir(t60, predelay, bright, seed)
    tail = secs(t60 * 1.2 + predelay)
    xp = np.pad(x, ((0, tail), (0, 0)))
    y = np.stack([signal.fftconvolve(xp[:, c], ir[:, c])[: len(xp)] for c in range(2)], 1)
    y *= 0.35
    return ((1 - wet) * xp + wet * y).astype(np.float32)


def delay(x, t=0.25, fb=0.35, mix=0.3, taps=4):
    x = x if x.ndim == 2 else stereo(x)
    d = secs(t)
    y = np.pad(x, ((0, d * taps), (0, 0))).copy()
    src = y.copy()
    for k in range(1, taps + 1):
        g = mix * fb ** (k - 1)
        sh = np.zeros_like(src)
        sh[d * k:] = src[: len(src) - d * k]
        if k % 2:  # ping-pong
            sh = sh[:, ::-1]
        y += g * sh
    return y


def normalize(x, peak=0.9):
    m = np.abs(x).max()
    return x * (peak / m) if m > 1e-6 else x


def rms_norm(x, target_db=-20.0):
    r = np.sqrt(np.mean(x ** 2)) + 1e-9
    return x * (10 ** (target_db / 20) / r)


def pitch_tempo(path_or_x, start=None, end=None, pitch=1.0, tempo=1.0, extra=None):
    """Pitch-shift / time-stretch through ffmpeg (asetrate + atempo)."""
    flt = []
    if pitch != 1.0:
        flt += [f"asetrate={int(SR * pitch)}", f"aresample={SR}"]
    t = tempo / pitch if pitch != 1.0 else tempo
    while t < 0.5:
        flt.append("atempo=0.5")
        t /= 0.5
    while t > 2.0:
        flt.append("atempo=2.0")
        t /= 2.0
    if abs(t - 1.0) > 1e-3:
        flt.append(f"atempo={t:.4f}")
    if extra:
        flt.append(extra)
    return read_audio(path_or_x, start, end, ",".join(flt) if flt else None)


def place(bus: np.ndarray, clip: np.ndarray, at: float, gain: float = 1.0):
    """Mix clip into bus (in place) at time `at` seconds."""
    i = secs(at)
    if i >= len(bus) or i + len(clip) <= 0:
        return
    j = min(len(bus), i + len(clip))
    c0 = max(0, -i)
    bus[max(i, 0):j] += clip[c0: c0 + (j - max(i, 0))] * gain


def crossfade_loop(x, xf=3.0):
    """Make a seamless loop: overlap the last `xf` seconds onto the start."""
    n = secs(xf)
    head, body, tail = x[:n], x[n:-n] if len(x) > 2 * n else x, x[-n:]
    r = np.linspace(0, 1, n)[:, None] if x.ndim == 2 else np.linspace(0, 1, n)
    start = head * r + tail * (1 - r)
    return np.concatenate([start, body])


def loop_to(x, n):
    reps = int(np.ceil(n / len(x)))
    return np.concatenate([x] * reps)[:n]
