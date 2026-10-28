# My Little Gym — working iPhone web app (Phase 3.1)

**Status: working Phase 3.1 beta, tested with automated logic, UI-flow, and static iPhone-width visual checks on 28 October 2026.**
This is a real offline-capable Progressive Web App (PWA), **not** the earlier static mockups. It is free and has no account, subscription, server-side workout database, ads or analytics. It is not yet deployed and has not yet been tested on your physical iPhone.

## Your personal training concept

- **Gym reference:** Fitness First Leipzig Thomaskirche, Petersstraße 20, 04109 Leipzig, Germany.
- **Flexible training:** No required days per week, calendar weekdays or workout duration. The routine time on screen is a *rough estimate*.
- **Initial plan:** 20 templates: Chest A–E, Legs A–E, Back A–E and Arms & Shoulders A–E; 42 searchable exercises. Any number of new categories, exercises and routines can be added.
- **Leg change:** Legs A now prioritizes **leg press → hip thrust/glute drive → dumbbell Romanian deadlift → seated leg curl**; all five leg variations favor glutes rather than calf raises. Calf raises remain in the searchable exercise library if desired.
- **Routine activation:** Independently choose one routine per body-area category, with a start date and two, four, six or eight weeks, a custom end date, or indefinitely. Change/extend whenever you like.
- **Actual gym use:** Select a workout, see its four exercises with mapped position pictures (download once when online), log the **weight and reps for each individual set**, pause or resume a workout and finish it. Workout history is a snapshot; later edits cannot change it.

## 1. Open it on your computer (testing)

No JavaScript framework, Node package installation, Xcode or paid service needed.

```bash
unzip my_little_gym_phase_3.zip
cd my_little_gym_phase_3
python3 -m http.server 8765
```

Open **http://localhost:8765/app/** in Safari or Chrome. Leave the terminal running while testing. Opening `app/index.html` directly using `file://` will not work, because it loads JSON files and registers a service worker.

## 2. Put it on your iPhone (free, no App Store)

An iPhone needs a reachable **HTTPS** URL to install this PWA. GitHub Pages is a convenient free option.

1. Create a new repository on GitHub, e.g. `my-little-gym`, and set it **public** so GitHub Pages is available on a free personal account. **Upload the unzipped project contents** into the repository root, preserving the `app/` and `data/` directories. Do not upload your personal exported workout backups.
2. In the repository open **Settings → Pages → Build and deployment → Deploy from a branch**. Select `main`, folder `/(root)`, then Save.
3. After Pages publishes, visit `https://YOUR-USERNAME.github.io/my-little-gym/app/` in **Safari** on your iPhone (adjust for your actual repository name).
4. In Safari tap **Share → Add to Home Screen**, enable **Open as Web App** when offered, then tap **Add**.
5. Open the new **Little Gym** Home Screen icon. In **Routines** activate whatever you want to train. The library intentionally does not force any routines to be active on first install.
6. Before relying on offline pictures, while connected to Wi-Fi, open **Settings (gear) → Find exercise illustrations → Download found illustrations for offline use**. Then put the phone in airplane mode and test it. The first setup and illustration download require Internet.

**Important:** GitHub Pages publishes your *app code and seeded sample routines* publicly. Your actual workout logs and activation choices stay in IndexedDB on your iPhone unless you explicitly export them; do **not** put your JSON backup files in a public GitHub repository. A hosted site can be updated by uploading new code files, but your existing local data is independent of the published code.

## 3. First steps inside the app

- **Routines → Legs → Legs A → Activate routine → choose duration** (e.g. four weeks or Until I change it).
- **Workout → Legs → Start workout → tap an exercise → enter kg and repetitions per set → ✓**.
- Log all completed sets and return to the workout list. **Finish workout** stores an immutable history snapshot; any uncompleted sets will not be counted as completed.
- **History → overview** to filter Chest/Legs/Back/Arms and see workouts over six months. **Yearly view** shows 12 months. Tap a past workout, then an exercise, for weight/repetition progress with 1M/3M/6M/1Y/All filters.
- In **Routines** you can duplicate/edit exercises, add new routines and categories (new custom exercises require a picture), change the active routine or extend its duration, all without deleting previous records.
- You can also **Train this routine once** directly from the library without making it active.

## 4. Storage, privacy and backups

Everything personal is stored in **IndexedDB** within this device/browser. There is no cloud sync or automatic backup. If you clear website/app data, change the site's origin, remove the PWA or replace the phone, you may lose data.

**Back up regularly:** top-right gear → **Export my data**. Save the JSON file in your iPhone Files app or somewhere safe. To restore, **Choose backup file** and confirm. Import **replaces**, rather than merges with, current data, with a confirmation prompt. Images you add to your own custom exercises are compressed and included in backups. Backups use schema version 3.

Exercise illustrations are obtained from the publisher's free public dataset using a curated list of 42 starter-exercise IDs. Image and index requests (plus ordinary IP/network information) reach GitHub's raw-content infrastructure; **your logged workouts, sets, routine preferences and backup files are not uploaded**. If unavailable, the app displays a placeholder and your original technique cues. Only images you explicitly cache can be relied upon offline; Safari storage may still be evicted by iOS.

## 5. Project layout

```text
my_little_gym_phase_3/
  index.html                 # Opens app/ (GitHub Pages root entry)
  app/
    index.html               # The actual application shell
    app.js                   # All three tabs, editors, activations, logging, history
    domain.mjs               # Pure date, session and backup logic
    history.mjs              # Monthly and per-exercise trend calculations
    db.mjs                   # IndexedDB persistence
    media.mjs                # Curated 42 exercise-to-image mappings, license-aware lookup/cache
    styles.css               # Pastel mobile styling
    manifest.webmanifest     # Home Screen installation
    service-worker.js        # App-shell + image caching for offline use
    assets/                  # Original app icons and fallback illustration
  data/
    categories.json          # Starter categories
    exercises.json           # Our 42 original exercise summaries and cues
    routines.json            # 20 user-editable starter templates
    app_defaults.json        # Flexible training defaults
    suggested_plan.json      # Suggestions, not automatic activations
  docs/                      # Prior phases, revised glute plan, licensing notes
  tests/                     # Domain, seed and smoke tests
```

## 6. Developer tests

From the project root:

```bash
python3 tests/validate.py
node --test tests/domain.test.mjs
node tests/ui-smoke.mjs
```

- Unit tests cover training-day flexibility, calendar date boundaries including daylight-saving changes, routine replacement independence, glute substitutions, immutable history and backups.
- The UI smoke test simulates routine activation, set editing, workout finish/history, template revision, new routine and custom category.
- The automated tests passed in the generation environment. **A physical iPhone Safari/standalone PWA usability and offline-image test remains necessary.** Localhost navigation was blocked by browser policy, so static app HTML was rendered at iPhone width for layout QA; this is not a claim of a completed Safari test.

## 7. Exercise images and usage rights

We intentionally **do not redistribute RepDB's catalog as a dataset** inside this ZIP. The app fetches the publisher's catalog and matched illustrations in the browser for in-app use. Images may not always be available; some exercises have no exact match.

Attribution is visible in **Settings → About**: [Exercise data by RepDB (repdb.co)](https://repdb.co).
Official [RepDB free-tier terms](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md) allow personal/commercial *in-app use* with attribution; prohibit repackaging the dataset and using their images as AI-generation references. The app contains no premium example illustrations and no AI derivations from RepDB art.

The gym confirms a Booty Zone with Glutebuilder equipment but **not** a list of exact machine models. Machine selections are suggestions subject to what you find at Thomaskirche. Training material is informational and is not medical assessment; seek coaching for unfamiliar machines and adjust movements if painful.

## 8. Known limitations in this beta

- No cloud sync between devices (privacy-first deliberate choice).
- Routine variants A–E have shared main movements; switching often may make progress comparison harder.
- All 42 starter exercises have catalog mappings, verified against the public image-file list. Four use closely related exercise illustrations with visible explanatory notes. If GitHub cannot be reached, an image has not been cached, or an image fails to load, a clearly flagged missing-image fallback may still appear. Use Settings to locate missing images or add your own photograph. The app has not had an end-to-end image-load test on the physical iPhone.
- No live equipment availability for Thomaskirche.
- This is a lightweight browser PWA, not a compiled Swift app or App Store download.
- The app has not been installed and tested on your actual iPhone; please verify Safari install, offline caching and number-input keyboard behavior before relying on it in the gym.

## Phase 3.1 update (28 Oct 2026)

- Fixed the screenshot's missing neutral-grip pulldown by mapping it to RepDB's `v-bar-lat-pulldown` image. Fixed single-arm dumbbell row with the provider's `single-arm-db-row` ID. Audited all 42 starter exercises: 42 mappings, 41 distinct catalog exercises (one cable-fly image is shared for an angle variation). All referenced source image filenames were checked in the publisher's public Git tree.
- When online, the app now refreshes missing images after initial load, even if some images were already mapped previously, and updates the visible thumbnails when the network request finishes.
- Settings shows an image-coverage count and identifies any unresolved exercises; you can add your own picture for an existing exercise. New custom exercises require a photo before saving. A remote source can still fail or be unavailable offline until cached.
- Added History category filters, a six-month activity chart, a 12-month trends page, exercise weight-versus-reps charts, 1M/3M/6M/1Y/All date filters, and prior per-set results. Charts are generated from *your own completed workouts only*.
- This version retains database schema v3 and the same site origin/path structure. To upgrade an existing installation, upload the new `app/` files and refresh the installed web app on the **same HTTPS domain and path**. Your existing locally stored workouts should remain, but export a backup before replacing code. The service worker was version-bumped to refresh cached application assets.
