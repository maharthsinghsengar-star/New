#!/usr/bin/env python3
"""Steps 1-2 — Build generation prompts and the human-readable shot breakdown.

  prompts/shots/<SHOT>.json        image prompt, negative prompt, video prompt, reference images
  prompts/shots/<SHOT>_image.txt   plain-text image prompt (paste into any image model)
  prompts/shots/<SHOT>_video.txt   plain-text image-to-video prompt
  prompts/characters/<char>.txt    locked character sheet prompts (generate turnarounds first)
  production/SHOT_BREAKDOWN.md     every shot with timing, camera, action, dialogue, sound, prompts

Prompts are composed from production/characters.yaml (style + locked character descriptions) and
production/shots.yaml, so a character tweak propagates to every prompt.
"""
from common import PROMPTS, PROD, EDIT, load_yaml, load_json, save_json


def tc(t):
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:05.2f}"


def main():
    chars = load_yaml("characters.yaml")
    style, cdefs = chars["style"], chars["characters"]
    doc = load_yaml("shots.yaml")
    cues = load_yaml("voice_cues.yaml")["cues"]
    tl = {s["id"]: s for s in (load_json(EDIT / "timeline.json", {"shots": []})["shots"])}
    (PROMPTS / "shots").mkdir(parents=True, exist_ok=True)
    (PROMPTS / "characters").mkdir(parents=True, exist_ok=True)

    for k, c in cdefs.items():
        if "lock" not in c:
            continue
        txt = (f"{style['positive']}, character reference sheet, full body front view, three-quarter view, "
               f"side view and facial close-up on a neutral dark grey background, consistent design, {c['lock']}")
        (PROMPTS / "characters" / f"{k}.txt").write_text(
            f"{txt}\n\nNEGATIVE: {style['negative']}\nREFERENCE IMAGES: "
            + ", ".join(f"characters/refs/{r}.png" for r in c.get("ref_crops", [])) + "\n", encoding="utf-8")

    md = ["# The Hospital's 13th Floor — Shot Breakdown", "",
          "Generated from `production/shots.yaml` by `scripts/00_export_prompts.py`. Timecodes come from "
          "`editing/timeline.json` (run `03_build_timeline.py` first).", ""]
    cur_ch = None
    for s in doc["shots"]:
        sid = s["id"]
        locks = [cdefs[c]["lock"] for c in s.get("chars", []) if c in cdefs and "lock" in cdefs[c]]
        image = ", ".join([style["positive"], s["desc"].strip(), *locks, f"camera: {s['cam']}", f"mood: {s['emo']}"])
        t = tl.get(sid, {})
        dur = t.get("duration", s.get("dur", 0))
        video = (f"{s['cam']}. {s['anim']}. Keep character design, face and outfit identical to the reference "
                 f"frame. Subtle natural motion, slow cinematic pacing, no cuts, {dur:.1f} seconds, 24 fps, 16:9.")
        refs = [f"characters/refs/{r}.png" for c in s.get("chars", []) for r in cdefs.get(c, {}).get("ref_crops", [])[:2]]
        save_json(PROMPTS / "shots" / f"{sid}.json", {
            "shot": sid, "chapter": s["ch"], "duration": dur, "image_prompt": image,
            "negative_prompt": style["negative"], "video_prompt": video, "reference_images": refs,
            "aspect_ratio": "16:9", "output_keyframe": f"scene_images/generated/{sid}.png",
            "output_keyframe_b": f"scene_images/generated/{sid}_b.png" if "kf2" in s else None,
            "output_clip": f"video_clips/generated/{sid}.mp4"})
        (PROMPTS / "shots" / f"{sid}_image.txt").write_text(image + "\n", encoding="utf-8")
        (PROMPTS / "shots" / f"{sid}_video.txt").write_text(video + "\n", encoding="utf-8")

        if s["ch"] != cur_ch:
            cur_ch = s["ch"]
            md += ["", f"## Chapter {cur_ch} — {doc['chapters'][cur_ch]}", ""]
        lines = []
        for e in t.get("events", []):
            if e["type"] == "dialogue":
                flag = " *(TTS placeholder)*" if e.get("placeholder") else ""
                lines.append(f"  - **{e['char'].replace('_', ' ').title()}** ({e['id']}, +{e['start']:.1f}s): “{e['text']}”{flag}")
            else:
                txt = f": “{e['text']}”" if e.get("text") else ""
                lines.append(f"  - *Narrator* ({e['id']}, +{e['start']:.1f}s, narrator.mp3 {e['src_in']:.2f}–{e['src_out']:.2f}){txt}")
        sfx = ", ".join(f"{a} @{b}s ({g} dB)" for a, b, g in s.get("sfx", [])) or "—"
        md += [f"### {sid} · {tc(t.get('start', 0))} – {tc(t.get('end', 0))} · {dur:.1f}s",
               f"- **Location:** {s['loc']}  ",
               f"- **Characters:** {', '.join(s.get('chars', [])) or '—'}  ",
               f"- **Camera:** {s['cam']}  ",
               f"- **Action:** {s['act']}  ",
               f"- **Emotion:** {s['emo']}  ",
               "- **Dialogue / narration:**" + ("" if lines else " —"), *lines,
               f"- **Sound effects:** {sfx}  ",
               f"- **Ambience:** {t.get('amb_active', '—')} · **Music:** {t.get('mus_active', '—')}  ",
               f"- **Image prompt:** `prompts/shots/{sid}_image.txt` · **Video prompt:** {video}", ""]
    (PROD / "SHOT_BREAKDOWN.md").write_text("\n".join(md), encoding="utf-8")
    print(f"prompts for {len(doc['shots'])} shots -> {PROMPTS}/shots ; breakdown -> production/SHOT_BREAKDOWN.md")


if __name__ == "__main__":
    main()
