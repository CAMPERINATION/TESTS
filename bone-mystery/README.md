# The Case of the Vanishing Bone

A 45-second vertical (9:16, 1080×1920) animated mystery short, drawn entirely with Canvas 2D in
vanilla JavaScript. There are no images, fonts, audio files or libraries. The detective, the sets, the
lettering and every sound are generated in code.

## Run it

Open `index.html` in a browser, or serve the folder (recommended, some browsers restrict `file://`):

```bash
npx http-server -c-1 .     # or: python3 -m http.server
# → http://localhost:8080
```

Controls (bottom, fade in on hover): play/pause · restart · timeline (click to seek) · mute.
Keys: `Space` play/pause, `R` restart, `M` mute. Sound starts muted (browser autoplay rules). Tap 🔇 to hear it.

`sheet.html` shows the character turnaround (front / side / back / ¾ + expressions) used to check him
against the reference sheet.

Optional MP4 export: `npm i -D playwright && npx playwright install chromium`, have `ffmpeg` on PATH, then
`node tools/render.mjs` → `out/case-of-the-vanishing-bone.mp4` (frame-exact, with the soundtrack rendered
offline through the same Web Audio code).

## Files

| file | contents |
| --- | --- |
| `index.html`, `style.css` | page, canvas and the small control bar |
| `animation.js` | engine: `DEV_MODE`, timeline, camera, magnifying-glass lens pass, grain/paper post-FX, audio scheduling, UI |
| `js/core.js` | math/easing, deterministic noise, hand-drawn line system (line boil, variable-width ink, painterly texture), procedural textures, the brush-lettered alphabet |
| `js/dog.js` | the detective rig (`PROPORTIONS`, poses, head/ears/eyes/brows/muzzle/hat/coat/arms/paws/tail/glass, front/¾, side and back views, smear frames) |
| `js/props.js` | the office set, lamp and volumetric light, pedestal, bone, clues, suspects, evidence board, hallway, storeroom culprit, case file, the book cover redrawn in code, desk top |
| `js/scenes.js` | the seven scenes (the story), music sections |
| `js/audio.js` | Web Audio synthesis for every sound effect + the small score; offline WAV render |
| `sheet.html` | character turnaround / expression sheet |
| `tools/` | `render.mjs` (MP4 export), `stills.mjs` / `shot.mjs` (dev stills) |
