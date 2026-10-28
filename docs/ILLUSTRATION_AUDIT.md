# Illustration match audit — My Little Gym v0.2

**Date:** 28 October 2026 · **Exercise definitions:** 102 · **Distinct RepDB image IDs:** 102

This audit is meant to **avoid depicting the wrong exercise**. Every built-in exercise has a specific RepDB exercise ID, rather than relying on a fuzzy image search result. We checked source image file availability in its public Git tree and reviewed official names, equipment and movement descriptions. Some high-risk start/peak illustrations were also inspected visually. **This is not a medical certification of every illustration, nor a claim of full iPhone QA.**

## High-risk corrections

- **Incline dumbbell fly** (legacy internal ID `low_to_high_cable_fly`): the old low-to-high cable fly used the wrong standard cable fly picture. We changed the displayed exercise, equipment and instructions to an illustrated *incline dumbbell fly*. Internal ID remains for backward compatibility.
- **Cable triceps pushdown (bar)** (legacy internal ID `rope_triceps_pressdown`): the illustration actually shows a bar, not a rope. The public name and technique now specify the bar.
- **Plate-loaded lateral raise**: the pictured machine is specifically plate-loaded.
- **One-arm seated cable row**: specified the seated position depicted by the source.
- **Machine hip abduction**: the source depicts a seated hip-abduction machine, not a band variation.
- **Dumbbell sumo squat**: the previous source depicts a barbell. We chose the dumbbell picture instead and adjusted the instructions to a central dumbbell hold, as pictured.
- **Kettlebell goblet squat**: the source shows a kettlebell, not a dumbbell; the public label, equipment and cues now match.
- **Standing and seated calf raises**: the source photos show purpose-built calf raise machines, not dumbbells. Both equipment labels now specify the correct machine.
- **Superman floor raise**: described as a repeatable floor lift rather than an indefinite hold.
- **Burpees, jumping jacks, high knees**: names now describe the pictured standard action, while optional easier alternatives are explicitly distinguished from the illustration.

## Safeguards in the app

1. Every starter exercise maps to a specific RepDB ID, and custom exercises require a picture. No fuzzy replacements for starter exercises.
2. Cached pictures with a catalog ID that no longer matches the corrected exercise are rejected, rather than silently displayed. If a user-edited old exercise still has a different name or piece of equipment, the app withholds the new image or selects an exact source (such as dumbbell goblet squat) rather than matching by ID alone.
3. Remote image paths are restricted to publisher flat illustration assets, not premium previews.
4. Unavailable pictures are visible as missing instead of replaced with a mismatched exercise.
5. For offline use, images must first be downloaded and cached while connected to the internet.

## Full exercise mapping

| Exercise shown in app | Equipment shown in app | Source illustration |
|---|---|---|
| Chest press machine | chest press machine | [chest-press-machine](https://exercise-dataset.com/exercise/chest-press-machine/) |
| Incline dumbbell press | incline bench + dumbbells | [incline-db-press](https://exercise-dataset.com/exercise/incline-db-press/) |
| Pec deck fly | pec deck machine | [pec-deck](https://exercise-dataset.com/exercise/pec-deck/) |
| Cable chest fly | cable station | [cable-fly](https://exercise-dataset.com/exercise/cable-fly/) |
| Incline dumbbell fly | Incline bench + dumbbells | [incline-dumbbell-fly](https://exercise-dataset.com/exercise/incline-dumbbell-fly/) |
| Flat dumbbell bench press | flat bench + dumbbells | [db-bench-press](https://exercise-dataset.com/exercise/db-bench-press/) |
| Push-up | bodyweight | [push-up](https://exercise-dataset.com/exercise/push-up/) |
| Barbell bench press | barbell bench + spotter or safeties | [bench-press](https://exercise-dataset.com/exercise/bench-press/) |
| Leg press machine | leg press machine | [leg-press](https://exercise-dataset.com/exercise/leg-press/) |
| Dumbbell Romanian deadlift | dumbbells | [dumbbell-romanian-deadlift](https://exercise-dataset.com/exercise/dumbbell-romanian-deadlift/) |
| Seated leg curl | leg curl machine | [seated-leg-curl](https://exercise-dataset.com/exercise/seated-leg-curl/) |
| Lying leg curl | lying leg curl machine | [leg-curl](https://exercise-dataset.com/exercise/leg-curl/) |
| Standing calf raise (machine) | standing calf raise machine | [standing-calf-raise](https://exercise-dataset.com/exercise/standing-calf-raise/) |
| Seated calf raise (machine) | seated calf raise machine | [seated-calf-raise](https://exercise-dataset.com/exercise/seated-calf-raise/) |
| Kettlebell goblet squat | kettlebell | [goblet-squat](https://exercise-dataset.com/exercise/goblet-squat/) |
| Leg extension machine | leg extension machine | [leg-extension](https://exercise-dataset.com/exercise/leg-extension/) |
| Hip thrust / glute drive machine | hip thrust or glute drive machine | [plate-loaded-glute-drive](https://exercise-dataset.com/exercise/plate-loaded-glute-drive/) |
| Dumbbell hip thrust | bench + dumbbell | [dumbbell-hip-thrust](https://exercise-dataset.com/exercise/dumbbell-hip-thrust/) |
| Bulgarian split squat | bench + dumbbells | [bulgarian-split-squat](https://exercise-dataset.com/exercise/bulgarian-split-squat/) |
| Lat pulldown | lat pulldown machine | [lat-pulldown](https://exercise-dataset.com/exercise/lat-pulldown/) |
| Neutral-grip lat pulldown | lat pulldown machine with neutral grip | [v-bar-lat-pulldown](https://exercise-dataset.com/exercise/v-bar-lat-pulldown/) |
| Chest-supported machine row | chest-supported row machine | [chest-supported-machine-row](https://exercise-dataset.com/exercise/chest-supported-machine-row/) |
| Seated cable row | cable row station | [seated-cable-row](https://exercise-dataset.com/exercise/seated-cable-row/) |
| Reverse pec deck / rear delt fly | reverse pec deck machine | [machine-reverse-fly](https://exercise-dataset.com/exercise/machine-reverse-fly/) |
| Single-arm dumbbell row | bench + dumbbell | [single-arm-db-row](https://exercise-dataset.com/exercise/single-arm-db-row/) |
| Straight-arm cable pulldown | high cable station | [straight-arm-pulldown](https://exercise-dataset.com/exercise/straight-arm-pulldown/) |
| One-arm seated cable row | Seated cable-row station | [one-arm-seated-cable-row](https://exercise-dataset.com/exercise/one-arm-seated-cable-row/) |
| Back extension | back-extension station | [back-extension](https://exercise-dataset.com/exercise/back-extension/) |
| Assisted pull-up machine | assisted pull-up machine | [assisted-pull-ups](https://exercise-dataset.com/exercise/assisted-pull-ups/) |
| Cable face pull | high cable station | [face-pull](https://exercise-dataset.com/exercise/face-pull/) |
| Shoulder press machine | shoulder press machine | [machine-shoulder-press](https://exercise-dataset.com/exercise/machine-shoulder-press/) |
| Dumbbell lateral raise | dumbbells | [lateral-raise](https://exercise-dataset.com/exercise/lateral-raise/) |
| Cable triceps pushdown (bar) | High cable station + bar attachment | [tricep-pushdown](https://exercise-dataset.com/exercise/tricep-pushdown/) |
| Dumbbell hammer curl | dumbbells | [hammer-curl](https://exercise-dataset.com/exercise/hammer-curl/) |
| Dumbbell shoulder press | dumbbells + bench | [dumbbell-shoulder-press](https://exercise-dataset.com/exercise/dumbbell-shoulder-press/) |
| EZ-bar biceps curl | EZ curl bar | [ez-bar-curl](https://exercise-dataset.com/exercise/ez-bar-curl/) |
| Plate-loaded lateral raise | Plate-loaded lateral raise machine | [plate-loaded-lateral-raise](https://exercise-dataset.com/exercise/plate-loaded-lateral-raise/) |
| Overhead cable triceps extension | cable station | [cable-overhead-tricep-extension](https://exercise-dataset.com/exercise/cable-overhead-tricep-extension/) |
| Cable biceps curl | cable station | [cable-curl](https://exercise-dataset.com/exercise/cable-curl/) |
| Cable lateral raise | cable station | [cable-lateral-raise](https://exercise-dataset.com/exercise/cable-lateral-raise/) |
| Biceps curl machine | biceps curl machine | [machine-bicep-curl](https://exercise-dataset.com/exercise/machine-bicep-curl/) |
| Triceps extension machine | triceps extension machine | [machine-triceps-extension](https://exercise-dataset.com/exercise/machine-triceps-extension/) |
| Forearm plank | Bodyweight | [plank](https://exercise-dataset.com/exercise/plank/) |
| Side plank | Bodyweight | [side-plank](https://exercise-dataset.com/exercise/side-plank/) |
| Dead bug | Bodyweight | [dead-bug](https://exercise-dataset.com/exercise/dead-bug/) |
| Bird dog | Bodyweight | [bird-dog](https://exercise-dataset.com/exercise/bird-dog/) |
| Bicycle crunch | Bodyweight | [bicycle-crunch](https://exercise-dataset.com/exercise/bicycle-crunch/) |
| Reverse crunch | Bodyweight | [reverse-crunches](https://exercise-dataset.com/exercise/reverse-crunches/) |
| Hanging knee raise | Pull-up bar | [hanging-knee-raise](https://exercise-dataset.com/exercise/hanging-knee-raise/) |
| Kneeling cable crunch | Cable station | [cable-crunch](https://exercise-dataset.com/exercise/cable-crunch/) |
| Cable Pallof press | Cable station | [cable-pallof-press](https://exercise-dataset.com/exercise/cable-pallof-press/) |
| Mountain climbers | Bodyweight | [mountain-climbers](https://exercise-dataset.com/exercise/mountain-climbers/) |
| Ab wheel rollout | Ab wheel | [ab-wheel-rollout](https://exercise-dataset.com/exercise/ab-wheel-rollout/) |
| Hollow body hold | Bodyweight | [hollow-body-hold](https://exercise-dataset.com/exercise/hollow-body-hold/) |
| Russian twist | Bodyweight | [russian-twist](https://exercise-dataset.com/exercise/russian-twist/) |
| Standing quadriceps stretch | Bodyweight | [standing-quad-stretch](https://exercise-dataset.com/exercise/standing-quad-stretch/) |
| Hamstring stretch on bench | Bench | [bench-hamstring-stretch](https://exercise-dataset.com/exercise/bench-hamstring-stretch/) |
| Couch stretch | Bench | [bench-couch-stretch](https://exercise-dataset.com/exercise/bench-couch-stretch/) |
| Pigeon stretch | Mat | [pigeon-stretch](https://exercise-dataset.com/exercise/pigeon-stretch/) |
| Child's pose | Mat | [childs-pose](https://exercise-dataset.com/exercise/childs-pose/) |
| Cat–cow mobility | Mat | [cat-cow](https://exercise-dataset.com/exercise/cat-cow/) |
| Doorway chest stretch | Doorway | [doorway-chest-stretch](https://exercise-dataset.com/exercise/doorway-chest-stretch/) |
| Thread the needle | Mat | [thread-the-needle](https://exercise-dataset.com/exercise/thread-the-needle/) |
| Gentle cobra stretch | Mat | [cobra-stretch](https://exercise-dataset.com/exercise/cobra-stretch/) |
| Seated spinal twist | Mat | [seated-spinal-twist](https://exercise-dataset.com/exercise/seated-spinal-twist/) |
| Butterfly stretch | Mat | [butterfly-stretch](https://exercise-dataset.com/exercise/butterfly-stretch/) |
| Cross-body shoulder stretch | Bodyweight | [cross-body-shoulder-stretch](https://exercise-dataset.com/exercise/cross-body-shoulder-stretch/) |
| Downward-facing dog | Mat | [downward-dog](https://exercise-dataset.com/exercise/downward-dog/) |
| Kneeling hip flexor stretch | Mat | [kneeling-hip-flexor-stretch](https://exercise-dataset.com/exercise/kneeling-hip-flexor-stretch/) |
| Standing calf stretch | Wall | [standing-calf-stretch](https://exercise-dataset.com/exercise/standing-calf-stretch/) |
| Bodyweight squat | Bodyweight | [bodyweight-squat](https://exercise-dataset.com/exercise/bodyweight-squat/) |
| Reverse lunge | Bodyweight | [reverse-lunge](https://exercise-dataset.com/exercise/reverse-lunge/) |
| Glute bridge | Mat | [glute-bridge](https://exercise-dataset.com/exercise/glute-bridge/) |
| Step-ups | Bench/step | [step-ups](https://exercise-dataset.com/exercise/step-ups/) |
| Walking lunges | Bodyweight | [walking-lunge](https://exercise-dataset.com/exercise/walking-lunge/) |
| Bear crawl | Bodyweight | [bear-crawl](https://exercise-dataset.com/exercise/bear-crawl/) |
| Superman floor raise | Mat | [superman](https://exercise-dataset.com/exercise/superman/) |
| Burpees | Bodyweight | [burpees](https://exercise-dataset.com/exercise/burpees/) |
| Jump squat | Bodyweight | [jump-squat](https://exercise-dataset.com/exercise/jump-squat/) |
| Wall sit | Wall | [wall-sit](https://exercise-dataset.com/exercise/wall-sit/) |
| Inchworm walkout | Bodyweight | [inchworm](https://exercise-dataset.com/exercise/inchworm/) |
| Glute kickback (floor) | Mat | [glute-kickback](https://exercise-dataset.com/exercise/glute-kickback/) |
| Machine hip abduction | Hip abduction machine | [hip-abduction](https://exercise-dataset.com/exercise/hip-abduction/) |
| Cable pull-through | Cable station | [cable-pull-through](https://exercise-dataset.com/exercise/cable-pull-through/) |
| Dumbbell sumo squat | Dumbbell | [db-sumo-squat](https://exercise-dataset.com/exercise/db-sumo-squat/) |
| High-foot leg press | Leg press | [high-foot-leg-press](https://exercise-dataset.com/exercise/high-foot-leg-press/) |
| Single-leg hip thrust | Bench | [single-leg-hip-thrust](https://exercise-dataset.com/exercise/single-leg-hip-thrust/) |
| Smith machine hip thrust | Smith machine | [smith-machine-hip-thrust](https://exercise-dataset.com/exercise/smith-machine-hip-thrust/) |
| Cable glute kickback | Cable station | [cable-kickback](https://exercise-dataset.com/exercise/cable-kickback/) |
| Rowing machine | Rowing ergometer | [rowing-machine](https://exercise-dataset.com/exercise/rowing-machine/) |
| Jumping jacks | Bodyweight | [jumping-jacks](https://exercise-dataset.com/exercise/jumping-jacks/) |
| Jump rope | Jump rope | [jump-rope](https://exercise-dataset.com/exercise/jump-rope/) |
| High knees | Bodyweight | [high-knees](https://exercise-dataset.com/exercise/high-knees/) |
| Stationary bike | Stationary bike | [stationary-bike](https://exercise-dataset.com/exercise/stationary-bike/) |
| Air bike | Air bike | [air-bike](https://exercise-dataset.com/exercise/air-bike/) |
| Stair climber | Stair climber | [stair-climber](https://exercise-dataset.com/exercise/stair-climber/) |
| Suitcase carry | Dumbbell/kettlebell | [suitcase-carry](https://exercise-dataset.com/exercise/suitcase-carry/) |
| Kettlebell swing | Kettlebell | [kettlebell-swing](https://exercise-dataset.com/exercise/kettlebell-swing/) |
| Single-leg Romanian deadlift | Dumbbell or bodyweight | [single-leg-romanian-deadlift](https://exercise-dataset.com/exercise/single-leg-romanian-deadlift/) |
| Step-up to balance | Low step | [step-up-to-balance](https://exercise-dataset.com/exercise/step-up-to-balance/) |
| Cossack squat | Bodyweight | [cossack-squat](https://exercise-dataset.com/exercise/cossack-squat/) |
| World's greatest stretch | Mat | [worlds-greatest-stretch](https://exercise-dataset.com/exercise/worlds-greatest-stretch/) |

## License and remaining QA

The app shows attribution for [RepDB's free-tier exercise dataset](https://github.com/RepDB/exercise-dataset) under its [license](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md). This audit contains the exercise IDs **selected by this app**, not a repackaged third-party image dataset. The app fetches the actual illustrations directly from the source publisher for in-app use.

**Still required:** visually inspect all images and end positions on the actual iPhone, verify the offline cache in airplane mode, and seek trainer guidance on unfamiliar movements. RepDB's AI-generated artwork can contain errors, including inconsistencies between its descriptions and drawings, even where the source name matches.
