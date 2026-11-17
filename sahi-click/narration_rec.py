"""Dialogue from the supplied ElevenLabs recordings: cut each character's take into lines and interleave them in script order.
Writes build/voice.wav + build/timeline.json (same format as narration.py: lines, phrases, marks, mouth envelopes, scenes).

Note: rec/jitu.mp3 and rec/raj.mp3 were uploaded swapped (checked by transcription), so they are mapped below by content.
"""
import json, os, re, subprocess, numpy as np, soundfile as sf
from narration import L as SCRIPT, phrases

SR, FPS = 44100, 30
def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
SRC = {"J": load("rec/raj.mp3"), "R": load("rec/jitu.mp3"), "W": load("rec/wife.mp3")}

# (speaker, start s, end s) in the speaker's recording, in script order (indices match narration.L)
CUTS = [("J", 0.0, 5.95), ("R", 0.0, 5.75), ("J", 6.30, 7.78), ("R", 6.10, 16.20), ("R", 16.25, 21.60), ("W", 0.0, 11.81),
        ("J", 8.22, 17.17), ("J", 17.62, 19.72), ("J", 20.08, 30.85), ("J", 31.20, 36.15), ("J", 36.50, 42.72), ("R", 22.20, 24.77),
        ("J", 43.06, 51.17), ("J", 51.52, 53.79)]
GAP_SPEAKER, GAP_SAME = 0.6, 0.45

def trim(a, th=0.012, pad=0.06):
    nz = np.nonzero(np.abs(a) > th)[0]
    if not len(nz): return a
    return a[max(0, nz[0] - int(pad * SR)): nz[-1] + int(pad * SR)]

def group_voice(a):
    """'all three together': layer the take with two slightly detuned, delayed copies for a small-crowd feel"""
    out = a.copy()
    for d, r, g in ((0.028, 1.03, 0.55), (0.047, 0.975, 0.5)):
        idx = np.arange(0, len(a) - 1, r); b = np.interp(idx, np.arange(len(a)), a)
        b = np.concatenate([np.zeros(int(d * SR)), b]); n = max(len(out), len(b))
        out = np.pad(out, (0, n - len(out))) + np.pad(b, (0, n - len(b))) * g
    return out / (np.abs(out).max() + 1e-9) * 0.9

def activity(a, hop):
    e = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2) + 1e-12) for i in range(0, len(a), hop)])
    return e > max(0.01, np.percentile(e, 60) * 0.12)

def envelope(a):
    hop = SR // FPS; e = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2) + 1e-12) for i in range(0, len(a), hop)])
    e = e / (np.percentile(e[e > 1e-4], 92) + 1e-9); return [round(float(min(1.2, x)), 3) for x in e]

def phrase_times(a, ph, t0):
    """place phrase starts proportionally to text length over the speech, snapped to the nearest real pause"""
    hop = int(0.01 * SR); act = activity(a, hop); n = len(act)
    starts = [i for i in range(1, n) if act[i] and not act[i - 1] and not act[max(0, i - 15):i].any()]   # speech resumes after >=0.15 s silence
    tot = sum(len(p[0]) for p in ph); acc = 0; out = []; dur = len(a) / SR
    for k, p in enumerate(ph):
        est = acc / tot * dur
        if k and starts:
            best = min(starts, key=lambda s: abs(s * 0.01 - est))
            if abs(best * 0.01 - est) < 0.9 and (not out or best * 0.01 > out[-1] - t0 + 0.3): est = best * 0.01
        out.append(t0 + est); acc += len(p[0])
    return out

def main():
    os.makedirs("build", exist_ok=True)
    out = []; t = 0.0; lines = []; scenes = {}
    prev = None
    for i, ((who, a0, a1), (sc, swho, text, *_rest)) in enumerate(zip(CUTS, SCRIPT)):
        lead = _rest[3]
        a = trim(SRC[who][int(a0 * SR):int(a1 * SR)])
        if swho == "JRW": swho = "J"          # closing line: Jitu bhaiya alone (no group voice)
        gap = 0 if prev is None else (0.8 if i == 8 else GAP_SAME if prev == swho else GAP_SPEAKER)
        gap = max(gap, lead)
        out.append(np.zeros(int(gap * SR), np.float32)); t += gap
        ph = phrases(text); starts = phrase_times(a, ph, t); d = len(a) / SR
        segs = [dict(text=p[0], start=round(s, 3), end=round((starts[k + 1] if k + 1 < len(starts) else t + d), 3)) for k, (p, s) in enumerate(zip(ph, starts))]
        scenes.setdefault(sc, [t - gap, t + d]); scenes[sc][1] = t + d
        lines.append(dict(scene=sc, who=swho, start=round(t, 3), end=round(t + d, 3), text=text.replace(" | ", " "), segs=segs, marks=[s["start"] for s in segs], env=envelope(a)))
        print(f"S{sc} {swho:3s} {t:6.2f}-{t + d:6.2f}  marks " + " ".join(f"{m:.1f}" for m in lines[-1]["marks"]))
        out.append(a.astype(np.float32)); t += d; prev = swho
    out.append(np.zeros(int(0.9 * SR), np.float32)); t += 0.9; scenes[4][1] = t
    hold = 7.0; scenes[5] = [t, t + hold]; out.append(np.zeros(int(hold * SR), np.float32)); t += hold
    sf.write("build/voice.wav", np.concatenate(out), SR)
    sc = sorted(scenes); bounds = {}
    for i, s in enumerate(sc):
        st = 0 if i == 0 else bounds[sc[i - 1]][1]; bounds[s] = [round(st, 3), round(scenes[s][1], 3)]
    json.dump(dict(duration=round(t, 3), lines=lines, scenes=bounds), open("build/timeline.json", "w"), ensure_ascii=False)
    print("total", round(t, 2), bounds)

if __name__ == "__main__":
    main()
