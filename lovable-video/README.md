# Bakery prompt short: animated vertical video with the real Lovable recording

A 9:16 short (1080×1920, 30 fps, ~97 s). Original 2D animation drawn in JavaScript (Canvas 2D) frames
the **real** Lovable screen recording and is timed to the voiceover.

## Sources
| file | what it is |
| --- | --- |
| `media/voiceover_raw.wav` | the supplied voiceover |
| `media/voiceover.wav` | the same recording with long pauses shortened (`tools/tighten_vo.py`: >1.2 s → 0.65 s, 0.55–1.2 s → 0.45 s; no words cut) |
| `media/screen.m4v` | the supplied Lovable screen recording |
| `clips.json` | the exact source moments used from the recording |
| `script.txt` | the narration, used for captions and word timing |

Real footage used (source times): the real prompt + Lovable's generated plan (1:00), the build (1:55–5:38, shown sped up and labelled that way),
the "Marzipan & Thread" homepage (5:39–5:52, 6:44–6:49), the "Request a custom cake" form (6:19–6:24), and the
Inquiries dashboard with its sample requests (6:34–6:44). Two moments were skipped on purpose: 6:16–6:18
(the browser's autofill popups show personal info) and 6:26–6:33 (validation errors from submitting the empty form).
The illustrated field panel in the form scene is labelled as an illustration, and the mobile step shows an empty
phone outline marked "Not tested yet".

## Build
```bash
npm install && npx playwright install chromium        # playwright + ffmpeg-static
python3 tools/tighten_vo.py media/voiceover_raw.wav media/voiceover.wav
python3 tools/asr_align.py media/voiceover.wav script.txt src/timing.js   # word timings for captions/beats
python3 tools/extract_frames.py                                        # real footage → frames/
npm run render                                                         # → out/bakery-prompt-short.mp4
node tools/render.mjs --stills 3,20,45    # PNG stills for checking frames
```
Preview in a browser with `npx http-server -c-1 .` → `index.html` (play/scrub, with the voiceover).
The Python tools need `numpy` and `pocketsphinx` (`pip install numpy pocketsphinx`).

### Caption timing
`tools/asr_align.py` runs offline speech recognition (pocketsphinx's bundled English model) over the voiceover,
then matches the recognised words to `script.txt` with a similarity-scored alignment, so captions use the script's
exact wording but the audio's real word timings. Every scene beat is keyed to phrases, so it follows too.

## Sound
`tools/mix.py` builds the soundtrack: the voiceover up front, an original music bed synthesized in code (warm
F-major chords, ducked under speech) and soft synthesized SFX for message bubbles, cards and transitions.
The render step then normalizes the result to −14 LUFS.

## Code
| file | contents |
| --- | --- |
| `src/scenes.js` | the nine scenes (opening question → build → page → tension → form → dashboard → lesson → honest ending → takeaway) |
| `src/footage.js` | loads real recording frames, crops/frames them, draws callouts (outlines only, never over text) |
| `src/captions.js` | word-synced captions from the script, with key phrases highlighted |
| `src/timeline.js` | scene order keyed to phrases, transitions, SFX cue list |
| `src/characters.js`, `src/core.js`, `src/props.js` | character rig (the baker), easing/camera helpers, drawing helpers |

Font: Fredoka (SIL OFL, `fonts/OFL.txt`).
