# SpeedCubeTimer

A lightweight, modern timer app for speedcubing.

## Features

- Hold-to-arm spacebar timing (touch works too), `performance.now()` accuracy,
  centisecond display
- WCA scrambles for 2×2, 3×3, 4×4, and 5×5 via [cubing.js](https://js.cubing.net)
  — random-state for 2×2/3×3/4×4, official random-moves for 5×5 — prefetched per
  event so there's no wait between solves, with a matching 3D preview
- Optional 15s WCA inspection with 8s/12s warnings and automatic +2/DNF
- Sessions (one WCA event each) with localStorage persistence, JSON export/import
- WCA statistics: mo3, ao5, ao12, ao100 (trimmed means), personal bests
  with progression chart
- Dark/light themes, focus mode while solving, keyboard-first UI
- A CFOP example-solve engine (cross / F2L / OLL / PLL), 3×3 only — see
  `docs/plan.md` and `docs/solver-architecture.md`.

## Development

```sh
npm install
npm run dev        # dev server
npm run test       # vitest
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # production build
```
