# Exercise image implementation and license

The app queries the official free-tier `exercises.json` index from
`https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json`
when online. It maps our existing original exercise IDs to exact catalog IDs, then
loads the corresponding official `start` / `peak` WebP illustrations from the
same official canonical repository, with attribution in Settings.

The source allows free in-app use, but prohibits distributing the dataset itself.
Therefore no third-party image/data catalog was re-packaged inside this ZIP.
The fallback is `app/assets/exercise-placeholder.svg`, an original icon which
**does not claim to teach a movement**; the actual original technique cues are
still available in each exercise detail.

If a user wants pictures offline, they should choose "Find exercise illustrations"
then "Download found illustrations for offline use" in Settings, while connected.
An in-browser cache stores the validated images. CacheStorage is browser-managed:
there is no lifetime guarantee against mobile storage eviction.

The app also allows uploading your own exercise photo. This is compressed locally
and included in your exported backups; ensure you have rights to any image used.

Source/license: https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md
Attribution: Exercise data by RepDB (repdb.co) — https://repdb.co
No images from RepDB have been used as image-generation references.


### Phase 3.1: all starter exercises need a picture

All 42 initial exercises are explicitly mapped to exercise illustrations from the publisher's public free-tier catalog. Source filenames were verified via the public Git tree. The app loads the publisher's images at runtime instead of redistributing the dataset. Names differing from our records caused missing images in the earlier beta (e.g. `neutral_grip_pulldown` maps to `v-bar-lat-pulldown`, `single_arm_dumbbell_row` to `single-arm-db-row`).

Known related-variation illustrations: `low_to_high_cable_fly` uses the publisher's standard cable-fly image (cable angle differs); `rope_triceps_pressdown` uses their general triceps pushdown; `lateral_raise_machine` uses plate-loaded lateral raise; `lying_leg_curl` uses the general leg-curl image. Those are flagged in the app; don't treat them as exact machine-specific demonstrations. Replace with verified original/on-site photos where needed.

Missing illustrations are not acceptable as a finished design. Settings displays the missing-image list and lets the owner attach photos. The app also prevents saving a newly created exercise without a picture. **Offline images still require a successful download/cache on the real iPhone.** Source URLs and filename existence have been checked, but full network image rendering on a physical device has not been verified.
