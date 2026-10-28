# My Little Gym — Phase 1: Product and technical specification

**Status:** implementation-ready design and data contract, **not yet a working app**  
**Version:** 1.0 · 28 October 2026  
**Intended platform:** iPhone, via an installable offline-first Progressive Web App (PWA)  
**Primary user:** one person; no account, advertisements, subscriptions, social feed or cloud service

## 1. Product definition

> Open the app, choose an active routine, see each exercise illustrated, record the weight and repetitions for every set, and return later to see what you did. Choose and rotate routines whenever desired.

### Non-negotiable requirements

1. Only **three navigation tabs**: **Workout**, **Routines**, **History**.
2. **Routines tab** includes both *My Active Routines* and *Routine Library*; they are **not separate main tabs**.
3. Routines are independent templates. A category can be chest, legs, back, arms/shoulders, full body, upper/lower, or user-defined.
4. Select which routines to activate; set each one's start date and duration independently. Support indefinite activation and custom end dates.
5. No mandatory training days/week, weekday schedule, or fixed session duration. A four-day / ~45-minute split is merely example content.
6. Each exercise has a clear name, short technique cues, and ideally **two position illustrations** (start and finish). An unlicensed or unchecked image must not silently appear as approved.
7. Record **each set separately** with actual weight and repetitions; show the most recent performance of that exercise.
8. Deleting, editing, expiring or switching a routine **must not alter completed workout history**.
9. Custom exercises, routines, reorder, substitution and optional exercise skipping must work without accounts or payments.
10. Work offline after initial install; make a user-controlled export/import backup possible.

### Explicitly not included in v1

- Automatically designed AI training plans or nutrition advice.
- Compulsory push notifications, social features, leaderboards or streak pressure.
- Cloud synchronization or native Apple App Store submission.
- Body measurements, calories/macros, complex dashboards or health-data integration.
- A forced 'bulk vs cut' training mode: the same routines can serve either goal.

## 2. Screen map

```text
BOTTOM TABS
  Workout
    Choose workout (all currently active routines; no fixed calendar)
      Routine preview / exercise list
        Exercise detail / two position pictures / instructions
        Start workout
          In-progress exercise / log weight + reps per set
          Optional rest timer / skip / swap exercise / add set
          Finish workout / summary / optional notes

  Routines
    My Active Routines (current, scheduled, expiring, expired)
      Change routine / adjust start or duration / deactivate
    Routine Library (categories: Chest, Legs, Back, Arms & Shoulders, ...)
      Category list (Routine A, B, C, D, E, ...)
        Routine detail (4 exercises; sets, reps, images, substitutions)
          Activate (date + 2/4/6/8/custom weeks, end date, or until changed)
          Duplicate / edit / reorder / add / swap exercises
    Create category, routine or custom exercise

  History
    Completed and interrupted workouts list
      Workout detail (immutable snapshot, date, sets, notes)
        Exercise history (past loads/reps; optional simple progress chart)
```

A small gear/overflow control inside Routines or the header can open **Settings & Credits** without adding a fourth tab.

## 3. Main interactions and states

### Workout tab

- If there are no active routines: explain in one sentence and show **Choose a routine** (opens Routines).
- Otherwise: show active routine cards. User chooses which one to do **today**, in any order.
- Routine preview: exercise image thumbnail, name, sets, rep range, estimated time, and an explicit optional label on the fourth exercise.
- During a workout: persist each confirmed set immediately. Allow edits, a skipped exercise, adding a set, optional timer, exit-and-resume, and final **Finish workout**.
- Exercise detail: show start/end picture (or an honest placeholder if missing), short instructions, alternative exercise, and previous logged sets by stable exercise ID.
- Summary: show actual date/time, duration, exercises performed, complete sets and notes; no invented motivational statistics.

### Routines tab

- **My Active Routines** appears above **Routine Library**.
- Each active card shows category, name, start date and either 'Week N of M' or 'Until changed'.
- Tapping the card opens Manage: **Change routine**, **Extend/shorten duration**, **Deactivate**. Changing one category does not affect others.
- Library contains unlimited categories and unlimited routines; seed only four categories and five variations each.
- Routine detail supports preview, edit/duplicate and activation.
- Create routine wizard: name -> category -> search existing exercises -> choose slots/sets/reps/rest -> save.
- Create exercise: name, muscle(s), equipment, instructions, optional uploaded personal image. Custom content is stored locally.
- Routine changes create a new revision; **existing workout snapshots remain unchanged**.

### History tab

- Chronological workouts with category, template/revision, actual date, duration and completed-set count.
- Drill into exact exercise/weight/reps performed, not the routine's current settings.
- Exercise progress matches stable exercise IDs even across different routines.
- If a routine is deleted, its historical workout is still readable with stored names.

## 4. Scheduling and flexibility rules

| Scenario | Required behavior |
|---|---|
| Train twice one week and five times the next | Allowed; no warnings or fixed-day failure |
| Train for 20 or 75 minutes instead of 45 | Allowed; no automatic ending at the estimate |
| Activate only Legs and Back | Allowed; no forced Chest or Arms session |
| Select Chest B for 6 weeks and Legs A indefinitely | Allowed: independent activation settings |
| Change Chest B to Chest C during Legs A | Legs A activation and history stay intact |
| Activation reaches end date | Show 'Expired / choose or extend'; do **not** auto-replace |
| Reactivate previously used Chest A | Show old exercise performances; new activation is separate |
| User makes Full Body or Upper/Lower category | Allowed; no hard-coded four-category limit |
| User logs an extra ad-hoc workout | Allowed; doesn't modify an activation |

**Calendar definition:** A start date is a *local calendar date* (`YYYY-MM-DD`) rather than a timestamp. For `N` weeks, the end is **exclusive**: `end_exclusive = start_date + N × 7 calendar days`. If starting 28 October 2026 for four weeks, the routine is active from 28 October through 24 November and expires on 25 November. Use calendar arithmetic, not `N*7*24*3600` milliseconds (which breaks across clock changes).

**One active selection per category** is the v1 default. Activating a replacement ends the previous selection on the new one's start date; both activations stay in the audit trail. Distinct categories can be active at the same time; scheduled activations are supported. A future enhancement may allow multiple concurrent routines within a single category.

**Short session mode:** show the first three exercises as **essential** and the fourth as **optional**. When the user has little time, suggest fewer sets on essentials instead of dropping all hamstring, back or biceps work. Never silently delete set records or change the saved template. The timer is optional and can be turned off.

## 5. Training domain model and persistence

### Records

| Record | Main fields | Notes |
|---|---|---|
| Category | `id`, `name`, `sort_order`, `color` | Custom categories allowed |
| Exercise | `id`, English/German name, muscles, equipment, instructions, alternative IDs, media metadata, load kind | IDs persist across routines |
| Routine template | `id`, `category_id`, `variation`, `name`, `revision`, ordered exercise slots | An editable recipe, never a workout log |
| Routine slot | `exercise_id`, `sets`, `reps_min`, `reps_max`, `rest_seconds`, `priority` | One template can reuse one exercise |
| Routine activation | `id`, `routine_id`, `routine_revision`, `start_date`, `end_condition`, `end_exclusive_date`, `status` | A selection for a time period; not a workout |
| Workout session | `id`, `routine_id`, `routine_revision`, `activation_id?`, `started_at`, `completed_at?`, `status`, `routine_snapshot`, `notes` | Retains exact exercise labels and planned sets when started |
| Logged set | `id`, `workout_session_id`, `exercise_id`, `actual_exercise_name`, `slot_id`, `set_number`, `weight_kg?`, `reps?`, `completed_at`, `load_kind` | Never flatten into a single exercise result |
| Preferences | locale, weight unit, optional session goals, timer, color mode | **No mandatory weekly goal** |
| Asset attribution | provider, license, attribution text, verification status | Per image, required if externally sourced |

### Storage and privacy

- Persist app data in **IndexedDB**, including in-progress workouts and exercise templates.
- Service worker caches the app shell and properly licensed exercise illustrations for offline use. First install requires Internet to load the PWA.
- No account, analytics SDK or third-party workout upload.
- Provide **Export backup** (versioned JSON with creation timestamp and schema version) and **Import backup** (validate, preview, deduplicate or explicit replace) from day one.
- A device reset, browser storage cleanup or switching phones can lose local data unless exported; state that plainly in Settings.
- Version schema migrations before release; backups must remain importable after routine template updates.

### Weight/rep semantics

- Store set-level load in **kilograms as a decimal**, never silently combine two dumbbells into one total.
- Exercise carries load kind: `per_dumbbell`, `machine_or_total_load`, `bodyweight`, or `assistance`.
- For bodyweight push-ups, permit a blank weight. For assisted pull-ups, **lower assistance means a harder exercise**; don't treat a higher number as progress.
- Store completed timestamp and actual repetitions; do not fill past results with recommendations or fabricated weights.
- If a logged exercise is swapped, retain both the original slot and actual exercise ID in that session.
- Previous results query by actual stable exercise ID, newest completed workout first.

## 6. Exercise media specification

Every exercise detail should show:

1. A **start position** image and an **end/peak position** image, with the option of a single image for static holds.
2. One or two plain-language cues for correct setup and movement, and primary muscle(s).
3. An explicit fallback placeholder if an image is missing; never use an unrelated photo.
4. Alt text and credits when the source requires attribution.

**Proposed provider:** RepDB free-tier images. Its license allows in-app use with a visible link to RepDB but prohibits separate redistribution of its dataset and prohibits generative-AI image derivation from its images. Hence **no RepDB image or dataset files are bundled in this planning ZIP**. During Phase 3, integrate only approved in-app assets and retain credits; alternatively create fully original exercise drawings without using RepDB images as references. A fitness professional or manual check should verify illustrations before marking them approved.

## 7. Visual specification

- Light-only, calm 'kawaii-adjacent' / soft pastel appearance, not cartoon-heavy or childish.
- Background `#FFF9F5`; card white `#FFFFFF`; text `#303341`; secondary text `#6D6B76`.
- Chest blush `#F7DFE8`; legs mint `#E2F0DE`; back lavender `#E5E9FA`; arms peach `#FFEBD3`.
- Primary buttons dusty pink `#D95F86` with legible foreground; avoid low-contrast light pink-on-white labels.
- Rounded cards (12–20 px), plenty of white space, subtle outlines, compact one-thumb form controls.
- Minimum approximately 44×44 CSS-pixel touch targets; meaningful text labels in addition to icons.
- Default to the system font and support iOS Dynamic Type-like zoom / text scaling.
- No celebration screen for every set: a quiet checkmark is enough. Completion animation should be optional/subtle.

## 8. Initial data included with this package

- `data/categories.json` — four starter categories; structure allows more.
- `data/exercises.json` — **42** self-authored entries with bilingual labels, brief cues, equipment, substitutions, and **media pending**.
- `data/routines.json` — **20** routine variations: A–E for each of four categories, four exercise slots per routine. A is the recommended starter and B–E are optional alternatives to validate later.
- `data/app_defaults.json` — neutral preferences; weekly session count and target time are `null` (unset).
- `data/suggested_plan.json` — four *suggestions*, **no automatically activated routines and no fake log data**.
- `PHASE_2_TRAINING_LIBRARY.md` and `WORKOUT_QUICK_REFERENCE.md` — human-readable workouts.

## 9. Phase 3 acceptance criteria

A Phase 3 app is ready for personal testing only when:

- [ ] The tabs work in portrait Safari and as an installed iPhone Home Screen web app.
- [ ] Library lists 20 variants and allows creating a sixth variation and a Full Body category.
- [ ] Active routines and library are together inside **Routines**.
- [ ] User can activate Chest B for 2/4/6/8/custom weeks or indefinitely, with an independently selected start date.
- [ ] User can leave weekly-session and minutes goals blank, or change them without changing templates.
- [ ] At least one workout can be completed and re-opened with exact per-set weights/reps.
- [ ] An interrupted session can be resumed after closing and reopening the app.
- [ ] Swapping an exercise and editing a routine does not rewrite a completed workout.
- [ ] A changed or expired routine preserves all old logs; no automatic rotation occurs.
- [ ] Exercise media is licensed, credited and visually verified, or marked clearly unavailable.
- [ ] A previously loaded app works offline, including exercise images and existing logs.
- [ ] Export -> wipe demo install -> import recreates the same records without duplicates or loss.
- [ ] Data loss/privacy warning and accessible About/Credits are visible.
- [ ] A short session option does not mark skipped sets as completed.
- [ ] Errors in invalid dates, negative weights, and incomplete set entries are handled clearly.

## 10. Assumptions requiring later personal verification

- No exercise restrictions, joint pain, medical history, or injuries were provided. The training plan is provisional until checked.
- Actual starting loads must come from comfortable trial sets—nothing in the data prescribes personal weights.
- Machine-by-machine availability at Fitness First Leipzig Thomaskirche hasn't been verified. Confirm on site; substitutions are supplied.
- Image assets aren't included yet; Phase 3 should source or create and visually review them.
- The exact app name **My Little Gym** is a working title, not a registered or published product name.

## 11. Phase boundary

**Phases 1–2 are design and content, not a deployed app.** Phase 3 will create HTML/CSS/TypeScript application code, storage logic, image integration, tests and an installable web manifest. Publishing and testing on iPhone is Phase 4.
