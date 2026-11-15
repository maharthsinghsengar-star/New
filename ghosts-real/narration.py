"""Narration (Kokoro TTS, calm clear male storyteller) and the shot / caption / sound-effect timeline."""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
VOICE = k.get_voice_style("am_michael") * 0.75 + k.get_voice_style("am_fenrir") * 0.25
SPEED, LANG, SR = 0.95, "en-us", 24000
# beat: id, mood (music), lines (spoken, caption, pause after), sfx (name, line, 0 = start / 1 = end, offset s)
BEATS = [
 dict(id="title", mood="eerie", hold=3.4, lines=[], sfx=[("whoosh", None, 0, 0.4)]),
 dict(id="night", mood="eerie", lines=[
  ("It's two in the morning. Sam is home alone, and the house is quiet.", "It's 2 a.m. Sam is home alone, and the house is quiet.", 0.4),
  ("Too quiet.", "Too quiet.", 0.8)], sfx=[("tick", 0, 0, 0.0)]),
 dict(id="creak", mood="eerie", lines=[
  ("Then he hears it. A creak.", "Then he hears it. A creak.", 0.5),
  ("Footsteps, on the stairs.", "Footsteps, on the stairs.", 0.8)], sfx=[("creak", 0, 1, -0.5), ("steps", 1, 0, 0.1)]),
 dict(id="figure", mood="eerie", lines=[
  ("The air turns cold. In the dark hallway, something is standing there.", "The air turns cold. In the dark hallway, something is standing there.", 0.4),
  ("Tall. Still. Watching.", "Tall. Still. Watching.", 0.9)], sfx=[("wind", 0, 0, 0.2), ("sting", 1, 0, 0.0)]),
 dict(id="question", mood="eerie", lines=[
  ("Sam is sure of it. This house is haunted.", "Sam is sure of it. This house is haunted.", 0.5),
  ("But is it? Are ghosts real?", "But is it? Are ghosts real?", 1.0)], sfx=[("whoosh", 1, 0, 0.6)]),
 dict(id="history", mood="curious", lines=[
  ("People have told ghost stories for thousands of years.", "People have told ghost stories for thousands of years.", 0.35),
  ("Ancient Mesopotamians feared restless spirits of the dead. The Romans held a festival to drive them out of their homes.", "Ancient Mesopotamians feared restless spirits of the dead. The Romans held a festival to drive them out of their homes.", 0.35),
  ("Almost every culture on Earth has its own ghosts.", "Almost every culture on Earth has its own ghosts.", 0.7)], sfx=[("pop", 1, 0, 0.3), ("pop", 1, 0, 3.6), ("pop", 2, 0, 0.5), ("pop", 2, 0, 1.0), ("pop", 2, 0, 1.5)]),
 dict(id="today", mood="curious", lines=[
  ("And many people still believe.", "And many people still believe.", 0.3),
  ("In surveys, about a third of American adults say they believe in ghosts, and nearly one in five say they've felt one nearby.", "In surveys, about a third of American adults say they believe in ghosts, and nearly one in five say they've felt one nearby.", 0.8)], sfx=[("pop", 1, 0, 1.2)]),
 dict(id="science", mood="curious", lines=[
  ("So, what does science say?", "So, what does science say?", 0.35),
  ("Researchers have investigated haunted places for more than a century, with cameras, sensors, and careful experiments.", "Researchers have investigated haunted places for more than a century, with cameras, sensors and careful experiments.", 0.35),
  ("So far, no ghost has ever been reliably measured.", "So far, no ghost has ever been reliably measured.", 0.45),
  ("But the experiences are real. And they often have surprising explanations.", "But the experiences are real. And they often have surprising explanations.", 0.8)], sfx=[("beep", 1, 0, 2.0), ("beep", 1, 0, 3.0), ("flat", 2, 0, 0.3)]),
 dict(id="creaks", mood="curious", lines=[
  ("Take the creaking. At night, old houses cool down.", "Take the creaking. At night, old houses cool down.", 0.3),
  ("Wood and pipes shrink and settle, and that makes sounds a lot like footsteps.", "Wood and pipes shrink and settle, and that makes sounds a lot like footsteps.", 0.7)], sfx=[("creak", 1, 0, 1.5), ("creak", 1, 0, 2.6)]),
 dict(id="faces", mood="curious", lines=[
  ("And that tall figure? Our brains are built to find faces and bodies everywhere.", "And that tall figure? Our brains are built to find faces and bodies everywhere.", 0.3),
  ("In clouds, in power sockets, in a coat hanging on a door.", "In clouds, in power sockets, in a coat hanging on a door.", 0.35),
  ("It's called pareidolia.", "It's called pareidolia.", 0.8)], sfx=[("pop", 1, 0, 0.1), ("pop", 1, 0, 1.0), ("pop", 1, 0, 2.2), ("ding", 2, 0, 0.3)]),
 dict(id="tiger", mood="curious", lines=[
  ("Scientists think this kept our ancestors alive. Mistaking a bush for a tiger was safer than mistaking a tiger for a bush.", "Scientists think this kept our ancestors alive. Mistaking a bush for a tiger was safer than mistaking a tiger for a bush.", 0.35),
  ("So the brain guesses someone is there first, and asks questions later.", "So the brain guesses “someone is there” first, and asks questions later.", 0.8)], sfx=[("whoosh", 0, 1, -2.6)]),
 dict(id="infra", mood="curious", lines=[
  ("Some hauntings may even come from sound we can't hear.", "Some hauntings may even come from sound we can't hear.", 0.35),
  ("In nineteen ninety-eight, engineer Vic Tandy felt a sense of dread in his lab, and glimpsed a grey shape at the edge of his vision.", "In 1998, engineer Vic Tandy felt a sense of dread in his lab, and glimpsed a grey shape at the edge of his vision.", 0.35),
  ("The cause? A fan, humming at about nineteen hertz. Too low to hear, but strong enough to make him feel uneasy.", "The cause? A fan humming at about 19 hertz. Too low to hear, but strong enough to make him feel uneasy.", 0.8)], sfx=[("hum", 1, 0, 0.0), ("ding", 2, 0, 0.9)]),
 dict(id="carbon", mood="curious", lines=[
  ("In nineteen twenty-one, a doctor described a family who heard footsteps, felt strange pressure, and saw figures in their new home.", "In 1921, a doctor described a family who heard footsteps, felt strange pressure, and saw figures in their new home.", 0.35),
  ("The real culprit? A broken furnace, leaking carbon monoxide.", "The real culprit? A broken furnace, leaking carbon monoxide.", 0.8)], sfx=[("steps", 0, 0, 2.5), ("sting", 1, 0, 0.9)]),
 dict(id="paralysis", mood="eerie", lines=[
  ("Then there's sleep paralysis. If you wake up in the middle of a dream, your body can stay frozen for a moment, while your mind keeps dreaming.", "Then there's sleep paralysis. If you wake up in the middle of a dream, your body can stay frozen for a moment, while your mind keeps dreaming.", 0.35),
  ("Many people feel a presence in the room, or a weight on their chest.", "Many people feel a presence in the room, or a weight on their chest.", 0.8)], sfx=[("wind", 1, 0, 0.0)]),
 dict(id="expect", mood="curious", lines=[
  ("And once we believe a place is haunted, every shadow and every chill starts to look like proof.", "And once we believe a place is haunted, every shadow and every chill starts to look like proof.", 0.3),
  ("We go looking for ghosts, and our brains are happy to find them.", "We go looking for ghosts, and our brains are happy to find them.", 0.8)], sfx=[("pop", 0, 0, 2.2), ("pop", 0, 0, 3.0), ("pop", 0, 0, 3.8)]),
 dict(id="light", mood="warm", lines=[
  ("Back in the hallway, Sam switches on the light.", "Back in the hallway, Sam switches on the light.", 0.45),
  ("The tall figure is just his coat. The footsteps? Pipes, cooling down. And the cold? A window, left open.", "The tall figure is just his coat. The footsteps? Pipes cooling down. And the cold? A window left open.", 0.8)], sfx=[("click", 0, 1, -0.6), ("creak", 1, 0, 2.6), ("wind", 1, 0, 5.0)]),
 dict(id="answer", mood="warm", lines=[
  ("So, are ghosts real?", "So, are ghosts real?", 0.4),
  ("There's no scientific evidence that they are.", "There's no scientific evidence that they are.", 0.4),
  ("But the feelings are real, and our clever, pattern-hunting brains are the reason why.", "But the feelings are real, and our clever, pattern-hunting brains are the reason why.", 0.8)], sfx=[("ding", 2, 0, 1.4)]),
 dict(id="ending", mood="warm", lines=[
  ("Sam climbs back into bed, and closes his eyes.", "Sam climbs back into bed, and closes his eyes.", 0.5),
  ("Somewhere in the house, something goes crash.", "Somewhere in the house, something goes crash.", 0.9),
  ("Goodnight, Sam.", "Goodnight, Sam.", 3.4)], sfx=[("crash", 1, 1, -0.8), ("meow", 1, 1, 0.5), ("click", 2, 1, 0.8)]),
]
PRE = 0.3

def chunks(text, t0, t1, maxc=58):
    words, out, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxc: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    if len(out) > 1 and len(out[-1]) < 12: last = out.pop(); out[-1] += " " + last
    total, t, res = sum(len(c) for c in out), t0, []
    for c in out:
        d = (t1 - t0) * len(c) / total
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
    if b["lines"]: silence(PRE)
    for spoken, cap, pause in b["lines"]:
        s, _ = k.create(spoken, voice=VOICE, speed=SPEED, lang=LANG)
        s = trim(s.astype(np.float32)); s *= 0.9 / np.abs(s).max(); d = len(s) / SR
        subs += chunks(cap, t, t + d - 0.05)
        lines.append({"t0": round(t, 3), "t1": round(t + d, 3)})
        audio.append(s); t += d; silence(pause)
    if "hold" in b: silence(b["hold"])
    sfx = []
    for name, li, pos, off in b["sfx"]:
        base = start if li is None else (lines[li]["t1"] if pos else lines[li]["t0"])
        sfx.append({"name": name, "t": round(base + off, 3)})
    beats.append({"id": b["id"], "mood": b["mood"], "start": round(start, 3), "end": round(t, 3), "lines": lines, "subs": subs, "sfx": sfx})
    print(f"{b['id']:10s} {start:7.2f} {t:7.2f}  " + " ".join(f"{l['t0']-start:.2f}-{l['t1']-start:.2f}" for l in lines))
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "beats": beats}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2))
