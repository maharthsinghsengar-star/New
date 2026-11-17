"""Narration (Kokoro TTS, natural pace) and the beat timeline: map years, morphs and captions."""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELS = os.environ.get("MODELS", "../car-story/models")
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
VOICE = os.environ.get("VOICE", "af_heart")
SPEED, SR, PRE = 1.0, 24000, 1.2
# beat: id, lines (spoken, caption, pause after), morphs [(to_year, offset_s, dur_s)] ; offset < 0 => from beat end
B = lambda id, lines, morph=(), hold=0.0: dict(id=id, lines=lines, morph=list(morph), hold=hold)
BEATS = [
 B("hook", [("A thousand years ago, the world map looked nothing like it does today.", "A thousand years ago, the world map looked nothing like it does today.", 0.45),
            ("Watch how it changed.", "Watch how it changed.", 0.7)]),
 B("eu1000", [("In the year one thousand, Europe was a patchwork of kingdoms.", "In the year 1000, Europe was a patchwork of kingdoms.", 0.35),
              ("The Holy Roman Empire sat at its heart, and the Byzantine Empire ruled from Constantinople.", "The Holy Roman Empire sat at its heart, and the Byzantine Empire ruled from Constantinople.", 0.55)]),
 B("as1000", [("In the Middle East, the Fatimid Caliphate controlled Egypt.", "In the Middle East, the Fatimid Caliphate controlled Egypt.", 0.3),
              ("And far to the east, Song China was one of the richest states on Earth.", "And far to the east, Song China was one of the richest states on Earth.", 0.55)]),
 B("mongol", [("Then, in the twelve hundreds, the Mongols rode out of the steppe.", "Then, in the 1200s, the Mongols rode out of the steppe.", 0.3),
              ("In just a few decades, they built the largest connected land empire in history.", "In just a few decades, they built the largest connected land empire in history.", 0.6)],
   [(1200, 0.0, 0.01), (1279, 2.2, 4.5)]),
 B("split", [("But it didn't last.", "But it didn't last.", 0.3),
             ("The empire split apart, the Black Death swept across Europe and Asia, and in Anatolia, a new power was rising: the Ottomans.", "The empire split apart, the Black Death swept across Europe and Asia, and in Anatolia a new power was rising: the Ottomans.", 0.6)],
   [(1300, 0.6, 2.0), (1400, 4.2, 3.0)]),
 B("americas", [("Across the Atlantic, the Aztec and Inca empires ruled millions of people.", "Across the Atlantic, the Aztec and Inca empires ruled millions of people.", 0.3),
                ("But Europeans had just arrived.", "But Europeans had just arrived.", 0.55)],
   [(1500, 0.0, 1.6)]),
 B("conquest", [("Within decades, Spain and Portugal had claimed vast parts of the Americas.", "Within decades, Spain and Portugal had claimed vast parts of the Americas.", 0.3),
                ("And soon, European empires stretched across every ocean.", "And soon, European empires stretched across every ocean.", 0.55)],
   [(1530, 0.4, 2.4), (1650, 4.6, 2.6)]),
 B("russia", [("Meanwhile, Russia pushed east across Siberia, all the way to the Pacific.", "Meanwhile, Russia pushed east across Siberia, all the way to the Pacific.", 0.3),
              ("And in India, the Mughals united most of the subcontinent.", "And in India, the Mughals united most of the subcontinent.", 0.55)],
   [(1700, 4.4, 2.2)]),
 B("usa", [("In seventeen eighty-three, thirteen American colonies won their independence.", "In 1783, thirteen American colonies won their independence.", 0.5)],
   [(1783, 0.3, 2.2)]),
 B("latam", [("Within fifty years, almost all of Latin America had broken free as well.", "Within fifty years, almost all of Latin America had broken free as well.", 0.55)],
   [(1880, 0.6, 2.8)]),
 B("africa", [("Then came the scramble for Africa.", "Then came the scramble for Africa.", 0.3),
              ("In eighteen eighty, most of the continent was still ruled by Africans.", "In 1880, most of the continent was still ruled by Africans.", 0.3),
              ("By nineteen fourteen, Europe had carved up almost all of it.", "By 1914, Europe had carved up almost all of it.", 0.6)],
   [(1914, -4.2, 3.0)]),
 B("brit", [("At its height, the British Empire covered nearly a quarter of the world's land.", "At its height, the British Empire covered nearly a quarter of the world's land.", 0.6)]),
 B("ww1", [("The First World War brought down four empires: the German, Austro-Hungarian, Russian, and Ottoman.", "The First World War brought down four empires: the German, Austro-Hungarian, Russian and Ottoman.", 0.3),
           ("New countries appeared across Europe and the Middle East.", "New countries appeared across Europe and the Middle East.", 0.55)],
   [(1920, 3.4, 3.2)]),
 B("ww2", [("Twenty years later, a second world war redrew the map once again.", "Twenty years later, a second world war redrew the map once again.", 0.6)],
   [(1938, 0.2, 1.4), (1945, 2.4, 2.0)]),
 B("decol", [("Afterwards, the colonial empires began to collapse.", "Afterwards, the colonial empires began to collapse.", 0.3),
             ("India became independent in nineteen forty-seven.", "India became independent in 1947.", 0.3),
             ("And in nineteen sixty alone, seventeen African countries were born.", "And in 1960 alone, seventeen African countries were born.", 0.6)],
   [(1960, -5.2, 3.0)]),
 B("ussr", [("In nineteen ninety-one, the Soviet Union broke apart into fifteen countries.", "In 1991, the Soviet Union broke apart into fifteen countries.", 0.55)],
   [(1994, 1.2, 2.6)]),
 B("today", [("Today, there are around one hundred and ninety-five countries on Earth.", "Today, there are around 195 countries on Earth.", 0.6)],
   [(2026, 0.2, 2.6)]),
 B("outro", [("So, a thousand years from now, how many of these borders do you think will still be here?", "So, a thousand years from now… how many of these borders do you think will still be here?", 0.4)], hold=3.2),
]

def tts(text):
    a, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
    assert sr == SR
    # trim leading/trailing silence so pauses are exactly what we choose
    nz = np.nonzero(np.abs(a) > 0.01)[0]
    return a[max(0, nz[0] - 240): nz[-1] + 1200] if len(nz) else a

def chunks(cap):
    """caption chunks of at most ~32 chars, split at punctuation then words"""
    words = cap.split(); out, cur = [], ""
    for w in words:
        if cur and (len(cur) + 1 + len(w) > 30 or re.search(r"[,.:;!?…]$", cur) and len(cur) > 14):
            out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: out.append(cur)
    return out

def main():
    os.makedirs("build", exist_ok=True)
    audio = [np.zeros(int(PRE * SR), np.float32)]; t = PRE; timeline = []
    for b in BEATS:
        st = t; subs = []
        for spoken, cap, pause in b["lines"]:
            a = tts(spoken); d = len(a) / SR
            cs = chunks(cap); tot = sum(len(c) for c in cs); ct = t
            for c in cs:
                cd = d * len(c) / tot; subs.append(dict(text=c, start=round(ct, 3), end=round(ct + cd, 3))); ct += cd
            audio += [a.astype(np.float32), np.zeros(int(pause * SR), np.float32)]; t += d + pause
        if b["hold"]: audio.append(np.zeros(int(b["hold"] * SR), np.float32)); t += b["hold"]
        en = t
        morph = [dict(year=y, start=round((st + o) if o >= 0 else (en + o), 3), dur=dd) for y, o, dd in b["morph"]]
        timeline.append(dict(id=b["id"], start=round(st, 3), end=round(en, 3), subs=subs, morph=morph))
        print(f"{b['id']:9s} {st:6.2f} -> {en:6.2f}")
    v = np.concatenate(audio)
    sf.write("build/voice.wav", v, SR)
    json.dump(dict(duration=round(t, 3), beats=timeline), open("build/timeline.json", "w"), indent=1)
    print("total", round(t, 2))

if __name__ == "__main__":
    main()
