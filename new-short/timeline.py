"""Build build/timeline.json from the recording's word timings (Whisper) + beat boundaries."""
import json, re
W = json.load(open("rec/words.json"))
FIX = {"Paramveer": "Param Vir"}
words = [dict(w=FIX.get(re.sub(r"[^\w']", "", w["w"]), None) and w["w"].replace(re.sub(r"[^\w']", "", w["w"]), FIX[re.sub(r"[^\w']", "", w["w"])]) or w["w"], t0=w["t0"], t1=w["t1"]) for w in W]
def at(word, n=1):
    k = 0
    for w in words:
        if re.sub(r"[^\w']", "", w["w"]).lower() == word.lower():
            k += 1
            if k == n: return w["t0"]
    raise KeyError(word)
B = [("intro", 0.0), ("retreat", at("Would")), ("refused", at("Major")), ("date", at("It")), ("badgam", at("At")), ("among", at("Among")),
     ("despite", at("Despite")), ("desperate", at("The", 1) if False else at("situation") - 0.2), ("advancing", at("Enemy", 2)), ("hold", at("But", 1)),
     ("moved", at("moved") - 0.25), ("reinforce", at("courage") - 0.3), ("tragic", at("Tragically")), ("never", at("But", 2)), ("medal", at("He", 3)), ("spirit", at("He", 4)), ("jai", at("Jai"))]
dur = round(W[-1]["t1"] + 1.6, 2)
beats = [dict(id=b, start=round(s, 2), end=round(B[i + 1][1] if i + 1 < len(B) else dur, 2)) for i, (b, s) in enumerate(B)]
json.dump(dict(duration=dur, words=words, beats=beats), open("build/timeline.json", "w"), indent=0)
for b in beats: print(b)
print("duration", dur)
