# Star Shepherd

**A cozy-arcade HTML5 browser game created for GMT Jam #1 (Theme: *"From the heavens"*)**

## Story

As twilight settles over a quiet mountain village, the night sky begins to unravel. Stars, glowing wishes, and silver moonbeams slip loose from the heavens and drift downward toward the sleeping hills.

You play as **Nimbus**, a small sky-cloud determined to keep the constellations alive. Glide across the horizon, bounce falling starlight back up into its celestial patterns, and brave gathering storms to protect the world below.

## How to Play

- **Shepherd Falling Starlight:** Move your cloud beneath falling **Stars** (+100), **Shooting Wishes** (+200), and **Moonbeams** (+150) to bounce them upward into the unlit constellation sockets overhead.
- **Chain Combos:** Catch celestial light consecutively without letting stars fade into the ground to climb up to an **x8** score multiplier.
- **Complete Constellations:** Lighting every star in a constellation completes the wave, grants a constellation bonus, and shifts the sky through a full day-to-night-to-dawn cycle (*Golden Dusk → Rose Twilight → Velvet Midnight → Aurora Borealis → Tempest Eclipse → First Dawn*).
- **Survive Storm Hazards:**
  - **Heavy Meteors** fall toward the village and cost 1 life if they hit you or the ground. Shatter them by bouncing a rising star into them, using a **Cloud Gust**, or bashing them with a **Starlight Shield**.
  - **Storm Clouds** drift across the mid-sky, blocking rising stars and charging up lightning strikes.
  - **Lightning Bolts** flash a vertical warning lane before striking—glide out of the lane in time.
  - **Tempest Sovereign (Boss Wave):** Appears every 5th wave. Light all 8 storm seals to strike the Tempest Sovereign with starlight lances, banish the storm, and restore 1 lost life.
- **Collect Power-Ups:**
  - **Wide Cloud (`↔`):** Expands your cloud width for 10 seconds.
  - **Slow Time (`⏳`):** Slows falling stars and hazards for 7.5 seconds.
  - **Starlight Shield (`🛡`):** Absorbs one hazard impact and lets you smash meteors directly.

## Controls

| Action | Desktop | Mobile / Touch |
| --- | --- | --- |
| Move Cloud | Mouse pointer, `A` / `D`, or `←` / `→` | Drag anywhere on screen |
| Cloud Gust (updraft boost & meteor smash) | `Space` or Left Click | Tap the `GUST` button |
| Pause / Resume | `P` or `Esc` (or HUD button) | Tap the `⏸` HUD button |
| Mute / Unmute Audio | `M` (or HUD button) | Tap the `🔊` HUD button |

## Features

- 100% procedural HTML5 Canvas visuals (no external image assets; works completely offline)
- 100% procedural WebAudio synthesizer (pentatonic star chimes, constellation chords, wind gusts, thunder, and lightning—no external audio files)
- 7 hand-crafted constellations (*Corona Borealis, Ursa Minor, Cygnus, Orion, Tempest Draco, Lyra, Phoenix*)
- Smooth day-to-night-to-dawn sky progression with twinkling stars, aurora ribbons, moon/eclipse phases, and a sleeping mountain village
- Escalating waves, boss storm wave every 5th wave, 3 lives, combo multiplier up to x8, and persistent local high score & best wave
- Responsive layout supporting desktop and mobile browsers

## Running Locally

No build tools or dependencies are required.

1. **Direct open:** Open `index.html` in any modern web browser.
2. **Local static server (recommended):**
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

## itch.io Export

A ready-to-upload HTML5 build archive is included at:

```text
dist/gmt-jam-1-2026-html5.zip
```

It contains `index.html`, `style.css`, and `js/` at the archive root, ready for itch.io HTML5 embeds.

## Credits

- **Design, Programming, Procedural Art & WebAudio:** Zhiqiang Luan
