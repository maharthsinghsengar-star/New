# THE HOSPITAL'S 13TH FLOOR — production project

A psychological / supernatural horror anime short (~10:52, 16:9, 1920×1080, 24 fps, stereo), built as a
**modular, resumable pipeline**. Everything about the film lives in three editable files in `production/`.
The scripts in `scripts/` turn those files into a timed, mixed, rendered film.

> **Current state: a fully timed and mixed animatic, not the final anime picture.**
> This environment has no AI image, video or voice generation service, so nothing here claims to
> be AI-generated. The **sound is complete** (your voice recordings, procedural sound design and score,
> mixed to −16 LUFS). The **picture uses stand-in frames**: crops of your key art for character shots
> and procedurally drawn previs plates for locations and inserts, animated with the planned camera moves.
> Each stand-in is replaced automatically as soon as a real AI keyframe or clip is dropped in (see §4).

## 1. What is in the project

| Path | What it is | State |
|---|---|---|
| `production/shots.yaml` | **Master shot list** — 122 shots / 10 chapters: camera, action, emotion, dialogue, narration, SFX, ambience, music, keyframe recipe | ✅ written |
| `production/characters.yaml` | **Locked character bible** + style prompts + key-art reference crops | ✅ |
| `production/voice_cues.yaml` | Every dialogue line, cut from your recordings (source file, in/out, FX preset) | ✅ 46 lines from recordings, 3 TTS placeholders |
| `production/SHOT_BREAKDOWN.md` | Human-readable breakdown of every shot with timecodes and prompts | ✅ generated |
| `production/manifest.json`, `STATUS.md` | Per-shot asset status, derived from files on disk | ✅ generated |
| `prompts/shots/S###_image.txt / _video.txt / .json` | Ready-to-paste keyframe and image-to-video prompts, with reference images | ✅ 122 shots |
| `prompts/characters/*.txt` | Character-sheet prompts (generate these first for consistency) | ✅ |
| `characters/key_art_master.png`, `characters/refs/` | Your key art + per-character reference crops | ✅ |
| `voice/_source/` | Your 8 original recordings (renamed) | ✅ |
| `voice/<character>/` | Processed per-line dialogue WAVs; `voice/narrator/` = narration per shot | ✅ generated |
| `sound_effects/`, `sound_effects/ambience/` | 47 synthesized SFX + 9 ambience beds | ✅ generated |
| `music/` | 11 score cues rendered to exact on-screen length | ✅ generated |
| `editing/timeline.json`, `edl.csv` | Master timeline / edit decision list (frame-accurate) | ✅ |
| `editing/reference_dialogue.srt` | Dialogue reference track (not burned into the picture) | ✅ |
| `editing/stems/` | dialogue / sfx / ambience / music stems | ✅ generated |
| `editing/contact_sheet.jpg` | Every keyframe on one page | ✅ |
| `exports/hospital_13th_floor_animatic_1080p24.mp4` | The assembled film (animatic picture + final sound) | ✅ generated |
| `scene_images/generated/`, `video_clips/generated/` | **Empty — waiting for AI keyframes / clips** | ⏳ needs an external tool |

Large generated media (WAVs, rendered shots, placeholder plates) are git-ignored because every one of
them can be rebuilt with `scripts/run_all.sh` in about 25 minutes.

## 2. Rebuild everything

```bash
pip install numpy scipy pillow pyyaml      # plus ffmpeg and espeak-ng on the system
bash hospital_13th_floor/scripts/run_all.sh
```

Each step can be run on its own and most take `--only S017,S018` to redo single shots:

| Step | Script | Output |
|---|---|---|
| Prompts + breakdown | `00_export_prompts.py` | `prompts/`, `production/SHOT_BREAKDOWN.md` |
| Dialogue | `01_prepare_voices.py [--only J05]` | `voice/` |
| Sound library | `02_make_sound_library.py [--only low_hit]` | `sound_effects/` |
| Timeline / EDL | `03_build_timeline.py` | `editing/timeline.json`, `edl.csv`, `.srt` |
| Mix | `04_mix_audio.py` | `music/`, `editing/stems/`, `editing/mix_stereo.wav` |
| Placeholder keyframes | `05_make_keyframes.py [--only S043]` | `scene_images/placeholder/` |
| Shot render | `06_render_shots.py [--only S043] [--force]` | `editing/rendered_shots/` |
| Assemble + export | `07_assemble.py` | `exports/` |
| Plug in AI tools | `08_generate_ai_assets.py image|video --cmd "..."` | `scene_images/generated/`, `video_clips/generated/` |
| Manifest | `09_update_manifest.py` | `production/manifest.json`, `STATUS.md` |

Shot durations are driven by the audio: change a line or a pause in `shots.yaml`, re-run steps 03 → 07,
and picture and sound stay in sync (shot boundaries snap to whole frames).

## 3. How the sound was made

* **Voices** — your recordings were transcribed offline (pocketsphinx), split at pauses and matched line by
  line to the screenplay. Each character gets its own processing: Old Doctor slightly lower/slower with a
  dark hollow reverb; Little Girl slowed with a distant echo (and a circling, ghostly version for the
  elevator whisper); Patients layered three times at different pitches, delays and stereo positions;
  Phone voice band-limited with distortion and static; Nurse dry lobby room; John drier in the office and
  wetter on Floor 13.
* **Narration** — `voice/_source/narrator.mp3` covers the whole story; each shot plays the exact sentence
  range listed in `shots.yaml`.
* **SFX, ambience, score** — all synthesized in `scripts/soundgen.py` (elevator motor/doors/jolt/cable
  creaks, fluorescent buzz, phone ring, hospital bell, heartbeat, low hits, whispers made from the patients'
  recordings, music-box lullaby, sparse piano, drones, string clusters, chase ostinato…). Silence and slow
  ambience carry most of the tension; there is no jump scare every few seconds.
* **Mix** — dialogue on top, music ducked −9 dB and ambience −5 dB under speech, loudness-normalized to
  −16 LUFS / −1.5 dBTP (YouTube-friendly).
* To swap in recorded/licensed sounds: drop a WAV with the same name into `sound_effects/overrides/`,
  `sound_effects/overrides/ambience/` or `music/overrides/` and re-run `04_mix_audio.py`.

## 4. Turning the animatic into the anime film (external tools needed)

| Need | Why it isn't done here | Suggested tools | Where results go |
|---|---|---|---|
| Character sheets | no image model available | any model with reference/identity conditioning (e.g. Flux/SDXL + IP-Adapter or a character-reference feature) using `prompts/characters/*.txt` + `characters/refs/` | `characters/` |
| 122 keyframes (+12 second frames for crossfade shots) | no image model | same tool, `prompts/shots/S###_image.txt` + listed reference images | `scene_images/generated/S###.png` (`S###_b.png`) |
| Animated clips | no image-to-video model | any image-to-video model, `prompts/shots/S###_video.txt`, duration in the `.json` | `video_clips/generated/S###.mp4` |
| 3 missing lines (PA ×2, patients' chorus) | not in your recordings; espeak-ng stand-ins used | any TTS / voice actor, then replace `voice/pa/PA01.wav`, `PA02.wav`, `voice/patients/P06.wav` | same paths |

Hook any of those tools in without editing code:

```bash
cd hospital_13th_floor/scripts
python3 08_generate_ai_assets.py image --dry-run --only S001 \
  --cmd "my_image_tool --prompt-file {prompt_file} --negative-file {negative_file} --ref {ref} --out {out}"
python3 08_generate_ai_assets.py video \
  --cmd "my_i2v_tool --image {image} --prompt-file {video_prompt_file} --seconds {duration} --out {out}"
python3 06_render_shots.py --force && python3 07_assemble.py && python3 09_update_manifest.py
```

The generator only marks a shot done when the output file really exists (`production/generation_log.json`).
Generated stills still get the shot's camera move, flicker, grain and vignette; generated clips are
conformed to the exact shot length.

## 5. Script notes and deviations (please review)

* **Lines not in the recordings** and how they were covered:
  - Ch.1 caller asking for help on the 12th floor → the phone voice's *"Hello? Is there any doctor available?"*
    leaks from John's handset (it is the same voice that calls at the end, which sets up the twist).
  - Ch.2 whisper *"Doctor… you're finally here"* → the girl's *"Doctor…"*, processed as a circling ghost whisper.
  - Ch.3 woman's *"Doctor… please come here"* → a distant, pitched-down *"Doctor…"* from the nurse recording.
  - Ch.4 chorus *"You don't remember… but we remember you"* → **espeak-ng TTS placeholder** (P06), layered.
  - Ch.9/10 PA announcements → **espeak-ng TTS placeholders** (PA01, PA02) with PA processing.
  - Ch.10 nurse on the phone *"There is no thirteenth floor"* → her *"What thirteenth floor?"* (N05).
* Lines were transcribed automatically; cues marked `verify: true` in `voice_cues.yaml` (J04, J14, J15, J16,
  J21, P01, P02) should be checked by ear and their in/out points nudged if needed.
* Where the brief and the key art differ (John's shirt colour, the girl's red eyes and bangs, the old
  doctor's wild hair, the nurse's cap), the key art wins, as the brief asks. Noted in `characters.yaml`.
* Runtime is ~10:52 rather than exactly 10:00 because the supplied narration alone runs 7:10; trimming
  pauses is a one-line change (`defaults` in `shots.yaml`).
* On-screen text is limited to story props (elevator display, sign, file, register, CCTV overlay,
  THE END). No subtitles are burned in.
