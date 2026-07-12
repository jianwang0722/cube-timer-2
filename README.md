# cube-timer

A lightweight, modern timer app for speedcubing.

## Features

- Hold-to-arm spacebar timing (touch works too), `performance.now()` accuracy,
  centisecond display
- WCA-compliant random-state 3x3 scrambles via [cubing.js](https://js.cubing.net),
  prefetched so there's zero wait between solves, with a 3D preview
- Optional 15s WCA inspection with 8s/12s warnings and automatic +2/DNF
- Sessions with localStorage persistence, JSON export/import
- WCA statistics: mo3, ao5, ao12, ao100 (trimmed means), personal bests
  with progression chart
- Dark/light themes, focus mode while solving, keyboard-first UI

In progress: a CFOP example-solve engine (cross / F2L / OLL / PLL) — see
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
