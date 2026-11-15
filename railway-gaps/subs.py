"""Shorts-style captions: 1-2 words at a time, heavy white type with a thick black outline (ASS for ffmpeg/libass)."""
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
Style: Cap,Poppins ExtraBold,112,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,0,0,0,0,100,100,1,0,1,9,5,5,40,40,0,1
Style: Stamp,Poppins ExtraBold,96,&H0036C8FF,&H00FFFFFF,&H00000000,&H90000000,0,0,0,0,100,100,2,0,1,8,4,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
POP = r"\fscx70\fscy70\t(0,70,\fscx108\fscy108)\t(70,130,\fscx100\fscy100)"
ev = []
for b in TL["beats"]:
    for c in b["subs"]:
        ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c['t1'])},Cap,,0,0,0,,{{\\pos(540,1190){POP}}}{c['text']}")
def stamp(t0, t1, txt, x=540, y=430, ang=-4):
    ev.append(f"Dialogue: 1,{ts(t0)},{ts(t1)},Stamp,,0,0,0,,{{\\pos({x},{y})\\frz{ang}\\fad(0,120){POP}}}{txt}")
k = B["kink"]; stamp(k["lines"][1]["t0"], k["end"], "SUN KINK!")
dn = B["danger"]; stamp(dn["start"] + 1.0, dn["end"], "SCREECH!", ang=5)
cl = B["clack"]; [stamp(cl["start"] + 0.2 + i * 0.7, cl["start"] + 0.55 + i * 0.7, "CLACK!" if i % 2 else "CLICK!", 300 + (i % 2) * 480, 470, -6 + 12 * (i % 2)) for i in range(6)]
ht = B["heat"]; stamp(ht["start"] + 4.6, ht["end"], "50°C+", 540, 430, -3)
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("captions", len(ev))
