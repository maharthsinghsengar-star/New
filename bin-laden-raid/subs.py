"""Documentary graphics as ASS (1920x1080): subtitles, title, chapter cards, location/date lower-thirds, data callouts, credits."""
import json
TL = json.load(open("build/timeline.json"))
B = {b["id"]: b for b in TL["beats"]}
def ts(t): t = max(t, 0); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Poppins Medium,38,&H00F2F2F2,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,0.5,0,1,1.6,1.2,2,200,200,56,1
Style: Kicker,Poppins Medium,34,&H00C8D8E8,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,14,0,1,0,0,5,60,60,0,1
Style: Big,Liberation Serif,104,&H00F4F4F4,&H00FFFFFF,&H00101010,&H99000000,1,0,0,0,100,100,6,0,1,0,2,5,60,60,0,1
Style: Card,Liberation Serif,88,&H00F0F0F0,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,4,0,1,0,0,5,60,60,0,1
Style: Lower,Poppins SemiBold,32,&H00F4F4F4,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,6,0,1,0,1.5,1,96,96,96,1
Style: Lower2,Poppins Medium,26,&H00B8C8D8,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,4,0,1,0,1.5,1,96,96,60,1
Style: Data,Poppins SemiBold,58,&H0060D0FF,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,3,0,1,0,2,5,60,60,0,1
Style: Note,Poppins Medium,24,&H00A8A8A8,&H00FFFFFF,&H00101010,&H99000000,0,0,0,0,100,100,2,0,1,0,1,7,60,60,48,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev = []
def E(st, t0, t1, txt, layer=1, fad=(400, 400)): ev.append(f"Dialogue: {layer},{ts(t0)},{ts(t1)},{st},,0,0,0,,{{\\fad({fad[0]},{fad[1]})}}{txt}")
for b in TL["beats"]:
    for c in b["subs"]: ev.append(f"Dialogue: 0,{ts(c['t0'])},{ts(c['t1'] + 0.05)},Sub,,0,0,0,,{c['text']}")
E("Note", 0.8, 7.5, "A dramatised reconstruction based on public accounts. Real people are shown only in silhouette.")
t = B["title"]; E("Kicker", t["start"] + 0.6, t["end"] - 0.4, "{\\pos(960,430)}THE ASSASSINATION OF", fad=(900, 700)); E("Big", t["start"] + 1.0, t["end"] - 0.4, "{\\pos(960,540)}OSAMA BIN LADEN", fad=(1200, 700)); E("Kicker", t["start"] + 2.0, t["end"] - 0.4, "{\\pos(960,660)\\fs28}THE TEN-YEAR HUNT AND THE RAID ON ABBOTTABAD", fad=(900, 700))
for k, (num, name) in enumerate([("ONE", "The Most Wanted Man"), ("TWO", "The Courier"), ("THREE", "The Compound"), ("FOUR", "The Decision"), ("FIVE", "Operation Neptune Spear"), ("SIX", "The Exit"), ("SEVEN", "Aftermath")], 1):
    c = B[f"ch{k}"]; E("Kicker", c["start"] + 0.3, c["end"] - 0.3, f"{{\\pos(960,470)}}CHAPTER {num}", fad=(600, 500)); E("Card", c["start"] + 0.6, c["end"] - 0.3, f"{{\\pos(960,560)}}{name}", fad=(800, 500))
def lower(bid, a, b2, dt=0.6, dur=5.0):
    s = B[bid]["start"] + dt; E("Lower", s, s + dur, a, fad=(500, 600)); E("Lower2", s + 0.2, s + dur, b2, fad=(500, 600))
lower("open1", "NORTHERN PAKISTAN", "MAY 2, 2011  ·  00:15 LOCAL TIME", 8.0, 3.6)
lower("nyc", "NEW YORK CITY", "SEPTEMBER 11, 2001")
lower("torabora", "TORA BORA, AFGHANISTAN", "DECEMBER 2001")
lower("jeep", "PESHAWAR, PAKISTAN", "2010")
lower("abbottabad", "ABBOTTABAD, PAKISTAN", "ABOUT 1 KM FROM THE PAKISTAN MILITARY ACADEMY")
lower("pacer", "SATELLITE SURVEILLANCE", "2010 – 2011")
lower("panetta", "CIA HEADQUARTERS, LANGLEY", "SPRING 2011")
lower("replica", "TRAINING SITE, UNITED STATES", "APRIL 2011")
lower("takeoff", "JALALABAD, AFGHANISTAN", "MAY 1, 2011  ·  ~23:00 LOCAL TIME")
lower("sitroom", "THE WHITE HOUSE SITUATION ROOM", "WASHINGTON, D.C.  ·  SUNDAY AFTERNOON")
lower("arrive", "THE COMPOUND, ABBOTTABAD", "MAY 2, 2011  ·  ~00:30 LOCAL TIME")
lower("sea", "NORTH ARABIAN SEA", "USS CARL VINSON  ·  MAY 2, 2011")
lower("crowds", "WASHINGTON, D.C.", "MAY 1, 2011  ·  LATE EVENING")
lower("demolish", "ABBOTTABAD", "FEBRUARY 2012")
lower("zawahiri", "KABUL, AFGHANISTAN", "JULY 31, 2022")
def data(bid, line, off, dur, txt, pos=(960, 300)):
    b = B[bid]; s = b["lines"][line]["t0"] + off; E("Data", s, s + dur, f"{{\\pos({pos[0]},{pos[1]})}}{txt}", fad=(300, 400))
data("nyc", 1, 0.2, 3.0, "2,977 KILLED")
data("walls", 0, 0.5, 3.4, "≈ 8× THE SIZE OF NEIGHBOURING HOMES"); data("walls", 1, 0.3, 4.6, "WALLS UP TO 5.5 m")
data("house", 0, 4.0, 5.5, "TERRACE PRIVACY WALL ≈ 2 m")
data("panetta", 1, 3.6, 3.0, "40%  —  80%", (960, 360))
data("options", 0, 0.3, 4.0, "OPTION 1 · B-2 BOMBING"); data("options", 1, 0.2, 2.8, "OPTION 2 · DRONE STRIKE"); data("options", 2, 0.2, 4.5, "OPTION 3 · SPECIAL FORCES RAID")
data("takeoff", 2, 0.2, 2.6, "≈ 90 MINUTES")
data("intel", 0, 0.3, 3.4, "≈ 38 MINUTES ON THE GROUND")
c = B["credits"]; E("Card", c["start"] + 0.6, c["end"] - 0.6, "{\\pos(960,420)\\fs64}The Assassination of Osama bin Laden", fad=(800, 800))
E("Lower2", c["start"] + 1.4, c["end"] - 0.6, "{\\an5\\pos(960,540)}A documentary reconstruction based on public accounts by U.S. and Pakistani officials and published reporting.", fad=(800, 800))
E("Lower2", c["start"] + 1.8, c["end"] - 0.6, "{\\an5\\pos(960,590)}Scenes are dramatised. Real people are depicted only in silhouette.", fad=(800, 800))
open("build/subs.ass", "w").write(head + "\n".join(ev) + "\n")
print("events", len(ev))
