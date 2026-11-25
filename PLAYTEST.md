# Playtest Notes — Star Shepherd

## Environment & Method

- **Browser:** Google Chrome (Desktop `1280x800` and Mobile `390x844`, 2x DPR)
- **Serving Mode:** Local static HTTP server (`python3 -m http.server 8765`) serving `index.html` at the repository root
- **Checks Performed:** End-to-end interactive playthrough across Title Screen, How to Play, Audio Mute toggle, active Wave 1 gameplay, keyboard and pointer controls, Pause/Resume, Wave 5 Boss (Tempest Sovereign) and power-ups, Game Over, persistent local high score across page reload, Restart, Mobile responsive layout, and console/runtime error monitoring.

## Test Results

| Area | What Was Tested | Result |
| --- | --- | --- |
| Title Screen | Initial load, animated sky canvas, title panel, high score & best wave display | Pass |
| How to Play & Mute | Opening/closing How to Play modal; toggling Sound On/Off | Pass |
| Core Gameplay | Catching falling stars, wishes, and moonbeams; bouncing into Corona Borealis constellation nodes; score & combo multiplier updates (`score: 700`, `combo: 3`, `3/5` nodes lit) | Pass |
| Controls | Pointer tracking, keyboard movement (`ArrowLeft` / `ArrowRight`), Cloud Gust (`Space` / click) | Pass |
| Pause & Resume | Triggering pause via `P`, verifying Pause overlay & frozen state, resuming cleanly via Resume button | Pass |
| Boss Wave & Power-Ups | Wave 5 (*Tempest Draco* / *Tempest Eclipse*), Tempest Sovereign boss bar (`8/8` → `6/8` on starlight lances), Wide Cloud, Slow Time, Starlight Shield, and Meteor Gust Smash | Pass |
| Game Over & Restart | Reducing lives to 0, verifying Game Over summary & New High Score badge, clicking Play Again and confirming full reset (`lives: 3`, `score: 0`, `wave: 1`) | Pass |
| Local High Score Persistence | Reloading the page and confirming `localStorage` persisted `HIGH SCORE: 700` and `BEST WAVE: 5` on the Title Screen | Pass |
| Mobile Responsiveness | `390x844` portrait viewport check: single-row HUD, centered wave banner, zero horizontal overflow (`scrollWidth <= innerWidth`) | Pass |
| Console & Runtime Errors | Monitored browser console errors, log errors, and uncaught exceptions across full session | Pass (0 errors, 0 exceptions) |

## Issues Found & Fixed During Playtesting

1. **Missing favicon 404 in browser console:** Initial load logged a 404 for `/favicon.ico`. Added an inline SVG data-URI favicon in `index.html`, reducing console errors to `0`.
2. **Cross-platform icon rendering:** Replaced Unicode emoji glyphs in HUD buttons, lives, power-up chips, and canvas icons with inline SVGs and procedural canvas vector shapes so icons render sharply on every OS without relying on system emoji fonts.
3. **Boss cloud silhouette & banner placement:** Switched the Tempest Sovereign cloud outline to a two-pass rim + fill draw to eliminate internal circle seams, and lowered the wave banner slightly so it does not overlap the boss.
4. **Mobile HUD wrapping:** Tightened mobile HUD spacing and disabled wrapping on `.hud-right` so lives, mute, and pause stay cleanly on one row at `390px` width.
5. **Opening pacing:** Shortened the initial Wave 1 star spawn delay from `0.65s` to `0.25s` so the first falling star arrives promptly after pressing Play.
