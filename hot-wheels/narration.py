"""Narration (Kokoro TTS, clear male voice) and the scene/subtitle timeline."""
import json, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
# bright, well-articulated American male voice
VOICE = k.get_voice_style("am_michael") * 0.7 + k.get_voice_style("am_fenrir") * 0.3
SPEED, LANG = 0.97, "en-us"
# Each scene: list of (spoken text, on-screen subtitle text, pause after)
SCENES = [
 [("It fits in the palm of your hand. It costs about a dollar.", "It fits in the palm of your hand. It costs about a dollar.", 0.3),
  ("And it's one of the best-selling toys on Earth.", "And it's one of the best-selling toys on Earth.", 0.5),
  ("This is the history of Hot Wheels.", "This is the history of Hot Wheels.", 0.7)],
 [("In the nineteen sixties, toy cars were small, slow, and a little plain.", "In the 1960s, toy cars were small, slow, and a little plain.", 0.45),
  ("Mattel co-founder Elliot Handler wanted something better.", "Mattel co-founder Elliot Handler wanted something better.", 0.3),
  ("A toy car that looked wild, and rolled fast.", "A toy car that looked wild, and rolled fast.", 0.6)],
 [("So he brought in a real car designer from Detroit, and a missile engineer.", "So he brought in a real car designer from Detroit, and a missile engineer.", 0.4),
  ("Together, they built thin axles and low-friction wheels, that made tiny cars fly.", "Together, they built thin axles and low-friction wheels that made tiny cars fly.", 0.6)],
 [("Legend has it, when Handler saw a prototype zoom across the floor, he said:", "Legend has it, when Handler saw a prototype zoom across the floor, he said:", 0.3),
  ("Those are some hot wheels!", "“Those are some hot wheels!”", 0.45),
  ("The name stuck.", "The name stuck.", 0.6)],
 [("In nineteen sixty-eight, the first sixteen cars hit the shelves, led by a dark blue Custom Camaro.", "In 1968, the first sixteen cars hit the shelves, led by a dark blue Custom Camaro.", 0.4),
  ("With candy-bright paint and red-striped tires, kids were hooked.", "With candy-bright paint and red-striped tires, kids were hooked.", 0.6)],
 [("Bright orange track, loops, and jumps, turned bedroom floors into raceways.", "Bright orange track, loops and jumps turned bedroom floors into raceways.", 0.8)],
 [("Some cars became treasures.", "Some cars became treasures.", 0.4),
  ("A rare pink Beach Bomb prototype from nineteen sixty-nine, is valued at more than one hundred fifty thousand dollars.", "A rare pink Beach Bomb prototype from 1969 is valued at more than $150,000.", 0.6)],
 [("Today, more than eight billion Hot Wheels have been made.", "Today, more than eight billion Hot Wheels have been made.", 0.35),
  ("Around sixteen are sold every single second.", "Around sixteen are sold every single second.", 0.6)],
 [("Proof that the biggest dreams, can start very, very small.", "Proof that the biggest dreams can start very, very small.", 0.5)],
]
PRE, INTRO, OUTRO, SR = 0.5, 0.6, 3.0, 24000

def chunks(text, t0, t1, maxc=30):
    words, out, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxc: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    if len(out) > 1 and len(out[-1]) < 8: last = out.pop(); out[-1] += " " + last
    total, t, res = sum(len(c) for c in out), t0, []
    for c in out:
        d = (t1 - t0) * len(c) / total
        res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return res

t, audio, timeline = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
for i, sc in enumerate(SCENES):
    start = t; silence(PRE + (INTRO if i == 0 else 0)); subs, lines = [], []
    for say, show, pause in sc:
        s, _ = k.create(say, voice=VOICE, speed=SPEED, lang=LANG); s = s.astype(np.float32)
        subs += chunks(show, t, t + len(s) / SR); lines.append({"t0": round(t, 3), "t1": round(t + len(s) / SR, 3)})
        audio.append(s); t += len(s) / SR; silence(pause)
    if i == len(SCENES) - 1: silence(OUTRO)
    timeline.append({"start": round(start, 3), "end": round(t, 3), "subs": subs, "lines": lines})
    print(i, round(start, 2), round(t, 2), [round(l["t0"] - start, 2) for l in lines])
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "scenes": timeline}, open("build/timeline.json", "w"), indent=1)
print("total", t)
