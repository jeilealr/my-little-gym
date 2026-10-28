import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeInitialState,createActivation,createSession,sessionFinished,validateBackup} from '../app/domain.mjs';
import {digest,initializeNewCatalog,migrateLegacyCatalog,mergeCatalog,markCatalogDelete,copyPendingRoutine,pendingRoutineCopies} from '../app/catalog.mjs';
import {exportRoutine,validateRoutineShare,importRoutine} from '../app/share.mjs';
const read=(name)=>JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`,import.meta.url),'utf8'));
const future={version:2,categories:read('categories'),exercises:read('exercises'),routines:read('routines')};
const baseline=read('catalog-v1-fingerprints');
const oldCatalog=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-v0.1.json',import.meta.url),'utf8'));
const oldState=()=>makeInitialState(oldCatalog);
function makeSession(state){const s=createSession(state,state.routines[0].id);s.entries[0].sets[0].weight_kg=25;s.entries[0].sets[0].reps=10;s.entries[0].sets[0].done=true;sessionFinished(s);return s;}

test('legacy baseline matches original v0.1 seed hashes, not the v0.2 changed defaults',async()=>{
 for(const kind of ['categories','exercises','routines']){
  for(const rec of oldCatalog[kind])assert.equal(await digest(rec,kind),baseline[kind][rec.id],`${kind}/${rec.id}`);
 }
});

test('migration from v0.1 preserves user sessions, categories and locally edited plans',async()=>{
 const state=oldState();const session=makeSession(state);const original=JSON.stringify(session);
 state.categories.push({id:'local-extra',display_name:'My Dance Cardio',color:'#eeeeee',sort_order:11});
 const customized=state.routines.find(x=>x.id==='chest-a');assert(customized);customized.exercises[0].sets=4;
 const priorCount=state.routines.length;
 await migrateLegacyCatalog(state,baseline);
 const merged=await mergeCatalog(state,future);
 assert.equal(merged.result.added.routines,55);
 assert.equal(merged.result.added.exercises,60);
 assert.equal(merged.result.added.categories,11);
 assert.equal(merged.state.categories.length,16);
 assert.equal(merged.state.routines.length,priorCount+55);
 assert.equal(merged.state.routines.find(x=>x.id==='chest-a').exercises[0].sets,4);
 assert.equal(merged.state.sessions.length,1);
 assert.equal(JSON.stringify(merged.state.sessions[0]),original);
 assert.equal(merged.state.catalog.version,2);
 assert.equal(merged.state.categories.find(x=>x.id==='local-extra').display_name,'My Dance Cardio');
 validateBackup(merged.state);
});

test('edited shared routine is offered as separate copy after catalog revision, original not overwritten',async()=>{
 const state=oldState();const orig=state.routines.find(x=>x.id==='chest-a');orig.name+=' my changes';
 await migrateLegacyCatalog(state,baseline);
 const newPayload=structuredClone(future);newPayload.routines.find(x=>x.id==='chest-a').description+=' EDITION 2';
 const merged=await mergeCatalog(state,newPayload);
 const entry=pendingRoutineCopies(merged.state).find(x=>x.id==='chest-a');
 assert(entry);assert(merged.state.routines.find(x=>x.id==='chest-a').name.endsWith('my changes'));
 const copied=copyPendingRoutine(merged.state,'chest-a',()=> 'some-fresh-id');
 assert.equal(copied.id,'some-fresh-id');
 assert.equal(merged.state.routines.find(x=>x.id==='chest-a').name,orig.name);
 assert(!pendingRoutineCopies(merged.state).some(x=>x.id==='chest-a'));
});

test('local deletion never resurrects a shared routine on pull',async()=>{
 const state=oldState();await migrateLegacyCatalog(state,baseline);markCatalogDelete(state,'routines','chest-a');state.routines=state.routines.filter(x=>x.id!=='chest-a');
 const merged=await mergeCatalog(state,future);
 assert(!merged.state.routines.some(r=>r.id==='chest-a'));
});

test('same-name category made locally does not produce a second shared category and incoming routines use it',async()=>{
 const state=oldState();state.categories.push({id:'local-full',display_name:'Full Body',color:'#f0f0f0'});
 await migrateLegacyCatalog(state,baseline);
 const merged=await mergeCatalog(state,future);
 assert.equal(merged.state.categories.filter(c=>c.display_name==='Full Body').length,1);
 assert.equal(merged.state.routines.filter(r=>r.category_id==='local-full').length,5);
});

test('repeated pulls of the same version are idempotent',async()=>{
 const state=oldState();await migrateLegacyCatalog(state,baseline);
 const first=await mergeCatalog(state,future);
 const second=await mergeCatalog(first.state,future);
 for(const kind of ['categories','exercises','routines'])assert.equal(second.result.added[kind],0,kind);
 assert.equal(second.state.routines.length,75);
 assert.equal(second.state.exercises.length,102);
});

test('new installation initializes directly from v0.2 shared catalog',async()=>{
 const state=makeInitialState(future);await initializeNewCatalog(state,2);
 const merged=await mergeCatalog(state,future);
 assert.equal(merged.result.added.routines,0);
 assert.equal(merged.state.routines.length,75);
 assert.equal(merged.state.catalog.version,2);
});

test('routine sharing carries no workout history and imports without overwriting existing information',()=>{
 const source=oldState();makeSession(source);source.activations.push({id:'a1',routine_id:'chest-a'});
 const exported=exportRoutine(source,'chest-a');validateRoutineShare(exported);
 const content=JSON.stringify(exported);
 assert(!content.includes('sessions'));
 assert(!content.includes('activations'));
 assert(!content.includes('25'));
 const dest=oldState();const recent=makeSession(dest);const oldCount=dest.routines.length;
 let idx=0;const result=importRoutine(dest,exported,(prefix)=>`foreign-${prefix}-${++idx}`);
 assert.equal(dest.routines.length,oldCount+1);
 assert.equal(dest.sessions.length,1);
 assert.equal(dest.sessions[0].id,recent.id);
 assert(result.routine.name.includes('(shared)'));
 assert(dest.routines.some(r=>r.id===result.routine.id));
});

test('timed exercises record duration without a weight or reps requirement',()=>{
 const state=makeInitialState(future);
 const routine=state.routines.find(x=>x.id==='stretch_mobility-a');
 const session=createSession(state,routine.id);
 assert.equal(session.entries[0].exercise_mode,'time');
 const set=session.entries[0].sets[0];set.duration_seconds=35;set.done=true;
 sessionFinished(session);
 assert.equal(set.duration_seconds,35);
 assert.equal(set.reps,null);
});
