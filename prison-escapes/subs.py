"""Shorts-style captions: 1-2 words at a time, heavy white type with a thick black outline, plus yellow stamps (ASS for libass)."""
import json
TL = json.load(open("build/timeline.json"))
B = {b["id"]: b for b in TL["beats"]}
def ts(t): t = max(t, 0); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Bangers,104,&H00181418,&H00FFFFFF,&H0040E6FF,&H00181418,0,0,0,0,100,100,3,0,3,16,7,5,40,40,0,1
Style: Talk,Bangers,104,&H00181418,&H00FFFFFF,&H00FFFFFF,&H00181418,0,0,0,0,100,100,3,0,3,16,7,5,40,40,0,1
Style: Stamp,Bangers,150,&H0030DCFF,&H00FFFFFF,&H00181418,&H002A30E8,0,0,0,0,100,100,4,0,1,10,8,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
POP = r"\fscx70\fscy70\t(0,70,\fscx108\fscy108)\t(70,130,\fscx100\fscy100)"
ev = []
for b in TL["beats"]:
    for c in b["subs"]:
        c['who'] = next((l['who'] for l in b['lines'] if l['t0'] - 0.01 <= c['t0'] <= l['t1']), 'n') ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c['t1'])},{'Talk' if c.get('who') == 'g' else 'Cap'},,0,0,0,,{{\\pos(540,1290)\\frz{-2 if int(c['t0'] * 10) % 2 else 2}{POP}}}{c['text']}")
def stamp(t0, t1, txt, x=540, y=430, ang=-6):
    y = min(y, 330) ev.append(f"Dialogue: 1,{ts(t0)},{ts(t1)},Stamp,,0,0,0,,{{\\pos({x},{y})\\frz{ang}\\fad(0,120){POP}}}{txt}")
r = B["rock"]; stamp(r["start"] + 0.5, r["end"] - 0.3, "ALCATRAZ, 1962")
h = B["heli"]; L1 = h["lines"][1]; stamp(L1["t0"] + 0.1, h["end"], "2001!", 300, 430, -8); stamp(L1["t0"] + 0.7, h["end"], "2007!", 780, 430, 8)
tn = B["tunnel"]; stamp(tn["start"] + 1.4, tn["lines"][1]["t0"] - 0.1, "1.5 KM!", 540, 420, -3)
ch = B["chapo"]; stamp(ch["start"] + 0.3, ch["start"] + 2.6, "MEXICO, 2015")
m = B["morning"]; stamp(m["lines"][1]["t0"] + 0.55, m["end"], "THUD!", 700, 520, 10)
i = B["intro"]; stamp(i["start"] + 0.1, i["start"] + 1.3, "CLANG!", 540, 430, -8)
rf = B["roof"]; stamp(rf["lines"][0]["t1"] - 1.6, rf["end"], "SPLASH!", 540, 430, 6)
d = B["dig"]; stamp(d["start"] + 1.2, d["start"] + 2.6, "SCRITCH!", 330, 470, -10); stamp(d["end"] - 1.8, d["end"] - 0.4, "SCRATCH!", 750, 470, 10)
hl = B["heli"]; stamp(hl["start"] + 0.2, hl["lines"][1]["t0"] - 0.1, "WHUP WHUP!", 540, 430, -5)
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("captions", len(ev))
