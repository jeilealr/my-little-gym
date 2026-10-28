# Phase 3.1 release notes

**October 28, 2026 — image coverage + useful training history**

## Image coverage
- 42 built-in exercise IDs now explicitly map to verified free-tier publisher image filenames, rather than relying on inconsistent title/ID matching.
- User screenshot fix: neutral-grip lat pulldown now uses the V-bar lat pulldown image; single-arm dumbbell row now uses the publisher's `single-arm-db-row`.
- Visible images are refreshed when image lookup completes. The app can show an explicit list of missing images and accept an uploaded picture for an existing exercise.
- A photograph is mandatory for new custom exercises.
- Four exercises use related-variation source images, with visible warnings: low-to-high cable fly, rope triceps pushdown, lying leg curl, machine lateral raise.
- Caveat: this is not a guarantee of successful offline loading on a specific phone. Use Settings > Find illustrations > Download illustrations, then test in airplane mode.

## History
- Completed workouts are displayed in the History tab with body-part filters.
- Six-month completed-workout chart in the main History view.
- A separate 12-month trend view with number of workouts and completed sets per month.
- Individual exercise progression chart with date filters (1M, 3M, 6M, 1Y, All), best logged weight or best repetitions, and list of the actual sets.
- Results come only from completed workout snapshots; no sample entries go into users' real databases.

## Compatibility / tests
- No database schema migration required (still version 3).
- Existing history remains unchanged after routine edits.
- Tests: Python seed validation, Node domain tests, Node history/media mapping tests, UI smoke test, static screenshots at 390 px width.
- Real iPhone Safari and offline-image QA still to do.
