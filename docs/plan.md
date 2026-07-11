# CubeTimer — Implementation Plan

Phased build plan for the speedcubing timer. Work one phase at a time.
Start each phase in **plan mode**, review the proposed approach against this document and CLAUDE.md, then execute. Check off items as they're completed.

A phase is DONE only when all acceptance criteria pass and
`npm run typecheck`, `npm run lint`, and `npm run test` are green.

---

## Phase 0 — Project scaffold

- [x] Vite + React + TypeScript (strict mode) project
- [x] ESLint + Prettier configured; scripts: `dev`, `build`, `typecheck`, `lint`, `test`
- [x] Vitest + React Testing Library set up with one passing smoke test
- [x] Folder structure created per CLAUDE.md (`timer/`, `scramble/`, `solver/`, `stats/`, `components/`)
- [x] `cubing` package installed; confirm `randomScrambleForEvent("333")` runs in the browser (it uses a web worker — verify the Vite config handles it)
      **Acceptance criteria**
- `npm run dev` serves a blank app shell with no console errors
- A throwaway page can log a random-state 3x3 scramble to the console

---

## Phase 1 — Timer core

- [ ] Timer state machine: `idle → armed → (inspection) → ready → running → stopped`
- [ ] Spacebar hold-to-arm: holding ≥ 300 ms turns the display green (ready); release starts the timer; any key stops it
- [ ] Touch support: same semantics with press-and-hold anywhere on the timer area (mobile)
- [ ] Optional 15 s WCA inspection mode (toggle in settings)
  - [ ] Audible/visual warnings at 8 s and 12 s
  - [ ] Start between 15–17 s → +2 penalty; after 17 s → DNF
- [ ] All timing via `performance.now()`; display truncates to centiseconds
- [ ] Display formats: `9.58`, `59.99`, `1:00.42`, `12:34.56`
- [ ] Manual penalty controls on the last solve: OK / +2 / DNF, and delete solve
- [ ] Keyboard input is ignored while typing in inputs/settings
      **Acceptance criteria**
- Unit tests: state machine transitions, penalty application, display formatting edge cases (59.994 → `59.99`, not `1:00.00` — truncate, don't round)
- Holding space < 300 ms and releasing does NOT start the timer
- Timer keeps accurate time during tab repaints (rAF-driven display, `performance.now()` for truth)

---

## Phase 2 — Scrambles + 3D preview

- [ ] `src/scramble/` module wrapping `cubing/scramble`: `nextScramble(): Promise<Alg>`
- [ ] New scramble generated automatically after each solve; button + hotkey to re-scramble
- [ ] Scramble displayed as large, readable move text (WCA notation)
- [ ] `<twisty-player>` component (`src/components/TwistyViewer`) showing the scrambled state
  - [ ] React wrapper handles the web component lifecycle and prop updates
  - [ ] Hidden/collapsed option for users who consider it a distraction
- [ ] Scramble is pre-fetched in the background so there's zero wait after a solve
- [ ] Copy-scramble-to-clipboard button
      **Acceptance criteria**
- Scrambles are random-state (from `cubing/scramble`), never hand-rolled random moves
- The 3D preview always matches the displayed scramble text (test: apply scramble to a KPuzzle/model and compare state, not just trust the component)
- No UI jank while the scramble worker warms up on first load

---

## Phase 3 — Sessions & statistics

- [ ] Solve record: `{ id, timeMs, penalty: "OK" | "+2" | "DNF", scramble, date, sessionId }`
- [ ] Persistence in IndexedDB (localStorage fallback acceptable for v1 if simpler)
- [ ] Multiple named sessions; create / rename / delete / switch
- [ ] Stats per WCA rules (see CLAUDE.md):
  - [ ] single (best / worst / current)
  - [ ] mo3, ao5, ao12, ao100 — trimmed mean: drop best and worst, average the rest
  - [ ] DNF counts as worst; two DNFs in an ao5/ao12 window ⇒ average is DNF
  - [ ] +2 adds 2000 ms to the recorded time before any average math
- [ ] Solve list with per-solve detail view (time, scramble, date, penalty editing)
- [ ] Personal bests (single and each average) with subtle highlight on new PB
- [ ] Session export/import as JSON; export times as csTimer-compatible text (stretch)
- [ ] Time distribution / progression chart (simple line or histogram)
      **Acceptance criteria**
- Unit tests for every average rule above, including DNF and +2 interactions
- Refreshing the page loses nothing; 1,000+ solves in a session stays smooth

---

## Phase 4 — UI polish

- [ ] Implement the chosen visual design (reference: Claude Design mockups in `docs/design/`)
- [ ] Layout: timer digits dominate; scramble above; stats and solve list in side/bottom panels
- [ ] Dark theme default; light theme toggle; theme persisted
- [ ] Focus mode: hide everything but the timer while running
- [ ] Fully responsive: desktop, tablet, phone (touch timing already works from Phase 1)
- [ ] Settings panel: inspection on/off, hold duration, 3D preview on/off, theme, sound
- [ ] Accessibility pass: keyboard navigable settings, sufficient contrast, reduced-motion respect
      **Acceptance criteria**
- Lighthouse accessibility ≥ 90
- No layout shift when the timer starts/stops or a new scramble loads

---

## Phase 5 — CFOP example solve (the hard one)

> Build the verification harness FIRST. No solver code merges without it.

- [ ] **5.0 Verification harness**: apply `scramble + candidateSolution` to a cube
      model and assert the solved state. Runs in unit tests and as a runtime
      guard before any solution is shown to the user.
- [ ] **5.1 Cube model**: facelet/coordinate representation with move application
      (or reuse cubing.js's KPuzzle — prefer reuse; decide in plan mode)
- [ ] **5.2 Cross solver**: IDA\*/BFS search for white cross (≤ 8 moves), on any
      of a chosen cross color; annotate the moves as "Cross"
- [ ] **5.3 F2L**: detect the four corner/edge pairs, solve case-by-case using a
      standard F2L algorithm table; annotate each pair ("F2L pair 1..4")
- [ ] **5.4 OLL**: recognize the 57 OLL cases from the last-layer pattern; apply
      the standard algorithm; handle AUF (U-face pre-rotation) in recognition
- [ ] **5.5 PLL**: recognize the 21 PLL cases; apply algorithm + final AUF
- [ ] **5.6 Presentation**: step-by-step UI — each stage labeled, move counts
      shown, "play" button animates the solution on the twisty-player
- [ ] **5.7 Quality pass**: prefer shorter cross solutions; avoid rotations where
      trivially possible; total solution typically ~55–70 STM like a real CFOP solve
      **Acceptance criteria**
- Property test: 500 random scrambles → every generated solution passes the
  verification harness (state solved, no exceptions)
- Every OLL and PLL case is hit at least once in the test corpus
- Interim milestone (ships early, behind a label): "Computer solution" using a
  Kociemba two-phase solver as a placeholder while 5.2–5.5 are in progress

---

## Phase 6 — Stretch goals (only after 0–5)

- [ ] Solve replay / smart-cube (GAN bluetooth) input
- [ ] Additional events (2x2, 4x4) — scrambles come free from cubing.js; stats generalize
- [ ] Alternative example-solve methods (Roux) or multiple CFOP solutions per scramble
- [ ] Cloud sync

---

## Working agreements (apply to every phase)

- One phase per branch; small commits per logical change, not one giant commit
- Write/extend tests in the same commit as the logic they cover
- If a decision isn't specified here or in CLAUDE.md, propose options and wait
- Update this file: check boxes when done, add discovered tasks under the
  relevant phase rather than doing drive-by work
