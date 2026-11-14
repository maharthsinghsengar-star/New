"""Comic lettering as an ASS file: small caption boxes (cream for narration, white for speech),
sound-effect words at the moments the effects play, and the title / end cards."""
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
Style: Narr,Comic Neue,36,&H00181020,&H00181020,&H00C4ECFA,&H00100814,0,0,0,0,100,100,0.6,0,3,9,3,2,200,200,74,1
Style: Talk,Comic Neue,36,&H00181020,&H00181020,&H00FFFFFF,&H00100814,0,0,0,0,100,100,0.6,0,3,9,3,2,200,200,74,1
Style: Evil,Comic Neue,36,&H00F0F0FF,&H00F0F0FF,&H0018104A,&H00100814,0,0,0,0,100,100,0.6,0,3,9,3,2,200,200,74,1
Style: Sfx,Bangers,120,&H0030D8FF,&H0030D8FF,&H00100814,&H002020C8,0,0,0,0,100,100,4,0,1,6,5,5,60,60,0,1
Style: Title,Bangers,150,&H00D8ECF8,&H00D8ECF8,&H00100814,&H002020B0,0,0,0,0,100,100,8,0,1,7,6,5,60,60,0,1
Style: Small,Comic Neue,40,&H00D8ECF8,&H00FFFFFF,&H00100814,&H80000000,0,0,0,0,100,100,10,0,1,3,1,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
WORD = {"knock": "KNOCK! KNOCK!", "slam": "SLAM!", "creak": "CREEEAK…", "door": "CREAK", "gate": "SKREEE", "click": "CLICK", "ring": "RIIING!", "siren": "WEE-OOO", "buzz": "BZZT!"}
B = {b["id"]: b for b in TL["beats"]}; ev = []
ev.append(f"Dialogue: 2,{ts(0.8)},{ts(B['title']['end'] - 0.3)},Title,,0,0,0,,{{\\fad(1200,800)\\pos(960,450)\\frz2}}THE STRANGE NEIGHBOUR")
ev.append(f"Dialogue: 2,{ts(1.8)},{ts(B['title']['end'] - 0.3)},Small,,0,0,0,,{{\\fad(1200,800)\\pos(960,590)}}A HORROR STORY")
e = B["end"]; ev.append(f"Dialogue: 2,{ts(e['start'] + 1.6)},{ts(e['end'] - 0.3)},Title,,0,0,0,,{{\\fad(900,1500)\\pos(960,520)\\frz-2}}THE END")
k = 0
for b in TL["beats"]:
    for s in b["sfx"]:
        if s["name"] in WORD:
            x, y, rz = [(420, 250, 8), (1480, 270, -7), (520, 330, -10), (1400, 220, 9)][k % 4]; k += 1
            d = 1.5 if s["name"] != "ring" else 3.2
            ev.append(f"Dialogue: 1,{ts(s['t'])},{ts(s['t'] + d)},Sfx,,0,0,0,,{{\\fad(60,350)\\pos({x},{y})\\frz{rz}\\t(0,180,\\fscx118\\fscy118)\\t(180,400,\\fscx100\\fscy100)}}{WORD[s['name']]}")
    if b["id"] in ("title", "end"): continue
    for c in b["subs"]:
        who = next((l["who"] for l in b["lines"] if l["t0"] - 0.01 <= c["t0"] < l["t1"]), "n")
        ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c['t1'] + 0.06)},{'Narr' if who == 'n' else 'Evil' if who == 'w' else 'Talk'},,0,0,0,,{c['text']}")
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("lettering events", len(ev))
