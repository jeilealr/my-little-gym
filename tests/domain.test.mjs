import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addDays,activationEnd,activationState,activeForCategory,createActivation,createSession,sessionFinished,lastSets,bestSeries,makeInitialState,validateBackup} from '../app/domain.mjs';
const load=x=>JSON.parse(readFileSync(new URL(`../data/${x}.json`,import.meta.url),'utf8'));
const init=()=>makeInitialState({categories:load('categories'),exercises:load('exercises'),routines:load('routines')});

test('date addition is calendar-based across Berlin daylight saving transitions',()=>{
 assert.equal(addDays('2026-10-24',7),'2026-10-31');
 assert.equal(addDays('2026-03-27',7),'2026-04-03');
 assert.equal(activationEnd('2026-10-28','4'),'2026-11-25');
 assert.equal(activationEnd('2026-10-28','2'),'2026-11-11');
 assert.equal(activationEnd('2026-10-28','custom','2026-11-15'),'2026-11-16');
 assert.equal(activationEnd('2026-10-28','until'),null);
});
test('leg variations replace calves with glute and hip thrust work',()=>{
 const r=load('routines').filter(x=>x.category_id==='legs');
 assert.equal(r.length,5);
 assert.deepEqual(r.find(x=>x.id==='legs-a').exercises.map(x=>x.exercise_id), ['leg_press','hip_thrust_machine','db_rdl','seated_leg_curl']);
 for(const x of r){
  assert(x.exercises.some(s=>s.exercise_id==='hip_thrust_machine'));
  assert(x.exercises.every(s=>!s.exercise_id.includes('calf')));
 }
});
test('activations are independent per category and preserve end-exclusive boundary',()=>{
 const state=init();
 createActivation(state,{routineId:'chest-a',startDate:'2026-10-28',duration:'4'});
 createActivation(state,{routineId:'legs-a',startDate:'2026-10-28',duration:'until'});
 assert.equal(activeForCategory(state,'chest','2026-11-24')?.routine_id,'chest-a');
 assert.equal(activeForCategory(state,'chest','2026-11-25'),null);
 createActivation(state,{routineId:'chest-b',startDate:'2026-11-01',duration:'4'});
 assert.equal(activeForCategory(state,'chest','2026-11-02')?.routine_id,'chest-b');
 assert.equal(activeForCategory(state,'legs','2026-11-02')?.routine_id,'legs-a');
 assert.equal(activeForCategory(state,'chest','2026-10-30')?.routine_id,'chest-a');
});
test('superseded future activations never appear as scheduled',()=>{
 const state=init();
 const old=createActivation(state,{routineId:'chest-a',startDate:'2026-11-16',duration:'4'});
 createActivation(state,{routineId:'chest-b',startDate:'2026-10-28',duration:'4'});
 assert.equal(activationState(old,'2026-10-28'),'expired');
});
test('workout snapshot does not change when a routine gets edited',()=>{
 const state=init();
 const session=createSession(state,'legs-a','2026-10-28');
 const prev=session.entries.map(x=>x.exercise_id);
 state.routines.find(x=>x.id==='legs-a').exercises[0].exercise_id='seated_calf_raise';
 state.routines.find(x=>x.id==='legs-a').revision++;
 assert.deepEqual(session.entries.map(x=>x.exercise_id),prev);
 assert.equal(session.entries[1].exercise_id,'hip_thrust_machine');
 session.entries[1].sets[0].weight_kg=40;
 session.entries[1].sets[0].reps=10;
 session.entries[1].sets[0].done=true;
 sessionFinished(session);
 assert.equal(lastSets(state,'hip_thrust_machine').sets[0].weight_kg,40);
 assert.equal(bestSeries(state,'hip_thrust_machine')[0].value,40);
});
test('backup validates schema and unique IDs, no rigid session goals',()=>{
 const state=init();
 assert(validateBackup(state));
 assert.equal(state.activations.length,0);
 assert.equal(state.sessions.length,0);
 assert.throws(()=>validateBackup({...state,schemaVersion:2}));
 assert.throws(()=>validateBackup({...state,categories:[...state.categories,state.categories[0]]}));
});
