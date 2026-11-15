"""Documentary narration (Kokoro TTS, deep measured narrator) and the shot / caption / sound-effect timeline."""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
VOICE = k.get_voice_style("am_onyx") * 0.55 + k.get_voice_style("am_michael") * 0.45
SPEED, SR = 0.88, 24000
# beat: id, chapter mood, lines (spoken, caption, pause), sfx (name, line, 0/1, offset)
B = lambda id, mood, lines, sfx=(), hold=0.0: dict(id=id, mood=mood, lines=lines, sfx=list(sfx), hold=hold)
BEATS = [
 B("open1", "raid", [("It is just after midnight, on May the second, two thousand eleven.", "It is just after midnight, on May 2, 2011.", 0.62),
   ("Two helicopters are flying low and dark, over the mountains of northern Pakistan.", "Two helicopters are flying low and dark over the mountains of northern Pakistan.", 0.88)], [("rotor", 0, 0, -0.2)]),
 B("open2", "raid", [("On board are twenty-three Navy SEALs, an interpreter, and a dog named Cairo.", "On board are 23 Navy SEALs, an interpreter, and a dog named Cairo.", 0.62),
   ("Their target is a walled compound, in the town of Abbottabad.", "Their target is a walled compound in the town of Abbottabad.", 0.88)]),
 B("open3", "raid", [("If the intelligence is right, the most wanted man in the world is asleep inside.", "If the intelligence is right, the most wanted man in the world is asleep inside.", 0.75),
   ("If it is wrong, America has just sent soldiers secretly into a nuclear-armed partner, for nothing.", "If it is wrong, America has just sent soldiers secretly into a nuclear-armed partner... for nothing.", 1.50)]),
 B("title", "title", [], [("boom", None, 0, 0.3)], hold=8.0),
 # CHAPTER 1
 B("ch1", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("nyc", "dark", [("On September the eleventh, two thousand one, nineteen al-Qaeda hijackers turned four airliners into weapons.", "On September 11, 2001, nineteen al-Qaeda hijackers turned four airliners into weapons.", 0.62),
   ("Nearly three thousand people were killed.", "Nearly three thousand people were killed.", 1.50)]),
 B("binladen", "dark", [("The man behind the attacks was Osama bin Laden, the founder of al-Qaeda.", "The man behind the attacks was Osama bin Laden, the founder of al-Qaeda.", 0.62),
   ("Within weeks, the United States was at war in Afghanistan.", "Within weeks, the United States was at war in Afghanistan.", 1.12)], [("jets", 1, 0, 0.5)]),
 B("torabora", "cold", [("In December two thousand one, American and Afghan forces cornered him in the caves and ridges of Tora Bora.", "In December 2001, American and Afghan forces cornered him in the caves and ridges of Tora Bora.", 0.62),
   ("And then, he was gone.", "And then, he was gone.", 1.50)], [("thump", 0, 0, 3.0), ("thump", 0, 0, 4.4), ("wind", 1, 0, 0.0)]),
 B("decade", "cold", [("For almost ten years, the most powerful intelligence agencies in the world could not find him.", "For almost ten years, the most powerful intelligence agencies in the world could not find him.", 0.62),
   ("Some believed he was hiding in a cave, along the Afghan border. Others believed he was already dead.", "Some believed he was hiding in a cave along the Afghan border. Others believed he was already dead.", 0.75),
   ("Every so often, a new videotape or audio message would surface, a reminder that he was still out there, somewhere.", "Every so often, a new videotape or audio message would surface: a reminder that he was still out there, somewhere.", 1.25)]),
 # CHAPTER 2
 B("ch2", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("courier1", "office", [("The breakthrough did not come from finding bin Laden. It came from finding the man who carried his messages.", "The breakthrough did not come from finding bin Laden. It came from finding the man who carried his messages.", 0.62),
   ("Bin Laden used no phones, and no internet. Instead, he relied on trusted couriers, who passed his letters by hand.", "Bin Laden used no phones and no internet. Instead, he relied on trusted couriers, who passed his letters by hand.", 1.00)]),
 B("courier2", "office", [("Detainees had mentioned one courier by a nickname: Abu Ahmed al-Kuwaiti.", "Detainees had mentioned one courier by a nickname: Abu Ahmed al-Kuwaiti.", 0.50),
   ("For years, the CIA tried to learn his real name, and where he lived.", "For years, the CIA tried to learn his real name, and where he lived.", 1.00)], [("type", 0, 0, 1.0)]),
 B("jeep", "street", [("In two thousand ten, they intercepted a phone call.", "In 2010, they intercepted a phone call.", 0.50),
   ("It led them to a white Suzuki jeep, moving through the crowded streets of Peshawar.", "It led them to a white Suzuki jeep, moving through the crowded streets of Peshawar.", 1.00)], [("phone", 0, 0, 0.3), ("traffic", 1, 0, 0.0)]),
 B("abbottabad", "town", [("They followed it east, to Abbottabad: a quiet, green town in the hills, home to Pakistan's top military academy.", "They followed it east, to Abbottabad: a quiet, green town in the hills, home to Pakistan's top military academy.", 0.62),
   ("And there, the courier drove into a compound unlike any other in the neighbourhood.", "And there, the courier drove into a compound unlike any other in the neighbourhood.", 1.25)], [("birds", 0, 0, 0.5)]),
 # CHAPTER 3
 B("ch3", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("walls", "town", [("It was roughly eight times larger than the homes around it.", "It was roughly eight times larger than the homes around it.", 0.50),
   ("Its outer walls stood up to five and a half metres high, topped with barbed wire.", "Its outer walls stood up to five and a half metres high, topped with barbed wire.", 1.00)]),
 B("house", "town", [("The main house rose three storeys. Its top-floor terrace was screened by a two-metre wall, as if someone inside did not want to be seen, even from the street.", "The main house rose three storeys. Its top-floor terrace was screened by a two-metre wall, as if someone inside did not want to be seen, even from the street.", 1.00)]),
 B("trash", "town", [("There was no phone line, and no internet connection.", "There was no phone line, and no internet connection.", 0.50),
   ("The residents burned their own rubbish, instead of putting it out for collection.", "The residents burned their own rubbish, instead of putting it out for collection.", 1.12)], [("fire", 1, 0, 0.5)]),
 B("pacer", "sat", [("For months, satellites watched the compound. Analysts noticed a tall man who walked in circles in the garden, day after day, and never left.", "For months, satellites watched the compound. Analysts noticed a tall man who walked in circles in the garden, day after day, and never left.", 0.50),
   ("They called him: the pacer.", "They called him “the pacer.”", 1.25)], [("beep", 0, 0, 1.0)]),
 B("dna", "office", [("They could never see his face clearly. The CIA even organised a fake vaccination programme, hoping to collect DNA from the children inside.", "They could never see his face clearly. The CIA even organised a fake vaccination programme, hoping to collect DNA from the children inside.", 0.50),
   ("It is not clear that it ever succeeded.", "It is not clear that it ever succeeded.", 1.25)]),
 # CHAPTER 4
 B("ch4", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("panetta", "office", [("By the spring of two thousand eleven, CIA director Leon Panetta had brought the case to President Barack Obama.", "By the spring of 2011, CIA director Leon Panetta had brought the case to President Barack Obama.", 0.50),
   ("But no one could say for certain who the pacer was. Estimates ranged from forty, to eighty percent.", "But no one could say for certain who the pacer was. Estimates ranged from 40 to 80 percent.", 1.12)]),
 B("options", "office", [("The options were stark. A B-2 bomber could flatten the compound, but it would leave no proof, and could kill the neighbours.", "The options were stark. A B-2 bomber could flatten the compound, but it would leave no proof, and could kill the neighbours.", 0.50),
   ("A small missile from a drone might simply miss.", "A small missile from a drone might simply miss.", 0.50),
   ("Or, special forces could fly in, deep inside Pakistan, without telling Pakistan.", "Or special forces could fly in, deep inside Pakistan, without telling Pakistan.", 0.75),
   ("Only a small circle of officials knew. Pakistan, a partner that received billions of dollars in American aid, would not be warned.", "Only a small circle of officials knew. Pakistan, a partner that received billions of dollars in American aid, would not be warned.", 1.12)]),
 B("replica", "day", [("The SEALs rehearsed again and again, on full-scale replicas of the compound, built in secret, in the United States.", "The SEALs rehearsed again and again on full-scale replicas of the compound, built in secret in the United States.", 0.62),
   ("On the morning of April the twenty-ninth, Obama gave his decision to his advisers.", "On the morning of April 29, Obama gave his decision to his advisers.", 0.62),
   ("It's a go.", "“It's a go.”", 1.75)], [("rotor", 0, 0, 0.5)]),
 # CHAPTER 5
 B("ch5", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("takeoff", "raid", [("May the first, two thousand eleven. Around eleven p.m. local time, two specially modified Black Hawk helicopters lift off from Jalalabad, in eastern Afghanistan.", "May 1, 2011. Around 11 p.m. local time, two specially modified Black Hawk helicopters lift off from Jalalabad, in eastern Afghanistan.", 0.50),
   ("They fly low, hugging the valleys to stay hidden from Pakistani radar. Heavier Chinook helicopters follow, as backup.", "They fly low, hugging the valleys to stay hidden from Pakistani radar. Heavier Chinook helicopters follow as backup.", 0.62),
   ("The flight will take about ninety minutes.", "The flight will take about ninety minutes.", 1.12)], [("rotor", 0, 0, 0.0)]),
 B("sitroom", "sitroom", [("In Washington, it is Sunday afternoon. In the White House Situation Room, the president and his national security team watch a live feed, from a drone high above.", "In Washington, it is Sunday afternoon. In the White House Situation Room, the president and his national security team watch a live feed from a drone high above.", 1.25)], [("hum", 0, 0, 0.0)]),
 B("arrive", "raid", [("At around half past midnight, the first Black Hawk reaches the compound. As it hovers over the courtyard, it suddenly begins to lose lift.", "At around 12:30 a.m., the first Black Hawk reaches the compound. As it hovers over the courtyard, it suddenly begins to lose lift.", 0.50),
   ("The high walls and the warm air trap its own downwash. The pilot forces it into a hard landing, its tail resting on the wall. No one is seriously hurt.", "The high walls and the warm air trap its own downwash. The pilot forces it into a hard landing, its tail resting on the wall. No one is seriously hurt.", 1.00)], [("rotor", 0, 0, -0.5), ("crunch", 1, 0, 4.2)]),
 B("second", "raid", [("The second helicopter abandons its plan to drop men onto the roof, and lands outside the walls instead.", "The second helicopter abandons its plan to drop men onto the roof, and lands outside the walls instead.", 0.50),
   ("The element of surprise is slipping away.", "The element of surprise is slipping away.", 0.62),
   ("In Washington, the drone feed shows only grainy shapes. For around twenty minutes, no one in the room knows exactly what is happening inside the house.", "In Washington, the drone feed shows only grainy shapes. For around twenty minutes, no one in the room knows exactly what is happening inside the house.", 1.12)]),
 B("breach", "raid", [("The SEALs blast through walls and gates. In the guest house, the courier opens fire, and is killed.", "The SEALs blast through walls and gates. In the guest house, the courier opens fire, and is killed.", 0.50),
   ("In the main house, his brother, and his brother's wife, are also killed.", "In the main house, his brother and his brother's wife are also killed.", 1.12)], [("blast", 0, 0, 1.6), ("shots", 0, 0, 4.6)]),
 B("stairs", "raid", [("The team moves up the stairs, in total darkness. On the way, they meet bin Laden's adult son, Khalid. He is shot dead.", "The team moves up the stairs in total darkness. On the way, they meet bin Laden's adult son, Khalid. He is shot dead.", 0.62),
   ("On the third floor, a tall man looks out from a bedroom doorway.", "On the third floor, a tall man looks out from a bedroom doorway.", 1.75)], [("shots", 0, 1, -1.6), ("shots", 1, 1, 0.6)]),
 B("geronimo", "sitroom", [("Moments later, a radio call reaches Washington. For God and country. Geronimo.", "Moments later, a radio call reaches Washington: “For God and country. Geronimo.”", 0.75),
   ("Then: Geronimo, E.K.I.A. Enemy killed in action.", "Then: “Geronimo, EKIA.” Enemy killed in action.", 1.00),
   ("In the Situation Room, the president says quietly: We got him.", "In the Situation Room, the president says quietly: “We got him.”", 1.75)], [("radio", 0, 0, 2.2), ("radio", 1, 0, -0.2)]),
 # CHAPTER 6
 B("ch6", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("intel", "raid", [("The SEALs had been on the ground for about thirty-eight minutes.", "The SEALs had been on the ground for about thirty-eight minutes.", 0.50),
   ("They gathered computers, hard drives and documents, the largest collection of material ever taken from a senior terrorist leader.", "They gathered computers, hard drives and documents: the largest collection of material ever taken from a senior terrorist leader.", 1.00)]),
 B("destroy", "raid", [("They rigged the crashed helicopter with explosives, and destroyed it. A Chinook flew in to carry the rest of the team home.", "They rigged the crashed helicopter with explosives and destroyed it. A Chinook flew in to carry the rest of the team home.", 0.50),
   ("Only the burned tail section was left behind.", "Only the burned tail section was left behind.", 0.62),
   ("Pakistani fighter jets were scrambled, but by then, the Americans were already back across the border.", "Pakistani fighter jets were scrambled, but by then the Americans were already back across the border.", 1.12)], [("explosion", 0, 0, 3.8), ("rotor", 0, 1, -2.0)]),
 B("sea", "dawn", [("Bin Laden's body was identified by DNA. Within a day, it was washed, wrapped in a white sheet, and buried at sea, from the aircraft carrier U.S.S. Carl Vinson, in the North Arabian Sea.", "Bin Laden's body was identified by DNA. Within a day, it was washed, wrapped in a white sheet, and buried at sea from the aircraft carrier USS Carl Vinson, in the North Arabian Sea.", 0.75),
   ("American officials said no grave was left, so that it could never become a shrine.", "American officials said no grave was left, so that it could never become a shrine.", 1.50)], [("waves", 0, 0, 0.0)]),
 # CHAPTER 7
 B("ch7", "card", [], [("boom", None, 0, 0.2)], hold=4.5),
 B("crowds", "night", [("Late on Sunday night in Washington, President Obama told the world.", "Late on Sunday night in Washington, President Obama told the world.", 0.50),
   ("Crowds gathered outside the White House, in Times Square, and at Ground Zero.", "Crowds gathered outside the White House, in Times Square, and at Ground Zero.", 1.12)], [("crowd", 1, 0, -0.5)]),
 B("pakistan", "town", [("In Pakistan, the reaction was anger, and embarrassment. How had bin Laden lived for years, a short walk from the country's top military academy?", "In Pakistan, the reaction was anger and embarrassment. How had bin Laden lived for years, a short walk from the country's top military academy?", 0.50),
   ("And how had American helicopters flown in, unnoticed?", "And how had American helicopters flown in unnoticed?", 0.75),
   ("The files taken from the house told their own story. Bin Laden's letters showed that, even in hiding, he was still trying to direct al-Qaeda, and still planning attacks.", "The files taken from the house told their own story. Bin Laden's letters showed that, even in hiding, he was still trying to direct al-Qaeda, and still planning attacks.", 1.12)]),
 B("afridi", "office", [("The doctor who ran the fake vaccination campaign, Shakil Afridi, was arrested, and sentenced to thirty-three years in prison. The sentence was later reduced, but he remains behind bars.", "The doctor who ran the fake vaccination campaign, Shakil Afridi, was arrested and sentenced to 33 years in prison. The sentence was later reduced, but he remains behind bars.", 1.12)]),
 B("demolish", "day", [("In February two thousand twelve, Pakistan demolished the compound. Today, nothing of it remains.", "In February 2012, Pakistan demolished the compound. Today, nothing of it remains.", 1.12)], [("rubble", 0, 0, 0.8)]),
 B("zawahiri", "dark", [("Al-Qaeda survived. Bin Laden's deputy, Ayman al-Zawahiri, took command, until he too was killed, by an American drone strike in Kabul, in two thousand twenty-two.", "Al-Qaeda survived. Bin Laden's deputy, Ayman al-Zawahiri, took command, until he too was killed by an American drone strike in Kabul in 2022.", 1.12)]),
 B("end", "town", [("The hunt had taken nearly ten years.", "The hunt had taken nearly ten years.", 0.62),
   ("And in the end, the trail did not run through caves, or mountains, but through a courier, a phone call, and a white jeep,", "And in the end, the trail did not run through caves or mountains, but through a courier, a phone call, and a white jeep,", 0.50),
   ("to a house in a quiet town, where a man had been hiding in plain sight.", "to a house in a quiet town, where a man had been hiding in plain sight.", 3.00)]),
 B("credits", "credits", [], [], hold=12.0),
]
PRE = 0.5

def chunks(text, t0, t1, maxc=62):
    words, out, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxc: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    if len(out) > 1 and len(out[-1]) < 14: last = out.pop(); out[-1] += " " + last
    total, t, res = sum(len(c) for c in out), t0, []
    for c in out:
        d = (t1 - t0) * len(c) / total; res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return res
def trim(s, thr=0.01):
    idx = np.where(np.abs(s) > thr)[0]; return s if len(idx) == 0 else s[max(0, idx[0] - 500): idx[-1] + 2400]

t, audio, beats = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
for b in BEATS:
    start = t; subs, lines = [], []
    if b["lines"]: silence(PRE)
    for spoken, cap, pause in b["lines"]:
        s, _ = k.create(spoken, voice=VOICE, speed=SPEED, lang="en-us")
        s = trim(s.astype(np.float32)); s *= 0.9 / np.abs(s).max(); d = len(s) / SR
        subs += chunks(cap, t, t + d - 0.05); lines.append({"t0": round(t, 3), "t1": round(t + d, 3)})
        audio.append(s); t += d; silence(pause)
    if b["hold"]: silence(b["hold"])
    sfx = [{"name": nm, "t": round((start if li is None else (lines[li]["t1"] if pos else lines[li]["t0"])) + off, 3)} for nm, li, pos, off in b["sfx"]]
    beats.append({"id": b["id"], "mood": b["mood"], "start": round(start, 3), "end": round(t, 3), "lines": lines, "subs": subs, "sfx": sfx})
    print(f"{b['id']:10s} {start:7.2f} {t:7.2f}  " + " ".join(f"{l['t0']-start:.1f}-{l['t1']-start:.1f}" for l in lines))
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "beats": beats}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2), "min", round(t / 60, 2))
