# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lopeprof-design/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lopeprof-design/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A web app that turns your photos and a caption into multi-panel cover art in the style of a sunset-soaked coastal poster — diagonal comic-book panels, a glowing sun disc, halftone texture, palm silhouette and bold neon-outlined lettering — and exports it as a PNG ready to post.

## What it does

- **Any photo:** load up to three photos from your machine, or try the two bundled samples. One photo can fill every panel, or each panel can hold a different one.
- **Crop and position each panel:** click a panel on the cover (or pick it in the sidebar) and set which photo it shows, its zoom, and its shift.
- **Three layouts:** Sunset Split, Triple Slice and Hero Stack — diagonal slices with paper gutters and neon rims.
- **Three colour grades:** Sunset, Neon Night and Palm Dusk.
- **Your words:** an editable caption and kicker line, with size and placement controls, drawn in heavy outlined capitals with a neon glow.
- **One-click export:** PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Everything runs offline in the browser from the static files under `app/` — photos are read on your own machine and never uploaded.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the editor's dark-violet chrome.
- `app/src/cover.js` — the cover renderer: panel layouts, sunset grade, halftone, palm silhouette and caption lettering, all drawn on canvas.
- `app/src/main.js` — wires the editor: photo slots, panel picking, look controls and export.
- `app/src/shots.js` — fixed scenes for reproducible screenshots (`?shot=cover`, `?shot=editor`, `?shot=export`).
- `app/samples/` — two sample photos made for make.fun with an image model, free to use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — the cover art and the editor, as the app itself drew them.

All art is original: no game logos, artwork or fonts are used — the lettering is drawn with system font stacks on canvas.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tghy00yw&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
