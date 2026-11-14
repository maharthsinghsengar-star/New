"""Shot and caption timeline, hand-timed to the stand-up audio (standup.mp3). *word* = highlighted caption word."""
import json
DUR = 62.67
BEATS = [("assembly", 0.0), ("torture", 2.0), ("serious", 5.5), ("checking", 9.7), ("spikes", 15.2), ("line", 16.7), ("qaidi", 18.45), ("school", 19.5),
         ("sports", 24.0), ("haiwaan", 25.5), ("kada", 27.0), ("peeche", 28.4), ("ruhani", 31.0), ("thappad", 32.9), ("mazaak", 35.4), ("tere", 36.8),
         ("sonic", 38.9), ("noch", 41.7), ("gel", 45.2), ("peeche2", 47.3), ("ukhaad", 49.3), ("jaanwar", 51.3), ("chhote", 53.5), ("pull", 55.2), ("ganja", 57.2), ("baap", 59.3)]
SUBS = [
 (0.25, 0.5, "JO *BACCHE*"), (0.5, 1.0, "*ZINDA* BACH"), (1.0, 1.5, "JAATE THE NA"), (1.5, 2.0, "*ASSEMBLY* MEIN"), (2.0, 2.5, "UNKE SAATH"), (2.5, 2.75, "*SECOND DEGREE*"),
 (2.75, 3.0, "*TORTURE* SHURU"), (3.0, 4.2, "HOTA THA"), (4.25, 4.5, "*DISCIPLINE* KE"), (4.5, 5.3, "NAAM PE"),
 (10.0, 10.25, "TOH HUM"), (10.25, 10.5, "*LADKON* KI"), (10.5, 10.75, "*CHECKING*"), (10.75, 11.2, "KARTE THE"), (11.25, 11.75, "*SHOES*"), (11.75, 12.35, "*BELT*"),
 (12.35, 13.0, "*UNIFORM*"), (13.0, 13.5, "*NAHI!*"), (13.5, 15.15, "*HAIRSTYLE!*"),
 (15.25, 15.5, "JO LADKE"), (15.5, 15.75, "*SPIKES* BANATE"), (15.75, 16.7, "THE NA"), (16.75, 17.0, "UNKO *LINE* MEIN"), (17.0, 17.5, "NA AISE EK"), (17.5, 17.75, "*ALAG* SE"),
 (17.75, 18.0, "KHADA KAR"), (18.0, 18.45, "DETE THE"), (18.5, 18.75, "*QAIDIYON*"), (18.75, 19.45, "KI TARAH"),
 (19.5, 19.75, "AUR POORA"), (19.75, 20.25, "*SCHOOL* UNKE"), (20.25, 20.5, "SAAMNE SE"), (20.5, 21.0, "AISE *HARAMIYON*"), (21.0, 21.25, "KI TARAH"), (21.25, 22.1, "NIKALTA THA"),
 (24.0, 24.25, "PHIR HAMARE"), (24.25, 24.5, "*SPORTS* WALE"), (24.5, 25.5, "*SIR* AATE THE"), (25.5, 26.9, "WO *HAIWAAN*"), (27.0, 27.5, "EK *KADA*"), (27.5, 28.3, "PEHENTE THE YAHAN"),
 (28.45, 29.1, "USKO WO AISE"), (29.1, 29.75, "*PEECHE* KARTE THE"), (29.8, 30.35, "AUR AISE"), (30.35, 31.0, "*HAATH* RAKHTE THE"),
 (31.25, 31.5, "KUCH TOH"), (31.5, 32.0, "*RUHANI* TAAKATEIN"), (32.0, 32.8, "THI UNME"),
 (33.0, 34.0, "EK *THAPPAD* SE"), (34.0, 34.7, "*TEEN* MAATHE"), (34.7, 35.35, "*TAKRA* DETE THE"),
 (35.45, 36.05, "MAIN BILKUL"), (36.05, 36.75, "*MAZAAK* NAHI KAR RAHA"), (36.85, 37.55, "*TERE* BHI LAGA?"), (37.55, 38.3, "TERE *BHI* LAGA?"),
 (38.9, 39.6, "YE KAISA"), (39.6, 40.5, "*SUPERSONIC*"), (40.5, 41.6, "*THAPPAD* MAAR RAHA HAI"),
 (42.0, 42.5, "PHIR KISI"), (42.5, 42.75, "EK *BACCHE*"), (42.75, 43.0, "KE *SPIKES*"), (43.0, 43.25, "PAKAD KE"), (43.25, 43.75, "*KUTTON* KI TARAH"), (43.75, 44.6, "*NOCHNE* LAG JAATE"),
 (45.3, 45.95, "*GEL* LAGAOGE?"), (45.95, 46.6, "*GEL* LAGAOGE?"), (46.6, 47.25, "*SCHOOL* MEIN?"),
 (47.4, 48.0, "HUM *PEECHE*"), (48.0, 48.7, "LINE MEIN KHADE"), (49.4, 50.1, "YE TOH"), (50.1, 51.2, "*UKHAAD* HI DEGA!"),
 (51.5, 52.25, "AISE *JAANWAR*"), (52.25, 52.9, "SCHOOL MEIN"), (52.9, 53.5, "*KHULA* CHHOD DETE HAIN?"), (53.7, 55.0, "*CHHOTE-CHHOTE* BACCHE"),
 (57.3, 58.0, "DEKH,"), (58.0, 59.2, "YAHAN SE *GANJA* HO GAYA!"),
]
beats = []
for i, (bid, st) in enumerate(BEATS):
    en = BEATS[i + 1][1] if i + 1 < len(BEATS) else DUR
    beats.append({"id": bid, "start": st, "end": en, "lines": [], "subs": [{"text": x, "t0": a, "t1": b, "who": "n"} for a, b, x in SUBS if st <= a < en]})
json.dump({"duration": DUR, "beats": beats}, open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("beats", len(beats), "captions", sum(len(b["subs"]) for b in beats))
