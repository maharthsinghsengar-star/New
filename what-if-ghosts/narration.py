"""Narration (Kokoro TTS) and the beat / caption / sound-effect timeline for
"What if everyone except you became ghosts and zombies?"."""
import json, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
VOICE = k.get_voice_style("am_michael") * 0.65 + k.get_voice_style("am_onyx") * 0.35
SPEED, LANG, SR = 1.04, "en-us", 24000
# beat: id, mood (music), lines (spoken, caption, pause after), sfx (name, line index or None, 0 = line start / 1 = line end, offset s)
BEATS = [
 dict(id="hook", mood="happy", pre=0.6, lines=[
  ("What if, one morning, every human on Earth turned into a ghost, or a zombie?", "What if, one morning, every human on Earth turned into a ghost, or a zombie?", 0.25),
  ("Everyone... except you.", "Everyone... except you.", 0.7)], sfx=[("whoosh", None, 0, 0.0), ("sting", 1, 0, 0.0)]),
 dict(id="normal", mood="happy", lines=[
  ("It starts like any other day. The sun is shining, the streets are packed, and you're heading out to grab a coffee.", "It starts like any other day. The sun is shining, the streets are packed, and you're heading out to grab a coffee.", 0.5)], sfx=[("horn", 0, 0, 2.4)]),
 dict(id="people", mood="happy", lines=[
  ("People are chatting, scrolling on their phones, and rushing to work.", "People are chatting, scrolling on their phones, and rushing to work.", 0.2),
  ("Totally normal.", "Totally normal.", 0.6)], sfx=[("bell", 0, 0, 1.5)]),
 dict(id="freeze", mood="stop", lines=[
  ("But then, at exactly eight o'clock, everyone around you suddenly...", "But then, at exactly 8:00 a.m., everyone around you suddenly...", 0.35),
  ("stops.", "stops.", 1.3)], sfx=[("tick", 0, 1, -1.6), ("freeze", 1, 0, 0.0)]),
 dict(id="stare", mood="tense", lines=[
  ("No one moves. No one blinks.", "No one moves. No one blinks.", 0.35),
  ("Their skin turns pale, and their eyes go completely white.", "Their skin turns pale, and their eyes go completely white.", 0.8)], sfx=[("sting", 1, 1, -1.0)]),
 dict(id="ghosts", mood="eerie", lines=[
  ("Then, some of them start to rise off the ground. Their bodies turn see-through, and begin to glow.", "Then some of them start to rise off the ground. Their bodies turn see-through and begin to glow.", 0.3),
  ("They've become ghosts.", "They've become ghosts.", 0.8)], sfx=[("rise", 0, 0, 0.6), ("wail", 1, 0, 0.2)]),
 dict(id="zombies", mood="eerie", lines=[
  ("The rest twitch, groan, and slowly turn their heads... towards you.", "The rest twitch, groan, and slowly turn their heads... toward you.", 0.3),
  ("Zombies.", "Zombies.", 0.9)], sfx=[("groan", 0, 0, 0.8), ("snap", 0, 1, -0.6), ("sting", 1, 0, 0.0)]),
 dict(id="dark", mood="horror", lines=[
  ("The sky goes dark. The streetlights flicker.", "The sky goes dark. The streetlights flicker.", 0.3),
  ("And you realize, you're the only human left on the entire planet.", "And you realize you're the only human left on the entire planet.", 0.7)], sfx=[("thunder", 0, 0, 0.3), ("thunder", 1, 1, -0.6)]),
 dict(id="chase", mood="chase", lines=[
  ("Zombies can sense the warmth of a living body.", "Zombies can sense the warmth of a living body.", 0.25),
  ("So they all start coming... for you.", "So they all start coming... for you.", 1.4)], sfx=[("roar", 1, 1, -0.4)]),
 dict(id="store", mood="chase", lines=[
  ("You sprint into a store, and slam the door shut.", "You sprint into a store and slam the door shut.", 0.4),
  ("Safe... for now.", "Safe... for now.", 1.0)], sfx=[("slam", 0, 1, -0.3), ("bang", 0, 1, 0.5)]),
 dict(id="ghost", mood="dread", lines=[
  ("But ghosts... don't need doors.", "But ghosts... don't need doors.", 2.4)], sfx=[("scare", 0, 1, 1.25)]),
 dict(id="end", mood="end", pre=0.4, lines=[
  ("So... would you survive?", "So... would you survive?", 2.6)], sfx=[]),
]

def chunks(text, t0, t1, maxc=30):
    words, out, cur = text.split(), [], ""
    for w in words:
        if cur and (len(cur) + 1 + len(w) > maxc or cur[-1] in ".?,"):
            out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    merged = []
    for c in out:                      # glue very short fragments onto the previous one
        if merged and len(c) < 9 and len(merged[-1]) + len(c) < 34 and not merged[-1].endswith(('.', '?')): merged[-1] += " " + c
        else: merged.append(c)
    total, t, res = sum(len(c) + 4 for c in merged), t0, []
    for c in merged:
        d = (t1 - t0) * (len(c) + 4) / total
        res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return res

def trim(s, thr=0.01):
    idx = np.where(np.abs(s) > thr)[0]
    return s if len(idx) == 0 else s[max(0, idx[0] - 500): idx[-1] + 2400]

t, audio, beats = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
for b in BEATS:
    start = t; subs, lines = [], []
    silence(b.get("pre", 0.25))
    for spoken, cap, pause in b["lines"]:
        s, _ = k.create(spoken, voice=VOICE, speed=SPEED, lang=LANG)
        s = trim(s.astype(np.float32)); s *= 0.9 / np.abs(s).max(); d = len(s) / SR
        subs += chunks(cap, t, t + d - 0.05)
        lines.append({"t0": round(t, 3), "t1": round(t + d, 3)})
        audio.append(s); t += d; silence(pause)
    sfx = []
    for name, li, pos, off in b["sfx"]:
        base = start if li is None else (lines[li]["t1"] if pos else lines[li]["t0"])
        sfx.append({"name": name, "t": round(base + off, 3)})
    beats.append({"id": b["id"], "mood": b["mood"], "start": round(start, 3), "end": round(t, 3), "lines": lines, "subs": subs, "sfx": sfx})
    print(f"{b['id']:8s} {start:6.2f} {t:6.2f}  " + " ".join(f"{l['t0']-start:.2f}-{l['t1']-start:.2f}" for l in lines))
a = np.concatenate(audio)
os.makedirs("build", exist_ok=True)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "beats": beats}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2))
