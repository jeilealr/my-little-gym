# My Little Gym — Version 0.2

**Release:** 28 October 2026 · **Target:** iPhone Safari / Home Screen PWA · **Repository:** https://github.com/jeilealr/my-little-gym

My Little Gym is a free, pastel-colored, private gym notebook. It has no accounts, analytics, subscription, or shared workout database. Each phone owns its own workout history and customization. The published GitHub repository supplies only the app and shared **starter catalog**. There is **no upload/push from the app to GitHub**.

## What's new in v0.2

- **Pull-only library updates:** Settings → **Check for new shared routines**. The app also checks for updates at launch when online. Catalog updates add new categories, exercises and routines. Unmodified shared items may be refreshed, but **local edits, deleted routines, active training periods, and completed workout logs are protected**. Changed shared routines you personalized are offered as a separate optional copy.
- **75 routines:** Five variants (A–E) for each of **15 categories** (previously 20 routines across 4 categories). The 11 new categories are Full Body, Upper Body, Lower Body, Abs & Core, Stretching & Mobility, Bodyweight / No Equipment, Push, Pull, Glutes, Cardio & Conditioning, and Functional Strength & Balance.
- **102 exercises:** Including 60 new movements. Each starter exercise maps to a specific RepDB free-tier illustration ID; ambiguous equipment/attachment definitions were reviewed and updated to match those illustrations. See `docs/ILLUSTRATION_AUDIT.md`.
- **Duration-based workouts:** Stretching, holds, and cardio can be logged in seconds (not as fake repetitions). Strength exercises continue to record weights and repetitions.
- **Share one routine:** Open a routine → **Share this routine**. Export/share a routine-only JSON file containing its category and required exercise definitions, but **no history, weights, active plans, or personal settings**. On the other iPhone: Settings → **Choose routine file**. Import only **adds** a routine; it does not replace the recipient's workouts.
- **Offline and privacy:** Workout data stays in IndexedDB on each phone. Images can be cached separately for offline use. The PWA does not sync between devices and never posts personal data to GitHub.

## Categories (5 templates each)

| Strength splits | Flexible training | Focus and recovery | Other |
|---|---|---|---|
| Chest | Full Body | Abs & Core | Cardio & Conditioning |
| Legs (glute-prioritized) | Upper Body | Glutes | Functional Strength & Balance |
| Back | Lower Body | Stretching & Mobility | |
| Arms & Shoulders | Bodyweight / No Equipment | | |
| Push | | | |
| Pull | | | |

The categories are choices, not a mandatory schedule. You can train any number of days per week, change a selected routine when you wish, or run an individual routine just once.

## Upgrade the existing GitHub Pages app

**Back up your data on each iPhone before deploying.** In the currently installed app: gear → **Export my data** → save the resulting `.json` securely in Files/iCloud Drive. These private backups must **not** go in your public repository.

1. Download the `my_little_gym_v0_2.zip` package from ChatGPT, and unzip it **outside** the Git working tree.
2. Copy the contents of the unpacked `my_little_gym_v0_2/` folder into the root of your local `my-little-gym` Git checkout. **Merge/overwrite app files**, but keep your existing `.git/` directory.
3. Review changes and publish:

   ```bash
   cd /path/to/my-little-gym
   git status
   python3 tests/validate.py
   node --test tests/*.test.mjs
   node tests/ui-smoke.mjs
   git add -A
   git commit -m "My Little Gym v0.2: shared catalog, 75 routines and routine sharing"
   git push origin main
   ```

4. GitHub Pages updates the site at **https://jeilealr.github.io/my-little-gym/app/**. Open your installed app again on each iPhone while connected to Wi-Fi. If it still shows the previous interface, close it completely and reopen it a second time to allow the new service worker to take over. Do **not** delete the app or clear website data just to update it.
5. Go to gear → **Shared routine library** → **Check for new shared routines**. On an older install, the catalog migrates from the original baseline and brings in the 11 additional categories and 55 new routines, preserving local records.
6. Go to gear → **Exercise illustrations** → **Find exercise illustrations**, followed by **Download found illustrations for offline use**. Confirm that movements actually show their correct equipment, and test in airplane mode before relying on offline use.

**Important:** A code deployment does not change the domain, IndexedDB database name or backup schema (still v3). This allows the current app to retain existing local workout data when deployed at the **same URL**. Importing a **full backup**, however, still *replaces* all local data on that particular phone; single-routine sharing is a separate, additive workflow.

## How to add shared catalog content later

The GitHub repo's published `data/categories.json`, `data/exercises.json` and `data/routines.json` constitute the **shared catalog**. All records need stable, unique IDs. Every routine must reference existing category and exercise IDs; every exercise must have accurate instructions and an exact exercise illustration mapping. Update `data/catalog.json`'s `version` when publishing a revised catalog and run all validation tests. Commit and push. The installed apps **pull** this content on their next online check; no personal data is sent back.

**Conflict policy:** A personal edit or deletion beats the shared catalog. If an updated shared routine conflicts with an edited local routine, users can install the new one as a **separate copy**. We don't silently overwrite the edited version. Changing a selected routine never rewrites previous workout sessions.

To share a routine only with one other person instead, open it in **Routines** → **Share this routine** and send the exported file using iOS Share or Files. That person's app imports it under **Settings → Import a shared routine**. This file does not include your set history, session notes, or routine activation periods. Sharing does not publish it to the repository.

## On-device storage and users

Two separate iPhones → two separate private local app databases, even though both use the same site URL and starter catalog. There is **no sign-in**, **no automatic cross-device sync**, and no support for two profiles sharing a single iPhone. Export backups regularly to prevent loss from device replacement or cleared website storage.

## Images and licensing

All 102 built-in exercises have a curated exercise-to-RepDB ID mapping. The checked public catalog contains the expected image filenames; several ambiguous illustrations were manually inspected and exercise names, equipment and directions corrected. The release intentionally **does not bundle RepDB's catalog as a redistributable dataset**. It fetches provider images for in-app use with visible attribution: [Exercise data by RepDB (repdb.co)](https://repdb.co). See their [free-tier license](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md).

This is **not** a guarantee that every provider image is medically or anatomically perfect; users should check the picture against the movement cues. Image retrieval depends on the provider, and offline use requires caching. When an old saved image points to the wrong movement after an update, the app will not display it; it shows a missing-image placeholder until the correct one can be fetched or you supply an approved picture. Full physical iPhone image QA remains necessary.

## Technical layout

- `app/app.js` — screens, controls, routines, sessions, workout History and sharing actions
- `app/domain.mjs` — routine activation, workout snapshots, backups, set tracking
- `app/catalog.mjs` — versioned pull-only catalog sync, migration from v0.1, conflict protection
- `app/share.mjs` — routine-only export/import and format validation
- `app/media.mjs` — specific exercise image mappings, licensed fetch and offline image caching
- `app/service-worker.js` — offline app-shell cache, network-first shared JSON fetch
- `data/catalog.json` — shared catalog version manifest
- `data/*.json` — 15 categories, 102 exercises, 75 routines, original-v0.1 baseline fingerprints
- `docs/V0_2_RELEASE_NOTES.md` — detailed update rules, image audit and known limitations
- `tests/` — seed validation, regression tests for v0.1 migration, sharing and UI workflows

For local testing, run `python3 -m http.server 8765` from the repository root, then open **http://localhost:8765/app/**. Avoid opening HTML as `file://`.

The training content is informational, not a personalized medical prescription. Specific machine inventory at Fitness First Leipzig Thomaskirche is not verified; adapt based on actual equipment and stop exercises that cause pain.
