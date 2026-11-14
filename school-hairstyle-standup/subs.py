"""Bold pop-up Hinglish captions (timed to the stand-up audio) and on-screen stamps, as an ASS subtitle file for ffmpeg."""
import json, re
TL = json.load(open("build/timeline.json"))
def ts(t): t = max(t, 0); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Bangers,124,&H00FFFFFF,&H00FFFFFF,&H00301418,&H9A000000,0,0,0,0,100,100,2,0,1,8,4,2,60,60,330,1
Style: Stamp,Bangers,120,&H00FFFFFF,&H00FFFFFF,&H00301418,&H9A000000,0,0,0,0,100,100,3,0,1,10,5,5,20,20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
YEL, GRN, PNK, CYN, RED, WHT = "&H00E6FF&", "&H6AFF3D&", "&HA85FFF&", "&HFFD319&", "&H4A3BFF&", "&HFFFFFF&"
POP = r"\fscx60\fscy60\t(0,80,\fscx112\fscy112)\t(80,150,\fscx100\fscy100)"
ev, n = [], 0
cols = [YEL, GRN, PNK]
def hl(m):
    global n; n += 1; return "{\\c" + cols[n % 3] + "}" + m.group(1) + "{\\c" + WHT + "}"
for b in TL["beats"]:
    for c in b["subs"]:
        ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c['t1'])},Sub,,0,0,0,,{{{POP}}}" + re.sub(r"\*([^*]+)\*", hl, c["text"]))
def stamp(t0, t1, text, x, y, size=120, col=WHT, ang=0, fade=(0, 120)):
    ev.append(f"Dialogue: 2,{ts(t0)},{ts(t1)},Stamp,,0,0,0,,{{\\pos({x},{y})\\fs{size}\\c{col}\\frz{ang}\\fad({fade[0]},{fade[1]}){POP}}}{text}")
stamp(2.5, 4.2, "SECOND DEGREE", 540, 250, 130, YEL, -4); stamp(2.75, 4.2, "TORTURE!", 540, 410, 210, RED, -4)
for k, (t0, y, a) in enumerate([(6.9, 260, -5), (7.6, 420, 4), (8.3, 580, -3)]): stamp(t0, 9.6, "DISCIPLINE!", 540, y, 150, [YEL, PNK, CYN][k], a)
stamp(13.0, 13.5, "X", 800, 420, 420, RED, 8)
stamp(25.6, 26.9, "HAIWAAN!", 540, 270, 200, RED, -5)
stamp(31.5, 32.8, "RUHANI TAAKAT", 540, 270, 140, YEL, -4)
stamp(34.0, 35.35, "1 THAPPAD = 3 MAATHE", 540, 250, 110, YEL, -3)
stamp(39.6, 41.6, "SUPERSONIC!", 540, 270, 170, CYN, -6)
stamp(45.3, 47.25, "GEL LAGAOGE?!", 540, 250, 150, RED, -4)
stamp(56.55, 57.2, "POP!", 760, 330, 200, YEL, -12)
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("captions", len(ev))
