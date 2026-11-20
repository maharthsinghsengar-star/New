#!/usr/bin/env python3
"""Generation hook — plug ANY image / image-to-video / TTS tool into the pipeline.

No AI generation API is configured in this environment, so this script does not call a vendor
directly. Instead you give it a command template for whatever tool you use (a vendor CLI, a curl
script, ComfyUI API wrapper, a local Python script...). It runs the template once per shot that is
still missing that asset, checks the output file really exists, and records the result in
production/manifest.json. It never marks anything as generated unless the file appears.

Template placeholders
  {shot} {prompt_file} {negative_file} {video_prompt_file} {json} {ref} {refs} {image} {out} {duration}

Examples
  # keyframes with your own wrapper script
  python3 08_generate_ai_assets.py image --cmd "python3 ~/mytools/gen_image.py --prompt-file {prompt_file} \
      --negative-file {negative_file} --ref {ref} --size 1920x1080 --out {out}"
  # image-to-video from the keyframes
  python3 08_generate_ai_assets.py video --cmd "my-i2v --image {image} --prompt-file {video_prompt_file} \
      --seconds {duration} --out {out}"
  # see what would run
  python3 08_generate_ai_assets.py image --cmd "..." --dry-run --only S001,S002
Templates can also come from env vars IMAGE_GEN_CMD / VIDEO_GEN_CMD.
After generating, re-run:  06_render_shots.py --force --only <shots>  and  07_assemble.py
"""
import argparse
import os
import shlex
import subprocess
import time

from common import ROOT, PROMPTS, SCENES, CLIPS, EDIT, PROD, load_yaml, load_json, save_json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["image", "video"])
    ap.add_argument("--cmd")
    ap.add_argument("--only")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--overwrite", action="store_true")
    a = ap.parse_args()
    tmpl = a.cmd or os.environ.get("IMAGE_GEN_CMD" if a.kind == "image" else "VIDEO_GEN_CMD")
    if not tmpl:
        raise SystemExit("No generator configured. Pass --cmd or set IMAGE_GEN_CMD / VIDEO_GEN_CMD "
                         "(see the docstring). Nothing was generated.")
    shots = load_yaml("shots.yaml")["shots"]
    tl = {s["id"]: s for s in load_json(EDIT / "timeline.json")["shots"]}
    log = load_json(PROD / "generation_log.json", [])
    only = set(a.only.split(",")) if a.only else None
    for s in shots:
        sid = s["id"]
        if only and sid not in only:
            continue
        pj = PROMPTS / "shots" / f"{sid}.json"
        p = load_json(pj)
        jobs = []
        if a.kind == "image":
            jobs.append((SCENES / "generated" / f"{sid}.png", PROMPTS / "shots" / f"{sid}_image.txt"))
            if "kf2" in s:
                jobs.append((SCENES / "generated" / f"{sid}_b.png", PROMPTS / "shots" / f"{sid}_image.txt"))
        else:
            img = next((SCENES / "generated" / f"{sid}{e}" for e in (".png", ".jpg")
                        if (SCENES / "generated" / f"{sid}{e}").exists()), None)
            if img is None:
                print(f"{sid}: skipped (no generated keyframe yet)")
                continue
            jobs.append((CLIPS / "generated" / f"{sid}.mp4", PROMPTS / "shots" / f"{sid}_video.txt"))
        for out, prompt_file in jobs:
            if out.exists() and not a.overwrite:
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            neg = PROMPTS / "shots" / "_negative.txt"
            neg.write_text(p["negative_prompt"] + "\n")
            refs = [str(ROOT / r) for r in p["reference_images"]]
            image = SCENES / "generated" / f"{sid}.png"
            cmd = tmpl.format(shot=sid, prompt_file=shlex.quote(str(prompt_file)), negative_file=shlex.quote(str(neg)),
                              video_prompt_file=shlex.quote(str(PROMPTS / "shots" / f"{sid}_video.txt")),
                              json=shlex.quote(str(pj)), ref=shlex.quote(refs[0]) if refs else "''",
                              refs=" ".join(shlex.quote(r) for r in refs), image=shlex.quote(str(image)),
                              out=shlex.quote(str(out)), duration=f"{tl[sid]['duration']:.2f}")
            if a.dry_run:
                print(cmd)
                continue
            t0 = time.time()
            r = subprocess.run(cmd, shell=True)
            ok = r.returncode == 0 and out.exists() and out.stat().st_size > 0
            log.append({"shot": sid, "kind": a.kind, "out": str(out.relative_to(ROOT)), "ok": ok,
                        "returncode": r.returncode, "seconds": round(time.time() - t0, 1), "cmd": cmd})
            print(f"{sid}: {'OK' if ok else 'FAILED'} -> {out.relative_to(ROOT)}")
            save_json(PROD / "generation_log.json", log)
    if not a.dry_run:
        subprocess.run(["python3", str(ROOT / "scripts" / "09_update_manifest.py")])


if __name__ == "__main__":
    main()
