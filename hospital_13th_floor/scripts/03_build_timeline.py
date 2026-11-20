#!/usr/bin/env python3
"""Step 7a — Master timeline / EDL.

Resolves every shot's duration from its audio events and writes:
  editing/timeline.json            machine-readable master timeline (used by mixer + renderer)
  editing/edl.csv                  edit decision list (open in any spreadsheet)
  editing/reference_dialogue.srt   dialogue/narration reference track (NOT burned into the video)
"""
from common import EDIT, PROD, VOICE, load_yaml, load_json, save_json


def fmt_tc(t, fps=24):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}:{int(round((s % 1) * fps)) % fps:02d}"


def fmt_srt(t):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"


NARR_TEXT = {}  # filled lazily from production/narration.yaml if present


def main():
    doc = load_yaml("shots.yaml")
    D = doc["defaults"]
    shots = doc["shots"]
    cues = load_yaml("voice_cues.yaml")["cues"]
    report = load_json(PROD / "voice_report.json", {})
    narr_text = (load_yaml("narration.yaml") or {}).get("lines", {}) if (PROD / "narration.yaml").exists() else {}

    t = 0.0
    out, srt = [], []
    problems = []
    amb, mus = "none", "none"
    for s in shots:
        head = s.get("head", D["head"])
        tail = s.get("tail", D["tail"])
        gap = s.get("gap", D["gap"])
        cur = head
        events = []
        narr_idx = 0
        n_narr = sum(1 for e in s.get("audio", []) if "narr" in e)
        prev_voice = False
        for e in s.get("audio", []):
            if "gap" in e:
                cur += e["gap"]
                prev_voice = False
                continue
            if prev_voice:
                cur += gap
            if "narr" in e:
                a, b = e["narr"]
                narr_idx += 1
                name = s["id"] if n_narr == 1 else f"{s['id']}_{narr_idx}"
                events.append({"type": "narration", "id": name, "file": f"voice/narrator/{name}.wav",
                               "start": round(cur, 3), "speech": round(b - a, 3), "src_in": a, "src_out": b,
                               "text": narr_text.get(name, "")})
                cur += b - a
            elif "cue" in e:
                cid = e["cue"]
                if cid not in cues:
                    problems.append(f"{s['id']}: unknown cue {cid}")
                    continue
                c = cues[cid]
                speech = report.get(cid, {}).get("speech_seconds") or (c.get("out", 0) - c.get("in", 0)) or 3.0
                events.append({"type": "dialogue", "id": cid, "char": c["char"],
                               "file": f"voice/{c['char']}/{cid}.wav", "start": round(cur, 3),
                               "speech": round(speech, 3), "text": c["text"],
                               "placeholder": bool(c.get("placeholder"))})
                cur += speech
            prev_voice = True
        dur = max(cur + tail, s.get("dur", D["dur"]))
        for sx in s.get("sfx", []):
            if sx[1] > dur:
                problems.append(f"{s['id']}: sfx {sx[0]} at {sx[1]}s is beyond shot end {dur:.2f}s")
        amb = s.get("amb", amb)
        mus = s.get("mus", mus) if "mus" in s else mus
        out.append({
            "id": s["id"], "chapter": s["ch"], "chapter_title": doc["chapters"][s["ch"]],
            "start": round(t, 3), "duration": round(dur, 3), "end": round(t + dur, 3),
            "frames": int(round(dur * 24)),
            "events": events,
            "sfx": [{"id": a, "at": b, "gain_db": g} for a, b, g in s.get("sfx", [])],
            "amb": s.get("amb"), "mus": s.get("mus"),
            "amb_active": amb, "mus_active": mus,
            "fade_in": s.get("fade_in", 0.0), "fade_out": s.get("fade_out", 0.0),
        })
        for ev in events:
            a = t + ev["start"]
            label = ev.get("char", "narrator").upper().replace("_", " ")
            srt.append((a, a + ev["speech"], f"[{label}] {ev['text'] or '(narration)'}"))
        t += dur

    # snap shot boundaries to whole frames so video and audio never drift
    acc = 0
    for o in out:
        o["start"] = round(acc / 24, 4)
        o["duration"] = round(o["frames"] / 24, 4)
        o["end"] = round((acc + o["frames"]) / 24, 4)
        acc += o["frames"]
    total = acc / 24

    save_json(EDIT / "timeline.json", {"fps": 24, "width": 1920, "height": 1080,
                                       "total_seconds": round(total, 3), "shots": out})
    with open(EDIT / "edl.csv", "w", encoding="utf-8") as f:
        f.write("shot,chapter,record_in,record_out,duration_s,frames,amb,music,audio_events,sfx\n")
        for o in out:
            ev = " | ".join(f"{e['id']}@{e['start']}" for e in o["events"])
            sx = " | ".join(f"{x['id']}@{x['at']}" for x in o["sfx"])
            f.write(f"{o['id']},{o['chapter']},{fmt_tc(o['start'])},{fmt_tc(o['end'])},{o['duration']},"
                    f"{o['frames']},{o['amb_active']},{o['mus_active']},\"{ev}\",\"{sx}\"\n")
    with open(EDIT / "reference_dialogue.srt", "w", encoding="utf-8") as f:
        for i, (a, b, txt) in enumerate(srt, 1):
            f.write(f"{i}\n{fmt_srt(a)} --> {fmt_srt(b)}\n{txt}\n\n")

    chap = {}
    for o in out:
        chap.setdefault(o["chapter"], [o["start"], o["end"]])[1] = o["end"]
    print(f"{len(out)} shots, total {int(total // 60)}:{total % 60:04.1f}")
    for c, (a, b) in chap.items():
        print(f"  ch{c:>2} {doc['chapters'][c]:<20} {fmt_tc(a)} - {fmt_tc(b)}  ({b - a:5.1f}s)")
    for p in problems:
        print("WARNING:", p)


if __name__ == "__main__":
    main()
