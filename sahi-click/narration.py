"""Dialogue (Kokoro Hindi voices) -> build/voice.wav + build/timeline.json (lines, speakers, mouth envelopes, scenes)."""
import json, os, re, numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
from scipy.signal import lfilter, butter

# Piper neural Hindi voices (native speakers): Jitu = Pratham, Raj = Rohan, wife = Priyamvada; closing line in Jitu's voice
VOICES = {k: PiperVoice.load(f"voices/hi_IN-{v}-medium.onnx") for k, v in {"J": "pratham", "R": "rohan", "W": "priyamvada"}.items()}
VOICES["N"] = VOICES["J"]
SR, FPS = 22050, 30
LENGTH = float(os.environ.get("LENGTH", "1.0"))          # 1.0 = the voice's natural speaking rate
CFG = SynthesisConfig(length_scale=LENGTH, noise_scale=0.45, noise_w_scale=0.6)
# (scene, speaker, spoken text, caption text, pause after, lead-in before)
L = [
 (1, "J", "अरे भाई! हैप्पी दिवाली! कैसी चल रही है ज़िंदगी, और कैसा चल रहा है बिज़नेस?", "अरे भाई! हैप्पी दिवाली! कैसी चल रही है जिंदगी और कैसा चल रहा है बिजनेस?", 0.3, 2.6),
 (1, "R", "दिवाली तो अच्छी है यार, लेकिन बिज़नेस में वो रौनक नहीं आ रही, जिसकी उम्मीद थी!", "दिवाली तो अच्छी है यार, लेकिन बिजनेस में वो रौनक नहीं आ रही जिसकी उम्मीद थी!", 0.45, 0),
 (2, "J", "अरे! ऐसा क्या हो गया?", "अरे! ऐसा क्या हो गया?", 0.3, 0.5),
 (2, "R", "क्या बताऊँ यार! हर महीने पचास हज़ार रुपये मार्केटिंग पर खर्च करता हूँ। विज्ञापन भी करवाता हूँ, लेकिन बिज़नेस की ग्रोथ उम्मीद के मुताबिक नहीं हो रही।",
  "क्या बताऊँ यार! हर महीने ₹50,000 मार्केटिंग पर खर्च करता हूँ। विज्ञापन भी करवाता हूँ, लेकिन बिजनेस की ग्रोथ उम्मीद के मुताबिक नहीं हो रही।", 0.25, 0),
 (2, "R", "सबसे बड़ी परेशानी है, सही लोगों तक पहुँच, और भरोसेमंद बिज़नेस कनेक्शन की!", "सबसे बड़ी परेशानी है सही लोगों तक पहुँच और भरोसेमंद बिजनेस कनेक्शन की!", 0.4, 0),
 (2, "W", "और भैया, हम भी अपना नया बिज़नेस शुरू करना चाहते हैं, लेकिन इस नए शहर में न कोई पहचान है, और न ही कोई बिज़नेस नेटवर्क। समझ ही नहीं आता, शुरुआत कहाँ से करें!",
  "और भैया, हम भी अपना नया बिजनेस शुरू करना चाहते हैं, लेकिन इस नए शहर में न कोई पहचान है और न ही कोई बिजनेस नेटवर्क। समझ ही नहीं आता शुरुआत कहाँ से करें!", 0.5, 0),
 (3, "J", "अरे भाई! बिज़नेस में सिर्फ़ पैसा और मेहनत ही काफ़ी नहीं होते। सही लोगों से जुड़ना, और सही नेटवर्क बनाना भी उतना ही ज़रूरी है!",
  "अरे भाई! बिजनेस में सिर्फ पैसा और मेहनत ही काफी नहीं होते। सही लोगों से जुड़ना और सही नेटवर्क बनाना भी उतना ही जरूरी है!", 0.3, 0.3),
 (3, "J", "इसीलिए तो है, सही क्लिक!", "इसीलिए तो है SAHI CLICK!", 0.45, 0),
 (3, "J", "एक ऐसा बिज़नेस नेटवर्क, जहाँ मिलते हैं अलग-अलग क्षेत्रों के उद्यमी, नए बिज़नेस कनेक्शन, एक-दूसरे से सीखने का मौका, और आगे बढ़ने के नए अवसर।",
  "एक ऐसा बिजनेस नेटवर्क जहाँ मिलते हैं अलग-अलग क्षेत्रों के उद्यमी, नए बिजनेस कनेक्शन, एक-दूसरे से सीखने का मौका और आगे बढ़ने के नए अवसर।", 0.3, 0),
 (3, "J", "क्योंकि जब सही लोग एक-दूसरे से जुड़ते हैं, तो तरक्की के रास्ते भी खुलते हैं!", "क्योंकि जब सही लोग एक-दूसरे से जुड़ते हैं, तो तरक्की के रास्ते भी खुलते हैं!", 0.5, 0),
 (4, "J", "तो इस बार इक्कीस नवंबर को तुम दोनों ज़रूर आना, सही क्लिक के मेगा विज़िटर डे पर!", "तो इस बार 21 नवंबर को तुम दोनों जरूर आना SAHI CLICK के MEGA VISITOR DAY पर!", 0.3, 0.3),
 (4, "R", "अच्छा! वहाँ हमें क्या खास मिलेगा?", "अच्छा! वहाँ हमें क्या खास मिलेगा?", 0.25, 0),
 (4, "J", "नए लोगों से मिलने का मौका, बिज़नेस आइडियाज़, मज़बूत कनेक्शन, और अपने बिज़नेस को आगे बढ़ाने का एक नया नज़रिया!",
  "नए लोगों से मिलने का मौका, बिजनेस आइडियाज, मजबूत कनेक्शन और अपने बिजनेस को आगे बढ़ाने का एक नया नजरिया!", 0.35, 0),
 (4, "JRW", "तो मिलते हैं इक्कीस नवंबर को, सही क्लिक मेगा विज़िटर डे पर!", "तो मिलते हैं 21 नवंबर को, SAHI CLICK MEGA VISITOR DAY पर!", 0.6, 0),
 (5, "N", "सही लोग, सही पहचान, और बिज़नेस ग्रोथ की नई उड़ान! आइए, जुड़िए सही क्लिक से।", "सही लोग, सही पहचान और बिजनेस ग्रोथ की नई उड़ान!", 2.2, 0.3),
]

def clarity(a):
    """gentle high-pass + presence lift so speech stays crisp over the music"""
    b, c = butter(2, 90 / (SR / 2), "high"); a = lfilter(b, c, a)
    b, c = butter(2, [2500 / (SR / 2), 5500 / (SR / 2)], "band"); a = a + 0.35 * lfilter(b, c, a)
    return (a / (np.abs(a).max() + 1e-9) * 0.92).astype(np.float32)

def tts(text, who):
    a = np.concatenate([c.audio_float_array for c in VOICES[who].synthesize(text, syn_config=CFG)])
    nz = np.nonzero(np.abs(a) > 0.01)[0]
    a = a[max(0, nz[0] - 200): nz[-1] + 900] if len(nz) else a
    return clarity(a)

def envelope(a):
    hop = SR // FPS; n = len(a) // hop + 1
    e = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    e = e / (np.percentile(e, 95) + 1e-9)
    return [round(float(min(1.2, x)), 3) for x in e]

def main():
    os.makedirs("build", exist_ok=True)
    out = [np.zeros(0, np.float32)]; t = 0.0; lines = []; scenes = {}
    for sc, who, spoken, cap, pause, lead in L:
        if lead: out.append(np.zeros(int(lead * SR), np.float32)); t += lead
        if who == "JRW":
            parts = [tts(spoken, w) for w in "JRW"]; n = max(len(p) for p in parts)
            a = sum(np.pad(p, (0, n - len(p))) for p in parts) / 2.0
            env = envelope(a)
        else:
            a = tts(spoken, who); env = envelope(a)
        d = len(a) / SR
        scenes.setdefault(sc, [t, t])
        lines.append(dict(scene=sc, who=who, start=round(t, 3), end=round(t + d, 3), text=cap, env=env))
        out += [a, np.zeros(int(pause * SR), np.float32)]; t += d + pause
        scenes[sc][1] = t
        print(f"S{sc} {who:3s} {lines[-1]['start']:6.2f}-{lines[-1]['end']:6.2f}")
    v = np.concatenate(out)
    sf.write("build/voice.wav", v, SR)
    sc = sorted(scenes); bounds = {}
    for i, s in enumerate(sc):
        st = 0 if i == 0 else bounds[sc[i - 1]][1]
        bounds[s] = [round(st, 3), round(scenes[s][1], 3)]
    json.dump(dict(duration=round(t, 3), lines=lines, scenes=bounds), open("build/timeline.json", "w"))
    print("total", round(t, 2), bounds)

if __name__ == "__main__":
    main()
