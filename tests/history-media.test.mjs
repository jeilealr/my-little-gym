import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeInitialState} from '../app/domain.mjs';
import {completedSessions,monthlyHistory,exerciseProgress,summarizeHistory} from '../app/history.mjs';
import {STARTER_IMAGES,matchVerifiedMedia,expectedCatalogId} from '../app/media.mjs';
const load=x=>JSON.parse(readFileSync(new URL(`../data/${x}.json`,import.meta.url),'utf8'));
const seed=()=>makeInitialState({categories:load('categories'),exercises:load('exercises'),routines:load('routines')});
test('every seed exercise has a curated verified-catalog ID (no generic icon on successful load)',()=>{
 const exercises=load('exercises');
 assert.equal(exercises.length,102);
 const ids=Object.keys(STARTER_IMAGES);
 assert.equal(ids.length,42);
 for(const e of exercises)assert(e.media?.catalog_id||STARTER_IMAGES[e.id],`missing illustration for ${e.id}`);
 assert.equal(STARTER_IMAGES.neutral_grip_pulldown,'v-bar-lat-pulldown');
 assert.equal(STARTER_IMAGES.single_arm_dumbbell_row,'single-arm-db-row');
 assert.equal(STARTER_IMAGES.low_to_high_cable_fly,'incline-dumbbell-fly');
 assert.equal(STARTER_IMAGES.rope_triceps_pressdown,'tricep-pushdown');
 const byId=new Map(exercises.map(e=>[e.id,e]));
 assert.equal(byId.get('goblet_squat').equipment,'kettlebell');
 assert.equal(byId.get('standing_calf_raise').equipment,'standing calf raise machine');
 assert.equal(byId.get('seated_calf_raise').equipment,'seated calf raise machine');
 assert.equal(byId.get('sumo_squat').logging.load_kind,'machine_or_total_load');
 assert.equal(byId.get('hip_abduction').media.catalog_id,'hip-abduction');
 assert.equal(expectedCatalogId({...byId.get('rope_triceps_pressdown'),name:'Rope triceps pushdown'}),null);
 assert.equal(expectedCatalogId({...byId.get('low_to_high_cable_fly'),name:'Low-to-high cable fly'}),null);
 assert.equal(expectedCatalogId({...byId.get('goblet_squat'),equipment:'dumbbell'}),'db-goblet-squat');
 assert.equal(expectedCatalogId({...byId.get('standing_calf_raise'),equipment:'calf raise machine or dumbbells'}),null);
});
test('illustration matching accepts only actual catalog IDs and paths',()=>{
 const exercises=load('exercises');
 const catalog={exercises:[...new Set(exercises.map(e=>e.media?.catalog_id||STARTER_IMAGES[e.id]))].map(id=>({id,name_en:id,images:{flat:{start:`images/flat/${id}-start.webp`,peak:`images/flat/${id}-peak.webp`}}}))};
 const refs=matchVerifiedMedia(exercises,catalog);
 assert.equal(Object.keys(refs).length,102);
 assert(refs.neutral_grip_pulldown.start.includes('v-bar-lat-pulldown'));
 const removed={exercises:catalog.exercises.filter(e=>e.id!=='v-bar-lat-pulldown')};
 assert.equal(Object.keys(matchVerifiedMedia(exercises,removed)).length,101);
});
test('history counts actual completed workouts and charts by calendar month',()=>{
 const state=seed();
 state.sessions=[
 {status:'completed',started_at:'2026-08-06T14:00:00.000Z',completed_at:'2026-08-06T14:43:00.000Z',id:'a',category_id:'legs',entries:[{exercise_id:'hip_thrust_machine',sets:[{done:true,weight_kg:50,reps:10},{done:true,weight_kg:55,reps:8}]}]},
 {status:'completed',started_at:'2026-09-06T14:00:00.000Z',completed_at:'2026-09-06T14:33:00.000Z',id:'b',category_id:'legs',entries:[{exercise_id:'hip_thrust_machine',sets:[{done:true,weight_kg:60,reps:10}]}]},
 {status:'completed',started_at:'2026-10-06T14:00:00.000Z',completed_at:'2026-10-06T14:45:00.000Z',id:'c',category_id:'chest',entries:[{exercise_id:'barbell_bench_press',sets:[{done:true,weight_kg:40,reps:12}]}]},
 {status:'discarded',started_at:'2026-10-20T00:00:00.000Z',completed_at:null,id:'d',category_id:'legs',entries:[]}
 ];
 const all=completedSessions(state);
 assert.equal(all.length,3);
 assert.deepEqual(summarizeHistory(all),{workouts:3,sets:4,minutes:121});
 const bins=monthlyHistory(all,3,'2026-10-28');
 assert.deepEqual(bins.map(b=>b.workouts),[1,1,1]);
 assert.deepEqual(bins.map(b=>b.sets),[2,1,1]);
 assert.deepEqual(exerciseProgress(state,'hip_thrust_machine','weight','all','2026-10-28').map(x=>x.value),[55,60]);
 assert.deepEqual(exerciseProgress(state,'hip_thrust_machine','reps','all','2026-10-28').map(x=>x.value),[10,10]);
 assert.deepEqual(exerciseProgress(state,'hip_thrust_machine','weight','1m','2026-10-28'),[]);
});
