"""Hindi narration (Kokoro TTS) for the school hairstyle-checking comedy short + shot/caption/sfx timeline.
Three voices: a lively narrator, a booming PT sir and a squeaky Bunty. Captions are Hinglish (roman); *word* = highlight."""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
st = k.get_voice_style
VOICES = {   # speaker -> (voice style, speed, pitch factor, gain)
    "n": (st("hm_omega"), 1.04, 1.0, 1.0),
    "p": (st("hm_psi") * 0.7 + st("hm_omega") * 0.3, 0.98, 0.84, 1.0),
    "b": (st("hm_psi") * 0.5 + st("hf_alpha") * 0.5, 1.02, 1.2, 0.9),
}
# beat: id, lines (speaker, hindi for the voice, hinglish caption, pause after), sfx (name, line index, 0 = line start / 1 = line end, offset)
BEATS = [
 dict(id="title", hold=2.9, lines=[], sfx=[("bell", 0.15)]),
 dict(id="intro", lines=[
  ("n", "स्कूल में सबसे खतरनाक चीज़, एग्ज़ाम नहीं था।", "School mein sabse *khatarnak* cheez, *exam* nahi tha.", 0.3),
  ("n", "सुबह की असेंबली के बाद वाली, चेकिंग थी!", "Subah ki assembly ke baad wali, *CHECKING* thi!", 0.7)],
  sfx=[("whistle", 1, 0, -0.5), ("dun", 1, 1, -0.55)]),
 dict(id="checks", lines=[
  ("n", "पहले जूते।", "Pehle *joote*.", 0.45),
  ("n", "फिर बेल्ट।", "Phir *belt*.", 0.45),
  ("n", "फिर नाखून।", "Phir *nakhoon*.", 0.5),
  ("n", "और आखिर में...", "Aur aakhir mein...", 0.75),
  ("n", "हेयरस्टाइल!", "*HAIRSTYLE!*", 0.9)],
  sfx=[("pop", 0, 0, 0), ("pop", 1, 0, 0), ("pop", 2, 0, 0), ("riser", 3, 0, 0), ("ting", 4, 0, 0.1), ("dun", 4, 0, 0.0)]),
 dict(id="bunty", lines=[
  ("n", "हमारी क्लास में था, बंटी।", "Hamari class mein tha, *BUNTY*.", 0.45),
  ("n", "बंटी रोज़, आधी डिब्बी जेल लगाकर, स्पाइक्स बनाता था।", "Bunty roz, aadhi dibbi *gel* lagakar, *spikes* banata tha.", 0.4),
  ("n", "वो बाल नहीं थे... मोबाइल टावर था!", "Wo baal nahi the... *MOBILE TOWER* tha!", 0.8)],
  sfx=[("ting", 0, 1, -0.3), ("boing", 1, 0, 1.3), ("boing", 1, 0, 2.1), ("boing", 1, 0, 2.9), ("beep", 2, 1, -0.9), ("beep", 2, 1, -0.5), ("beep", 2, 1, -0.1)]),
 dict(id="ptsir", lines=[
  ("n", "तभी आते थे, हमारे पी टी सर।", "Tabhi aate the, hamare *PT SIR*.", 0.4),
  ("n", "गले में सीटी,", "Gale mein *seeti*,", 0.75),
  ("n", "हाथ में स्टील का कड़ा,", "haath mein steel ka *kada*,", 0.5),
  ("n", "और आँखों में... स्कैनर।", "aur aankhon mein... *SCANNER*.", 1.5)],
  sfx=[("stomp", 0, 0, 0.3), ("stomp", 0, 0, 0.9), ("stomp", 0, 0, 1.5), ("stomp", 0, 0, 2.1), ("whistle", 1, 1, 0.05), ("ting", 2, 1, -0.1),
       ("scan", 3, 1, -0.5), ("alarm", 3, 1, 0.6)]),
 dict(id="caught", lines=[
  ("p", "ये क्या है? सिर पे कैक्टस उगाया है?", "Ye kya hai? Sar pe *CACTUS* ugaya hai?", 0.5),
  ("b", "सर... ये नैचुरल है।", "Sir... ye *natural* hai.", 0.5),
  ("p", "नैचुरल? बेटा, नैचुरल तो मेरा गुस्सा है!", "Natural? Beta, natural toh mera *GUSSA* hai!", 0.8)],
  sfx=[("pop", 0, 1, -0.9), ("gulp", 1, 0, -0.3), ("steam", 2, 1, -1.2), ("dun", 2, 1, -0.2)]),
 dict(id="parade", lines=[
  ("n", "स्पाइक्स वालों की, अलग लाइन लगती थी।", "Spikes walon ki, *alag line* lagti thi.", 0.35),
  ("n", "और पूरे स्कूल के सामने, परेड।", "Aur poore school ke saamne, *PARADE*.", 0.45),
  ("n", "जैसे बाल नहीं बनाए... बैंक लूटा हो!", "Jaise baal nahi banaye... *BANK LOOTA* ho!", 0.9)],
  sfx=[("march", 1, 0, 0), ("camera", 2, 1, -1.2), ("camera", 2, 1, 0.25)]),
 dict(id="oil", lines=[
  ("n", "लेकिन सर का असली हथियार, तो कुछ और था।", "Lekin sir ka asli *hathiyar*, toh kuch aur tha.", 0.4),
  ("n", "नारियल तेल की बोतल!", "*NARIYAL TEL* ki bottle!", 0.9),
  ("n", "एक चम्पी... और बंटी, रॉकस्टार से सीधा,", "Ek *champi*... aur Bunty, *rockstar* se seedha,", 0.55),
  ("n", "बैंक मैनेजर!", "*BANK MANAGER!*", 1.3)],
  sfx=[("riser", 0, 0, 0.3), ("choir", 1, 0, -0.1), ("rub", 2, 0, 0.2), ("slidedown", 2, 1, -1.1), ("ting", 3, 0, 0.0), ("wah", 3, 1, -0.1)]),
 dict(id="cap", lines=[
  ("n", "अगले दिन, बंटी टोपी पहनकर आया।", "Agle din, Bunty *topi* pehenkar aaya.", 0.5),
  ("p", "टोपी उतार!", "*Topi utaar!*", 0.5),
  ("n", "टोपी उतरी...", "Topi utri...", 0.9),
  ("n", "और अंदर से निकले, डबल स्पाइक्स!", "aur andar se nikle, *DOUBLE SPIKES!*", 1.9)],
  sfx=[("whistle", 1, 0, -0.45), ("riser", 2, 0, 0.0), ("boing", 3, 0, -0.25), ("ting", 3, 0, 0.3), ("slidedown", 3, 1, 0.2), ("thud", 3, 1, 1.0)]),
 dict(id="twist", lines=[
  ("n", "आज बंटी, खुद पी टी सर है।", "Aaj Bunty, khud *PT SIR* hai.", 0.5),
  ("n", "और हाँ...", "Aur haan...", 0.7),
  ("n", "अब वो गंजा है।", "ab wo *GANJA* hai.", 1.2)],
  sfx=[("whistle", 0, 1, 0.0), ("ting", 2, 0, 0.25), ("rimshot", 2, 1, 0.1)]),
 dict(id="end", hold=3.0, lines=[], sfx=[]),
]
PRE, SR = 0.25, 24000

def repitch(a, f):
    if abs(f - 1) < 1e-3: return a
    n = int(len(a) / f)
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)

def trim(s, thr=0.012):
    idx = np.where(np.abs(s) > thr)[0]
    return s if len(idx) == 0 else s[max(0, idx[0] - 600): idx[-1] + 1800]

def chunks(text, t0, t1, who, maxc=15):
    words, out, cur = text.split(), [], ""
    for w in words:
        plain = len(re.sub(r"\*", "", cur + " " + w))
        if cur and plain > maxc: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    fixed, inside = [], False        # keep *highlight* markers balanced inside every chunk
    for c in out:
        if inside: c = "*" + c
        if c.count("*") % 2: c += "*"; inside = True
        else: inside = False
        fixed.append(c)
    L = [len(c.replace("*", "")) + 3 for c in fixed]; total, t, res = sum(L), t0, []
    for c, l in zip(fixed, L):
        d = (t1 - t0) * l / total
        res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3), "who": who}); t += d
    return res

t, audio, beats = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
for b in BEATS:
    start = t; subs, lines = [], []
    if b["lines"]: silence(PRE)
    for who, text, cap, pause in b["lines"]:
        style, speed, pf, gain = VOICES[who]
        s, _ = k.create(text, voice=style, speed=speed / pf, lang="hi")
        s = trim(repitch(s.astype(np.float32), pf)); s *= 0.9 * gain / np.abs(s).max()
        d = len(s) / SR
        subs += chunks(cap, t, t + d - 0.05, who)
        lines.append({"who": who, "t0": round(t, 3), "t1": round(t + d, 3)})
        audio.append(s); t += d; silence(pause)
    if "hold" in b: silence(b["hold"])
    sfx = []
    for e in b["sfx"]:
        if len(e) == 2: sfx.append({"name": e[0], "t": round(start + e[1], 3)})
        else: name, li, pos, off = e; l = lines[li]; sfx.append({"name": name, "t": round((l["t1"] if pos else l["t0"]) + off, 3)})
    beats.append({"id": b["id"], "start": round(start, 3), "end": round(t, 3), "lines": lines, "subs": subs, "sfx": sfx})
    print(b["id"], round(start, 2), round(t, 2))
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "beats": beats}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", t)
