# Phase 3 — implementation handoff and release notes

**Built:** 28 October 2026 · **Version:** 0.1 beta · **Platform:** static iPhone PWA

## Delivered

- Three-tab app: Workout, Routines and History.
- First-run library of four training categories, 20 templates and 42 exercises. No routines are automatically activated.
- Routine browsing, activate/switch/deactivate, choice of start date and duration (2/4/6/8/custom weeks or indefinite), independent by category.
- Editable routine templates, exercise order, prescribed sets/reps, create/duplicate/delete, custom categories and exercises (with optional personal image).
- In-progress workout saved in IndexedDB; per-set weight/reps/check, add set, optional rest timer, skip/swap an unlogged exercise, resume and finish.
- History snapshots independent of future template changes; last exercise sets and basic progress chart.
- JSON backup export/import with explicit replace confirmation; no accounts or external workout data storage.
- Offline app shell and opt-in downloaded exercise illustrations with visible third-party attribution.
- Free GitHub Pages deployment instructions and a matching Home Screen app icon.

## Requested change incorporated

**Legs A:** Leg press 3×8–12, hip thrust / glute drive 3×8–12, dumbbell Romanian deadlift 3×8–10, seated leg curl (optional) 2×10–15.

**Legs B–E:** Also emphasize glutes, quadriceps and hamstrings. Calf raises remain in the searchable exercise library but are absent from the five initial leg routines.

**Training schedule:** No fixed 4-days/week or 45-minute constraint. Durations displayed are estimates only.

## Tests and boundaries

- `python3 tests/validate.py` (seed integrity) — PASS.
- `node --test tests/domain.test.mjs` — PASS (six tests).
- `node tests/ui-smoke.mjs` — PASS (activation, editing, logging, history, new routine/category).
- `node --check app/app.js` — PASS.
- No actual iPhone test, no live public deployment, and no browser screenshot QA: enterprise Chromium policy blocks local websites in the execution environment.
- Some RepDB images may not map exactly. Do not silently show anatomically inaccurate exercise pictures.
- Next release should be based on actual iPhone usage feedback and image-match review.
