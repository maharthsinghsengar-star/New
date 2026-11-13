"""Small, non-bold captions (and the title / end cards) as an ASS subtitle file for ffmpeg."""
import json
TL = json.load(open("build/timeline.json"))
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Liberation Sans,36,&H00FFFFFF,&H00FFFFFF,&H00100818,&H80000000,0,0,0,0,100,100,0.4,0,1,2.2,0.6,2,160,160,52,1
Style: Title,Liberation Serif,104,&H00FFFFFF,&H00FFFFFF,&H00100818,&H80000000,0,0,0,0,100,100,10,0,1,3,2,5,60,60,0,1
Style: Small,Liberation Sans,34,&H00E8E8FF,&H00FFFFFF,&H00100818,&H80000000,0,0,0,0,100,100,8,0,1,2,0.6,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev = []
B = {b["id"]: b for b in TL["beats"]}
ev.append(f"Dialogue: 1,{ts(0.8)},{ts(B['title']['end'] - 0.3)},Title,,0,0,0,,{{\\fad(1400,900)\\pos(960,470)}}THE STRANGE NEIGHBOUR")
ev.append(f"Dialogue: 1,{ts(1.8)},{ts(B['title']['end'] - 0.3)},Small,,0,0,0,,{{\\fad(1400,900)\\pos(960,580)}}A HORROR STORY")
e = B["end"]; ev.append(f"Dialogue: 1,{ts(e['start'] + 1.6)},{ts(e['end'] - 0.3)},Title,,0,0,0,,{{\\fad(900,1500)\\pos(960,520)}}THE END")
for b in TL["beats"]:
    if b["id"] in ("title", "end"): continue
    for c in b["subs"]:
        ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c['t1'] + 0.06)},Sub,,0,0,0,,{c['text']}")
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("captions", len(ev))
