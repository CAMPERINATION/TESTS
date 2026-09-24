# KDP service short — animated vertical video

Original 2D animation drawn and animated entirely in JavaScript (Canvas 2D), 1080×1920, synced to
`audio/voiceover.wav` (the script is in `script.txt`).

## Watch / preview

```bash
npx http-server -c-1 -p 8080 .    # any static server works
# open http://localhost:8080/  → Play, scrub, or "Record WebM" for a quick real-time export
```

## Render the MP4 (frame-exact, H.264 + AAC)

```bash
npm install                      # playwright + ffmpeg-static
npx playwright install chromium  # once
npm run render                   # → out/kdp-service-short.mp4
node tools/render.mjs --from 60 --to 75 --out out/clip.mp4   # a range
node tools/render.mjs --stills 12,48.5,170                   # PNG stills for checking frames
```

`FFMPEG_PATH` / `CHROMIUM_PATH` override the binaries if needed.

## How the sync works

There's no speech-to-text model involved. `tools/align.py` does a rough forced alignment:

1. Detects pauses in the voiceover from its energy envelope.
2. Splits `script.txt` into phrases at punctuation.
3. Uses dynamic programming to match pauses to phrase boundaries so that each stretch of speech
   fits its syllable count, then spreads the words across each stretch.

The result is `src/timing.js`: a timestamp for every word. Each scene starts on its paragraph's
first words, and beats inside a scene are keyed to phrases (e.g. `c.at('page-by-page plan')`).
If you re-record the voiceover, edit `script.txt` to match what you actually say and run
`npm run align`. (A recording of a different length with the same script still roughly fits:
the timings are scaled.)

## Layout

| file | contents |
| --- | --- |
| `src/core.js` | easing, camera/parallax, pose interpolation, text/caption helpers |
| `src/characters.js` | the creator (plus palette variants for the fictional authors) and "Pip", the AI helper |
| `src/props.js` | coloring-book animal line art, activity props, page cards, room/desk sets, folder |
| `src/scenes1.js` | hook · experience · service idea · basic prompt · generic output |
| `src/scenes2.js` | the brief · plan + review · concept package · the value · the test · ending question |
| `src/timeline.js` | scene order, wipe transitions, phrase → time lookup |

Font: Fredoka (SIL Open Font License, `fonts/OFL.txt`).
