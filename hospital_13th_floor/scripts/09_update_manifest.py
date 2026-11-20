#!/usr/bin/env python3
"""Production manifest — scans the project and records the true status of every asset.

  production/manifest.json   machine-readable, per shot
  production/STATUS.md       human-readable summary + what is still needed
Status is derived from files on disk only (never assumed).
"""
from datetime import datetime, timezone

from common import ROOT, SCENES, CLIPS, EDIT, EXPORTS, PROD, load_yaml, load_json, save_json


def exists_any(base, exts):
    return next((p for p in (base.with_suffix(e) for e in exts) if p.exists()), None)


def main():
    shots = load_yaml("shots.yaml")["shots"]
    cues = load_yaml("voice_cues.yaml")["cues"]
    tl = {s["id"]: s for s in load_json(EDIT / "timeline.json", {"shots": []})["shots"]}
    entries = []
    for s in shots:
        sid = s["id"]
        gen = exists_any(SCENES / "generated" / sid, [".png", ".jpg", ".jpeg", ".webp"])
        clip = CLIPS / "generated" / f"{sid}.mp4"
        ph = SCENES / "placeholder" / f"{sid}.jpg"
        rendered = EDIT / "rendered_shots" / f"{sid}.mp4"
        t = tl.get(sid, {})
        voice = []
        for e in t.get("events", []):
            f = ROOT / e["file"]
            voice.append({"id": e["id"], "file": e["file"], "exists": f.exists(),
                          "placeholder": bool(e.get("placeholder"))})
        entries.append({
            "shot": sid, "chapter": s["ch"], "start": t.get("start"), "duration": t.get("duration"),
            "keyframe": "generated" if gen else ("placeholder" if ph.exists() else "missing"),
            "keyframe_file": str((gen or ph).relative_to(ROOT)) if (gen or ph.exists()) else None,
            "video": "generated" if clip.exists() else ("animatic" if rendered.exists() else "missing"),
            "rendered_shot": str(rendered.relative_to(ROOT)) if rendered.exists() else None,
            "prompts": f"prompts/shots/{sid}.json",
            "voice": voice,
            "sfx": [x[0] for x in s.get("sfx", [])],
        })
    count = lambda k, v: sum(1 for e in entries if e[k] == v)
    exports = sorted(str(p.relative_to(ROOT)) for p in EXPORTS.glob("*.mp4"))
    placeholders = sorted({c for c, v in cues.items() if v.get("placeholder")})
    verify = sorted(c for c, v in cues.items() if v.get("verify"))
    summary = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "shots": len(entries), "total_seconds": load_json(EDIT / "timeline.json", {}).get("total_seconds"),
        "keyframes_generated": count("keyframe", "generated"), "keyframes_placeholder": count("keyframe", "placeholder"),
        "clips_generated": count("video", "generated"), "clips_animatic": count("video", "animatic"),
        "dialogue_cues": len(cues), "tts_placeholder_cues": placeholders, "cues_to_verify_by_ear": verify,
        "mix": (EDIT / "mix_stereo.wav").exists(), "exports": exports,
    }
    save_json(PROD / "manifest.json", {"summary": summary, "shots": entries})

    md = ["# Production status", "", f"_Updated {summary['updated']} by `scripts/09_update_manifest.py` (derived from files on disk)._", "",
          "| Item | Status |", "|---|---|",
          f"| Shots in timeline | {summary['shots']} ({(summary['total_seconds'] or 0) / 60:.1f} min) |",
          f"| Keyframes — AI generated | {summary['keyframes_generated']} / {len(entries)} |",
          f"| Keyframes — procedural placeholder | {summary['keyframes_placeholder']} / {len(entries)} |",
          f"| Video clips — AI generated | {summary['clips_generated']} / {len(entries)} |",
          f"| Video clips — animatic render | {summary['clips_animatic']} / {len(entries)} |",
          f"| Dialogue cues cut from your recordings | {len(cues) - len(placeholders)} / {len(cues)} |",
          f"| Dialogue cues still TTS placeholders | {', '.join(placeholders) or 'none'} |",
          f"| Cues to verify by ear (auto-transcribed) | {', '.join(verify) or 'none'} |",
          f"| Stereo mix | {'done' if summary['mix'] else 'missing'} |",
          f"| Exports | {', '.join(exports) or 'none'} |", ""]
    (PROD / "STATUS.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(md))


if __name__ == "__main__":
    main()
