"""Maintain the explicit exercise image audit for the built-in exercise library."""
import re, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EX=json.loads((ROOT/'data/exercises.json').read_text())
SRC=(ROOT/'app/media.mjs').read_text()
block=SRC.split('export const STARTER_IMAGES={',1)[1].split('};',1)[0]
legacy=dict(re.findall(r"\s*([a-z_]+):'([a-z0-9-]+)'",block))
slugs=set()
rows=[]
for e in EX:
    slug=e.get('media',{}).get('catalog_id') or legacy.get(e['id'])
    assert slug and re.fullmatch('[a-z0-9-]+',slug),e['id']
    slugs.add(slug)
    rows.append('| '+e['name'].replace('|','\\|')+' | '+e['equipment'].replace('|','\\|')+' | ['+slug+'](https://exercise-dataset.com/exercise/'+slug+'/) |')
assert len(EX)==102
content=f'''# Illustration match audit — My Little Gym v0.2

**Date:** 28 October 2026 · **Exercise definitions:** {len(EX)} · **Distinct RepDB image IDs:** {len(slugs)}

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
{chr(10).join(rows)}

## License and remaining QA

The app shows attribution for [RepDB's free-tier exercise dataset](https://github.com/RepDB/exercise-dataset) under its [license](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md). This audit contains the exercise IDs **selected by this app**, not a repackaged third-party image dataset. The app fetches the actual illustrations directly from the source publisher for in-app use.

**Still required:** visually inspect all images and end positions on the actual iPhone, verify the offline cache in airplane mode, and seek trainer guidance on unfamiliar movements. RepDB's AI-generated artwork can contain errors, including inconsistencies between its descriptions and drawings, even where the source name matches.
'''
(ROOT/'docs/ILLUSTRATION_AUDIT.md').write_text(content)
print('PASS:',len(EX),'exercise image mappings,',len(slugs),'distinct source IDs')
