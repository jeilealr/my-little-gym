# Version 0.2 — Shared routines without shared personal data

**Date:** 28 October 2026

## Release contents

- 15 categories, each with five distinct A–E routines (75 total), around four exercises per routine.
- 102 curated exercise definitions. New groups include core, mobility, bodyweight strength, lower body/glutes, conditioning and functional balance.
- Better illustration semantics; see `ILLUSTRATION_AUDIT.md` for reviewed corrections.
- Seconds-based logging for stretches, holds and cardio, versus weight/repetitions for strength.
- Shared catalog v2, with a v1 baseline fingerprint manifest from the original release.
- Local routine-only export/import that never includes a completed workout, selected training dates or personal preferences.

## Migration and conflict behavior

- Legacy local state is loaded first, including complete workout records, active plans and user-created items.
- Shared entries from the original catalog have their original signatures in `data/catalog-v1-fingerprints.json`.
- Previously deleted shared routines stay deleted; locally created categories remain local.
- New official category IDs and exercise IDs are appended. If a local category has the same display name, the catalog's routines use its local category ID to avoid duplicates.
- If a shared exercise or routine has changed and its local copy is unchanged, the new shared version can be applied; active or locally edited routines are preserved and can receive a separate copy if updated.
- Repeated pulls should not create duplicates; network failures leave the local data available.
- Existing workout sessions are snapshots, independent of subsequent routine edits or catalog revisions.

## Sharing

1. Select routine → **Share this routine (no workout data)**.
2. Use iOS native Share with an exported JSON file, or save the JSON file and send it manually.
3. On the other iPhone, Settings → **Choose routine file** → select file → confirm.
4. Imported categories and required exercises are added where missing, and the routine gets a new local ID; nothing in the current person's History is replaced.

## Known limitations and notes

- The app is fully local; it does not automatically sync your and your girlfriend's data or make new phone data available from GitHub.
- A full backup import still replaces current device data; **never import one user's full backup into another user's installation to share a routine**.
- No native cloud server or authentication: personal data stays within the device's browser-managed storage, but can be lost if website data is cleared.
- Images come from the source publisher (under their free tier) and can fail to load until online; cache them while online for offline use. If a legacy custom exercise has conflicting movement or equipment information, its new illustration is withheld rather than showing a misleading image.
- The original internal IDs `low_to_high_cable_fly` and `rope_triceps_pressdown` are retained for compatibility, but their new public name and instructions reflect accurate illustrated movements (incline dumbbell fly and straight-bar cable triceps pushdown). Older workout snapshots still retain their original exercise names and logged values. An exercise's progress chart groups records by internal exercise ID, so comparisons across these renamed variants require care.
- Exercise names, equipment and illustrations were semantically audited, with targeted visual verification of ambiguous image pairs. Goblet squat specifies a kettlebell, seated/standing calf raises specify calf machines, and dumbbell sumo squat logs an actual external weight. A full manual visual review of every individual source pose and an on-device iPhone loading test are not claimed.
- Individual Thomaskirche machine models have not been verified; choose a suitable alternative when required.

## Validation commands

```bash
python3 tests/validate.py
node --test tests/*.test.mjs
node tests/ui-smoke.mjs
```
