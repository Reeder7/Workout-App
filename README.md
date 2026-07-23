# Iron Log — Workout Tracker

A mobile-first workout app: **design plans, log lifts, and track your progress**.
Dark, athletic UI inspired by the STNDRD layout, with training principles and
exercise selection notes drawn from Jeff Nippard's evidence-based content.

It's an installable **PWA** — open it in your phone's browser and "Add to Home
Screen" for an app-like experience that works offline. All your data is stored
**privately on your device** (no account, no server).

## Features

- **Plan builder** — build training splits with per-exercise sets, rep ranges,
  target RIR, and rest times. Reorder exercises, add days, and see a live
  **weekly volume readout** per muscle (with the ~10–20 sets/muscle guideline).
- **Templates** — start from proven splits: Full Body (3×), Upper/Lower (4×), or
  Push/Pull/Legs (6×), then customize freely.
- **Workout logger** — fast in-gym logging of weight / reps / RIR per set, a
  built-in **rest timer**, "last time" hints, and completed-set tracking.
- **Progress & stats** — estimated 1RM trend charts per lift, personal records,
  total volume, and weekly sets-by-muscle.
- **Exercise library** — ~40 exercises with coaching cues, plus a quick-reference
  card of core training principles. Add your own custom exercises too.
- **Backup** — export/import your data as JSON to move between devices.

## Tech

React + TypeScript + Vite, `zustand` for state (persisted to `localStorage`),
`vite-plugin-pwa` for the installable/offline shell. No backend.

## Run locally

```bash
npm install
npm run dev        # open the printed URL; to test on your phone, use the Network URL
```

To view on your phone while developing, make sure your phone is on the same
Wi-Fi and open the **Network** URL that `npm run dev` prints.

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Deploy (open it on your phone anywhere)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes
to **GitHub Pages** on every push to `main`.

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The site publishes at `https://<user>.github.io/<repo>/`.
3. Open that URL on your phone → browser menu → **Add to Home Screen**.

The build reads `BASE_PATH` so the app works under the `/<repo>/` subpath on
Pages; locally it defaults to `/`.

## Icons

App icons are pre-generated in `public/`. To regenerate them:

```bash
node scripts/gen-icons.mjs
```

## Notes

Training principles and exercise notes are inspired by Jeff Nippard's
evidence-based content. This is an independent personal project and is not
affiliated with or endorsed by him.
