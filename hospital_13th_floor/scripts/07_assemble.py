#!/usr/bin/env python3
"""Step 7b/8 — Assemble rendered shots in timeline order and mux the stereo mix.

  exports/hospital_13th_floor_animatic_1080p24.mp4   1920x1080, 24 fps, H.264 + AAC 320k stereo
  exports/hospital_13th_floor_soundtrack.m4a         the mixed soundtrack on its own
"""
import argparse
import subprocess

from common import EDIT, EXPORTS, load_json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="hospital_13th_floor_animatic_1080p24")
    ap.add_argument("--crf", default="19")
    a = ap.parse_args()
    tl = load_json(EDIT / "timeline.json")
    lst = EDIT / "concat.txt"
    lst.write_text("".join(f"file 'rendered_shots/{s['id']}.mp4'\n" for s in tl["shots"]))
    EXPORTS.mkdir(exist_ok=True)
    video = EDIT / "picture_lock.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", str(video)], check=True)
    out = EXPORTS / f"{a.name}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(EDIT / "mix_stereo.wav"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", a.crf,
                    "-tune", "film", "-pix_fmt", "yuv420p", "-r", "24", "-c:a", "aac", "-b:a", "320k",
                    "-ac", "2", "-movflags", "+faststart", "-shortest",
                    "-metadata", "title=The Hospital's 13th Floor (animatic)", str(out)], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(EDIT / "mix_stereo.wav"), "-c:a", "aac", "-b:a", "256k",
                    str(EXPORTS / "hospital_13th_floor_soundtrack.m4a")], check=True)
    print("exported", out)


if __name__ == "__main__":
    main()
