"""Dialogue with exact punctuation pauses (Piper native Hindi voices) -> build/voice.wav + build/timeline.json.

Each line is split into phrases at punctuation; every phrase is synthesised on its own and joined with a silence:
  comma 0.3 s, full stop / danda / ! / ? 0.6 s, ellipsis (…) 1.0 s.  "|" marks a [SHORT PAUSE] (+0.35 s).
The timeline keeps every phrase (captions + graphic cues) and a mouth envelope per line for lip-sync.
"""
import json, os, re, numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
from scipy.signal import lfilter, butter

VOICES = {k: PiperVoice.load(f"voices/hi_IN-{v}-medium.onnx") for k, v in {"J": "pratham", "R": "rohan", "W": "priyamvada"}.items()}
SR, FPS = 22050, 30
P_COMMA, P_STOP, P_ELLIPSIS, P_SHORT, P_SPEAKER = 0.3, 0.6, 1.0, 0.35, 0.75

# (scene, speaker, caption text exactly as scripted, length_scale (delivery speed), volume, pause after the line, lead-in)
L = [
 (1, "J", "अरे भाई!… हैप्पी दिवाली! | कैसी चल रही है जिंदगी?… और कैसा चल रहा है बिजनेस?", 1.0, 1.0, P_SPEAKER, 2.4),
 (1, "R", "दिवाली तो अच्छी है यार… लेकिन बिजनेस में वो रौनक नहीं आ रही, जिसकी उम्मीद थी!", 1.1, 0.9, P_SPEAKER, 0),
 (2, "J", "अरे!… ऐसा क्या हो गया?", 1.0, 1.0, P_SPEAKER, 0.6),
 (2, "R", "क्या बताऊँ यार!… हर महीने पचास हजार रुपये मार्केटिंग पर खर्च करता हूँ। | विज्ञापन भी करवाता हूँ… लेकिन बिजनेस की ग्रोथ, उम्मीद के मुताबिक नहीं हो रही।", 1.1, 0.95, 0.5, 0),
 (2, "R", "सबसे बड़ी परेशानी है… सही लोगों तक पहुँच और भरोसेमंद बिजनेस कनेक्शन की!", 1.08, 1.0, P_SPEAKER, 0),
 (2, "W", "और भैया… हम भी अपना नया बिजनेस शुरू करना चाहते हैं। | लेकिन इस नए शहर में… न कोई पहचान है, और न ही कोई बिजनेस नेटवर्क। | समझ ही नहीं आता… शुरुआत कहाँ से करें?", 1.1, 0.92, P_SPEAKER, 0),
 (3, "J", "अरे भाई!… बिजनेस में सिर्फ पैसा और मेहनत ही काफी नहीं होते। | सही लोगों से जुड़ना… और सही नेटवर्क बनाना भी उतना ही जरूरी है!", 1.0, 1.0, 0.5, 0.4),
 (3, "J", "इसीलिए तो है… SAHI CLICK!", 1.02, 1.0, 0.8, 0),
 (3, "J", "एक ऐसा बिजनेस नेटवर्क… जहाँ मिलते हैं अलग-अलग क्षेत्रों के उद्यमी, नए बिजनेस कनेक्शन, एक-दूसरे से सीखने का मौका… और आगे बढ़ने के नए अवसर।", 1.0, 1.0, 0.5, 0),
 (3, "J", "क्योंकि जब सही लोग… एक-दूसरे से जुड़ते हैं, तो तरक्की के रास्ते भी खुलते हैं!", 1.0, 1.0, P_SPEAKER, 0),
 (4, "J", "तो इस बार… इक्कीस नवंबर को तुम दोनों जरूर आना! | SAHI CLICK के… MEGA VISITOR DAY पर!", 1.0, 1.0, P_SPEAKER, 0.4),
 (4, "R", "अच्छा!… वहाँ हमें क्या खास मिलेगा?", 1.0, 1.0, P_SPEAKER, 0),
 (4, "J", "नए लोगों से मिलने का मौका… बिजनेस आइडियाज… मजबूत कनेक्शन… और अपने बिजनेस को आगे बढ़ाने का एक नया नजरिया!", 1.0, 1.0, P_SPEAKER, 0),
 (4, "JRW", "तो मिलते हैं… इक्कीस नवंबर को!", 1.0, 1.0, 0.9, 0),
]
FINAL_HOLD = 7.0     # final screen (on-screen text only, music)

# spoken form: brand names in Devanagari, nukta spellings so the phonemiser pronounces them correctly
SPOKEN = [("SAHI CLICK", "सही क्लिक"), ("MEGA VISITOR DAY", "मेगा विज़िटर डे"), ("बिजनेस", "बिज़नेस"), ("जिंदगी", "ज़िंदगी"), ("हजार", "हज़ार"),
          ("जरूर", "ज़रूर"), ("मजबूत", "मज़बूत"), ("नजरिया", "नज़रिया"), ("आइडियाज", "आइडियाज़"), ("सिर्फ", "सिर्फ़"), ("काफी", "काफ़ी"), ("खास", "ख़ास")]

def phrases(text):
    """split at punctuation clusters -> [(caption phrase, spoken phrase, pause after)]"""
    out = []
    for part in re.finditer(r"[^,।.!?…|]+[,।.!?…]*|\|", text):
        p = part.group(0).strip()
        if not p: continue
        if p == "|":
            if out: out[-1][2] += P_SHORT
            continue
        m = re.search(r"[,।.!?…]+$", p); punct = m.group(0) if m else ""
        pause = P_ELLIPSIS if "…" in punct else P_STOP if re.search(r"[।.!?]", punct) else P_COMMA if "," in punct else 0.15
        spoken = p
        for a, b in SPOKEN: spoken = spoken.replace(a, b)
        # an ellipsis mid-thought keeps a continuing intonation; "!…" / "?…" keep their own tone
        spoken = re.sub(r"…+$", "", spoken).rstrip()
        if not re.search(r"[,।.!?]$", spoken): spoken += ","
        out.append([p, spoken, pause])
    return out

def clarity(a):
    b, c = butter(2, 90 / (SR / 2), "high"); a = lfilter(b, c, a)
    b, c = butter(2, [2500 / (SR / 2), 5500 / (SR / 2)], "band"); a = a + 0.3 * lfilter(b, c, a)
    return a.astype(np.float32)

def say(text, who, ls):
    cfg = SynthesisConfig(length_scale=ls, noise_scale=0.45, noise_w_scale=0.6)
    a = np.concatenate([c.audio_float_array for c in VOICES[who].synthesize(text, syn_config=cfg)])
    nz = np.nonzero(np.abs(a) > 0.01)[0]
    a = a[max(0, nz[0] - 150): nz[-1] + 700] if len(nz) else a
    return clarity(a)

def envelope(a):
    hop = SR // FPS; n = len(a) // hop + 1
    e = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    e = e / (np.percentile(e[e > 1e-4], 92) + 1e-9)
    return [round(float(min(1.2, x)), 3) for x in e]

def main():
    os.makedirs("build", exist_ok=True)
    out = []; t = 0.0; lines = []; scenes = {}
    for sc, who, text, ls, vol, pause, lead in L:
        if lead: out.append(np.zeros(int(lead * SR), np.float32)); t += lead
        start = t; segs = []; chunks = []
        ph = phrases(text)
        for k, (cap, spoken, p) in enumerate(ph):
            if who == "JRW":
                parts = [say(spoken, w, ls) for w in "JRW"]; n = max(len(x) for x in parts)
                a = sum(np.pad(x, (0, n - len(x))) for x in parts) / 1.9
            else:
                a = say(spoken, who, ls)
            a = a / (np.abs(a).max() + 1e-9) * 0.9 * vol
            d = len(a) / SR
            segs.append(dict(text=cap, start=round(t, 3), end=round(t + d, 3)))
            last = k == len(ph) - 1
            gap = pause if last else p
            chunks += [a, np.zeros(int(gap * SR), np.float32)]; t += d + gap
        line_audio = np.concatenate(chunks[:-1])          # without the trailing pause
        out += chunks
        end = segs[-1]["end"]
        scenes.setdefault(sc, [start, t]); scenes[sc][1] = t
        lines.append(dict(scene=sc, who=who, start=round(start, 3), end=round(end, 3), text=text.replace(" | ", " "), segs=segs, marks=[s["start"] for s in segs], env=envelope(line_audio)))
        print(f"S{sc} {who:3s} {start:6.2f}-{end:6.2f}  " + " / ".join(f"{s['text']}" for s in segs)[:110])
    # final screen
    scenes[5] = [t, t + FINAL_HOLD]; out.append(np.zeros(int(FINAL_HOLD * SR), np.float32)); t += FINAL_HOLD
    v = np.concatenate(out)
    sf.write("build/voice.wav", v, SR)
    sc = sorted(scenes); bounds = {}
    for i, s in enumerate(sc):
        st = 0 if i == 0 else bounds[sc[i - 1]][1]
        bounds[s] = [round(st, 3), round(scenes[s][1], 3)]
    json.dump(dict(duration=round(t, 3), lines=lines, scenes=bounds), open("build/timeline.json", "w"), ensure_ascii=False)
    print("total", round(t, 2), bounds)

if __name__ == "__main__":
    main()
