"""Hindi narration (Kokoro TTS) for the deer-and-monkey story + scene/subtitle timeline.
Three voices: a calm male narrator, a quicker, higher monkey and a soft, gentle deer."""
import json, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
st = k.get_voice_style
# speaker -> (voice style, speed, pitch factor)
VOICES = {
    "n": (st("hm_omega"), 0.86, 0.97),                          # narrator: slow, slightly deeper
    "m": (st("hm_psi"), 1.0, 1.12),                              # monkey: cheeky
    "d": (st("hm_psi") * 0.55 + st("hf_alpha") * 0.45, 0.88, 1.0),  # deer: soft, young
}
# scenes -> sentences: (speaker, text, pause after in seconds)
SCENES = [
 [("n", "अपनों का धोखा, अंदर तक तोड़ देता है...", 0.9)],
 [("n", "एक जंगल में, एक हिरण और बंदर की बहुत गहरी दोस्ती थी।", 0.6)],
 [("n", "बंदर हमेशा हिरण से कहता,", 0.35),
  ("m", "तुम बस मुझ पर भरोसा रखना, मैं कभी तुम्हारा बुरा नहीं होने दूँगा।", 0.6),
  ("n", "हिरण भी उस पर, आँख बंद करके भरोसा करता था।", 0.6)],
 [("n", "एक दिन बंदर ने हिरण से कहा,", 0.35),
  ("m", "चलो, आज तुम्हें एक ऐसी जगह ले चलता हूँ, जहाँ ढेर सारे मीठे फल हैं।", 0.6)],
 [("n", "हिरण खुशी-खुशी उसके साथ चल पड़ा।", 0.8)],
 [("n", "लेकिन जैसे ही दोनों वहाँ पहुँचे,", 0.45),
  ("n", "हिरण के सामने, एक शिकारी का जाल बिछा था!", 0.7)],
 [("n", "हिरण किसी तरह बचकर निकला, और उसने बंदर से पूछा,", 0.4),
  ("d", "तुम्हें पता था, यहाँ जाल है?", 0.9)],
 [("n", "बंदर की चुप्पी ने, सब कुछ बता दिया।", 1.0)],
 [("n", "हिरण की आँखें नम हो गईं। उसने बस इतना कहा,", 0.55),
  ("d", "दर्द जाल में फँसने का नहीं है,", 0.45),
  ("d", "दर्द तो इस बात का है, कि रास्ता दिखाने वाला ही, मुझे फँसाने लाया था।", 1.0)],
 [("n", "और उस दिन, हिरण ने जिंदगी का सबसे बड़ा सबक सीखा।", 0.9)],
 [("n", "सीख।", 0.5),
  ("n", "किसी पर भरोसा जरूर करो, लेकिन आँखें बंद करके कभी नहीं।", 0.6),
  ("n", "क्योंकि हर मीठी आवाज़ में सच्चाई नहीं होती,", 0.4),
  ("n", "और हर अपना दिखने वाला, वफादार नहीं।", 0.6)],
]
PRE, INTRO, OUTRO, SR = 0.6, 0.8, 2.6, 24000

def repitch(a, f):
    """Shift pitch by resampling (speed was pre-compensated in synthesis)."""
    if abs(f - 1) < 1e-3: return a
    n = int(len(a) / f)
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)

def chunks(text, t0, t1, who, maxc=20):
    words, out, cur = text.replace("...", "…").split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxc: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    if len(out) > 1 and len(out[-1]) < 5: out[-2] += " " + out.pop()
    total, t, res = sum(len(c) for c in out), t0, []
    for c in out:
        d = (t1 - t0) * len(c) / total
        res.append({"text": c, "t0": round(t, 3), "t1": round(t + d, 3), "who": who}); t += d
    return res

t, audio, timeline = 0.0, [], []
def silence(d):
    global t
    n = int(round(d * SR)); audio.append(np.zeros(n, dtype=np.float32)); t += n / SR
for i, sc in enumerate(SCENES):
    start = t; silence(PRE + (INTRO if i == 0 else 0)); subs, lines = [], []
    for who, text, pause in sc:
        style, speed, pf = VOICES[who]
        s, _ = k.create(text, voice=style, speed=speed / pf, lang="hi")   # pre-compensate tempo
        s = repitch(s.astype(np.float32), pf); s *= 0.9 / np.abs(s).max()
        if who == "d": s *= 0.92
        subs += chunks(text, t, t + len(s) / SR, who)
        lines.append({"who": who, "t0": round(t, 3), "t1": round(t + len(s) / SR, 3)})
        audio.append(s); t += len(s) / SR; silence(pause)
    if i == len(SCENES) - 1: silence(OUTRO)
    timeline.append({"start": round(start, 3), "end": round(t, 3), "subs": subs, "lines": lines})
    print(i, round(start, 2), round(t, 2))
a = np.concatenate(audio)
sf.write("build/voice.wav", a * (0.89 / np.abs(a).max()), SR)
json.dump({"duration": round(t, 3), "scenes": timeline}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", t)
