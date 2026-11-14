"""Bold pop-up Hinglish captions (highlighted key words) and on-screen stamps, as an ASS subtitle file for ffmpeg."""
import json, re
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
Style: Sub,Bangers,124,&H00FFFFFF,&H00FFFFFF,&H00301418,&H9A000000,0,0,0,0,100,100,2,0,1,8,4,2,40,40,330,1
Style: Stamp,Bangers,120,&H00FFFFFF,&H00FFFFFF,&H00301418,&H9A000000,0,0,0,0,100,100,3,0,1,10,5,5,20,20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
YEL, GRN, PNK, CYN, RED, WHT = "&H00E6FF&", "&H6AFF3D&", "&HA85FFF&", "&HFFD319&", "&H4A3BFF&", "&HFFFFFF&"
POP = r"\fscx60\fscy60\t(0,90,\fscx112\fscy112)\t(90,170,\fscx100\fscy100)"
ev, n = [], 0
for b in TL["beats"]:
    for c in b["subs"]:
        cols = {"p": [RED], "b": [CYN]}.get(c["who"], [YEL, GRN, PNK])
        def hl(m):
            global n; n += 1; return "{\\c" + cols[n % len(cols)] + "}" + m.group(1) + "{\\c" + WHT + "}"
        ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c["t1"])},Sub,,0,0,0,,{{{POP}}}" + re.sub(r"\*([^*]+)\*", hl, c["text"]))
def stamp(t0, t1, text, x, y, size=120, col=WHT, ang=0, fade=(0, 150), layer=2):
    ev.append(f"Dialogue: {layer},{ts(t0)},{ts(t1)},Stamp,,0,0,0,,{{\\pos({x},{y})\\fs{size}\\c{col}\\frz{ang}\\fad({fade[0]},{fade[1]}){POP}}}{text}")
L = lambda bid, k: B[bid]["lines"][k]
stamp(0.35, 2.75, "SCHOOL KA", 540, 300, 120, YEL); stamp(0.6, 2.75, "HAIRSTYLE", 540, 470, 220); stamp(0.85, 2.75, "CHECKING!", 540, 680, 220, PNK, -4)
stamp(L("bunty", 0)["t0"] + 0.9, L("bunty", 1)["t0"] - 0.25, "BUNTY", 540, 250, 190, YEL, -5); stamp(L("bunty", 0)["t0"] + 1.2, L("bunty", 1)["t0"] - 0.25, "THE SPIKES KING", 540, 400, 84)
stamp(L("bunty", 2)["t0"] + 1.3, B["bunty"]["end"] - 0.1, "FULL NETWORK!", 540, 230, 110, CYN, -4)
t0 = L("ptsir", 3)["t0"] + 2.55; k = 0
while t0 + k * 0.3 < B["ptsir"]["end"] - 0.05: stamp(t0 + k * 0.3, t0 + k * 0.3 + 0.2, "SPIKES DETECTED!", 540, 300, 120, RED, 0, (0, 0)); k += 1
stamp(L("oil", 1)["t0"] - 0.1, L("oil", 2)["t0"] - 0.4, "SECRET HATHIYAR", 540, 300, 120, YEL, -4)
stamp(B["cap"]["start"] + 0.15, L("cap", 1)["t0"] - 0.55, "AGLE DIN...", 540, 280, 130, WHT, -4)
stamp(L("cap", 3)["t0"] - 0.25, L("cap", 3)["t0"] + 1.4, "BOING!", 760, 330, 170, YEL, -12)
stamp(B["twist"]["start"] + 0.15, L("twist", 1)["t0"] - 0.1, "20 SAAL BAAD...", 540, 280, 130, WHT, -4)
e = B["end"]; stamp(e["start"] + 0.3, e["end"], "TUMHARE SCHOOL MEIN BHI", 540, 760, 104, YEL, 0, (0, 600)); stamp(e["start"] + 0.55, e["end"], "AISA HOTA THA?", 540, 910, 170, WHT, -3, (0, 600))
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("captions", len(ev))
