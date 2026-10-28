"""Validate Phase 1+2 seed content. No third-party packages required."""
from pathlib import Path
from collections import Counter
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

def load(filename):
    return json.loads((DATA/filename).read_text(encoding='utf-8'))


def validate():
    categories = load('categories.json')
    exercises = load('exercises.json')
    routines = load('routines.json')
    defaults = load('app_defaults.json')
    plan = load('suggested_plan.json')
    errors=[]

    def check(condition, explanation):
        if not condition:
            errors.append(explanation)

    ids = lambda items: [i.get('id') for i in items]
    check(len(ids(categories))==len(set(ids(categories))), 'Duplicate category ID')
    check(len(ids(exercises))==len(set(ids(exercises))), 'Duplicate exercise ID')
    check(len(ids(routines))==len(set(ids(routines))), 'Duplicate routine ID')
    check(len(categories)==15,'Seed should contain fifteen categories')
    check(len(routines)==75,'Seed should contain five routines per fifteen categories')
    check(len(load('catalog-v1-fingerprints.json')['routines'])==20,'Legacy migration fingerprints not preserved')
    check(len(exercises)>=100,'Seed exercise library unexpectedly small')
    check(set(r['category_id'] for r in routines)==set(ids(categories)),'Routines refer to wrong categories')

    catcounts=Counter(r['category_id'] for r in routines)
    for cat in categories:
        check(catcounts[cat['id']]==5, f"{cat['id']}: expected five variants")
        variants=[r['variation'] for r in routines if r['category_id']==cat['id']]
        check(sorted(variants)==['A','B','C','D','E'],f"{cat['id']}: variants not A-E")
        check(next(r for r in routines if r['category_id']==cat['id'] and r['variation']=='A')['status']=='starter',f"{cat['id']}: A not starter")

    exids=set(ids(exercises))
    for ex in exercises:
        eid=ex['id']
        check(bool(ex.get('name')) and bool(ex.get('name_de')),f'{eid}: names are missing')
        check(bool(ex.get('instructions')) and 2<=len(ex['instructions'])<=5,f'{eid}: 2–5 technique cues needed')
        check(bool(ex.get('primary_muscles')),f'{eid}: missing muscle targets')
        check(ex['media']['status']=='pending_licensing_and_anatomy_review',f'{eid}: media should not claim approved')
        check(not ex['media']['start_image'] and not ex['media']['end_image'],f'{eid}: unknown image URL')
        check(ex['equipment_at_thomaskirche']=='individual_machine_unverified',f'{eid}: machine verification wrongly asserted')
        for alt in ex.get('alternative_exercise_ids',[]):
            check(alt in exids and alt!=eid, f'{eid}: invalid substitute {alt}')

    for r in routines:
        rid=r['id']
        check(len(r['exercises'])==4, f'{rid}: must have exactly four exercise slots')
        check(r['activation_default'] is None, f'{rid}: templates must not auto-activate')
        check(r['estimated_minutes']['min']>0 and r['estimated_minutes']['max']>r['estimated_minutes']['min'],f'{rid}: time estimate')
        priorities=[slot['priority'] for slot in r['exercises']]
        check(priorities == ['essential','essential','essential','optional'],f'{rid}: first three essential; last optional')
        for s in r['exercises']:
            check(s['exercise_id'] in exids,f'{rid}: missing {s["exercise_id"]}')
            check(1 <= s['sets'] <= 5, f'{rid}: invalid number of working sets')
            check(1 <= s['reps_min'] <= s['reps_max'] <= 25, f'{rid}: invalid rep ranges')
            check(30 <= s['rest_seconds'] <= 180, f'{rid}: invalid rest')
            check(s['target_reps_in_reserve']==('not_applicable' if next(e for e in exercises if e['id']==s['exercise_id']).get('logging',{}).get('mode')=='time' else '1-3'),f'{rid}: incorrect effort target')
            if next(e for e in exercises if e['id']==s['exercise_id']).get('logging',{}).get('mode')=='time':check(5<=s.get('seconds_min',0)<=s.get('seconds_max',0)<=7200,f'{rid}: timed slot invalid')

    p=defaults['preferences']
    check(p['weekly_session_goal'] is None, 'Weekly sessions must start UNSET (not 4)')
    check(p['session_target_minutes'] is None, 'Session minutes must start UNSET (not 45)')
    check(defaults['schedule_behavior']['require_named_weekdays'] is False, 'No forced weekdays')
    check(defaults['schedule_behavior']['require_all_categories_active'] is False, 'No forced four days')
    check(defaults['schedule_behavior']['auto_replace_expired_routines'] is False, 'No automatic replacement')
    check(defaults['gym']['individual_machine_inventory_verified'] is False, 'Machine inventory not verified')
    check(plan['scheduled_activations']==[], 'No fictional scheduled routines')
    check(plan['workout_sessions']==[], 'No fabricated workout logs')
    check(len(plan['recommended_routine_ids'])==4, 'Expected four suggested routines')
    check(all(rid in set(ids(routines)) for rid in plan['recommended_routine_ids']), 'Starter routine IDs invalid')

    # A day-one sensible balance: the quick mode still includes essential pulls/presses/arms.
    starter = {r['category_id']:r for r in routines if r['variation']=='A'}
    check(any('hamstrings' in next(e for e in exercises if e['id']==s['exercise_id'])['primary_muscles']
              for s in starter['legs']['exercises'][:3]), 'Essential legs fail to train hamstrings')
    check({'biceps','triceps'}.issubset({m for s in starter['arms_shoulders']['exercises'][:3] for m in next(e for e in exercises if e['id']==s['exercise_id'])['primary_muscles']}),
          'Essential arms fail to train biceps/triceps')

    if errors:
        for item in errors:
            print('FAIL:',item)
        print(f'Validation FAILED: {len(errors)} issue(s)')
        return 1
    print(f'PASS: {len(categories)} categories, {len(exercises)} exercises, {len(routines)} routine templates, {len(routines)*4} slots')
    print('PASS: flexible defaults; no forced sessions, times or start dates')
    print('PASS: routine/exercise references, timed and repetition prescriptions, 15×5 variants')
    print('PASS: images pending, equipment not falsely verified, no fabricated history')
    return 0

if __name__=='__main__':
    sys.exit(validate())
