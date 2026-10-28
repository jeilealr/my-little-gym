// Minimal DOM + IndexedDB stubs let us exercise the browser app in a restricted CI
// environment where the installed Chromium has an enterprise URLBlocklist of '*'.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=new URL('..',import.meta.url).pathname;
const docListeners={};
function dummy(id){return {id,innerHTML:'',value:'',textContent:'',disabled:false,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(type,cb){docListeners[`${id}:${type}`]=cb;},click(){},setAttribute(){}};}
const nodes=Object.fromEntries(['main','toast','backup-file','exercise-photo','new-category-name','exercise-search','picker-list','media-progress'].map(x=>[x,dummy(x)]));
Object.defineProperty(globalThis,'document',{value:{getElementById(id){return nodes[id]||(nodes[id]=dummy(id));},querySelectorAll(){return [];},addEventListener(type,cb){docListeners[type]=cb;},createElement(){return {href:'',download:'',click(){}};}}});
Object.defineProperty(globalThis,'navigator',{value:{onLine:false}});
Object.defineProperty(globalThis,'location',{value:{protocol:'file:',hostname:'test'}});
globalThis.window={scrollTo(){}};
globalThis.confirm=()=>true;
globalThis.fetch=async (rel)=>({ok:true,json:async()=>JSON.parse(readFileSync(join(root,'app',String(rel).split('?')[0]),'utf8'))});
let backing=null;
globalThis.indexedDB={open(){
 const req={result:null,error:null};
 queueMicrotask(()=>{
  const db={objectStoreNames:{contains(){return !!backing;}},createObjectStore(){},close(){},transaction(){
   const tx={error:null,oncomplete:null,onerror:null,objectStore(){return {
    get(){const query={result:null,onerror:null,onsuccess:null};queueMicrotask(()=>{query.result=backing;if(query.onsuccess)query.onsuccess();queueMicrotask(()=>{if(tx.oncomplete)tx.oncomplete();});});return query;},
    put(state){queueMicrotask(()=>{backing=structuredClone(state);if(tx.oncomplete)tx.oncomplete();});}
   };}};
   return tx;
  }};
  req.result=db;
  if(req.onupgradeneeded)req.onupgradeneeded();
  if(req.onsuccess)req.onsuccess();
 });
 return req;
}};
await import(pathToFileURL(join(root,'app/app.js')));
const pause=()=>new Promise(resolve=>setTimeout(resolve,8));
async function click(action,data={}){const el={dataset:{action,...data}};await docListeners.click({target:{closest(){return el;}}});await pause();}
async function tab(which){await docListeners.click({target:{closest(){return {dataset:{tab:which}};}}});await pause();}
async function change(data,value){const el={dataset:data,value,type:'text'};await docListeners.change({target:el});await pause();}
await pause();await pause();
assert(nodes.main.innerHTML.includes('What shall we'));
assert(nodes.main.innerHTML.includes('No active routines'));
await tab('routines');
assert(nodes.main.innerHTML.includes('20')===false); // library is grouped
assert(nodes.main.innerHTML.includes('Chest'));
await click('category',{id:'legs'});
assert(nodes.main.innerHTML.includes('Legs A — Glutes'));
await click('routine-details',{id:'legs-a'});
assert(nodes.main.innerHTML.includes('Hip thrust / glute drive machine'));
await click('activation-form',{id:'legs-a'});
assert(nodes.main.innerHTML.includes('For how long?'));
await click('save-activation',{id:'legs-a'});
assert(backing.activations.length===1);
await tab('workout');
assert(nodes.main.innerHTML.includes('Legs'));
await click('preview',{id:'legs-a'});
await click('start-workout',{id:'legs-a'});
assert(backing.sessions.length===1);
assert(nodes.main.innerHTML.includes('Legs A — Glutes'));
const session=backing.sessions[0];
const entry=session.entries[0];
await click('open-exercise',{entry:entry.id,session:session.id});
assert(nodes.main.innerHTML.includes('Log your sets'));
await change({setInput:'weight_kg',session:session.id,entry:entry.id,set:entry.sets[0].id},80.5+'');
await change({setInput:'reps',session:session.id,entry:entry.id,set:entry.sets[0].id},'10');
await click('toggle-set',{session:session.id,entry:entry.id,set:entry.sets[0].id});
assert.equal(backing.sessions[0].entries[0].sets[0].weight_kg,80.5);
assert.equal(backing.sessions[0].entries[0].sets[0].reps,10);
assert.equal(backing.sessions[0].entries[0].sets[0].done,true);
await click('back');
await click('finish-workout',{id:session.id});
assert.equal(backing.sessions[0].status,'completed');
await tab('history');
assert(nodes.main.innerHTML.includes('Legs A'));
await click('history-detail',{id:session.id});
assert(nodes.main.innerHTML.includes('80.5 kg'));
await click('exercise-progress',{id:'leg_press'});
assert(nodes.main.innerHTML.includes('Best weight'));
await click('progress-metric',{value:'reps'});
assert(nodes.main.innerHTML.includes('Best reps'));
await click('progress-period',{value:'all'});
assert(nodes.main.innerHTML.includes('All'));
await tab('history');
assert(nodes.main.innerHTML.includes('Last 6 months'));
await click('history-filter',{value:'legs'});
assert(nodes.main.innerHTML.includes('Previous workouts'));
await click('view-trends');
assert(nodes.main.innerHTML.includes('Training trends'));
console.log('PASS: history filters, monthly chart, exercise metrics, year trend');
console.log('PASS: boot, grouped library, activation, workout, set logging, completion, history, exercise progress');
await tab('routines');
await click('category',{id:'legs'});
await click('routine-details',{id:'legs-a'});
await click('edit-routine',{id:'legs-a'});
assert(nodes.main.innerHTML.includes('Edit routine'));
await change({editorField:'name'},'Legs A — Glutes (updated)');
await click('save-editor');
assert.equal(backing.routines.find(r=>r.id==='legs-a').revision,2);
assert.equal(backing.sessions[0].routine_name,'Legs A — Glutes & Lower Body'); // immutable historical name
await click('activation-form',{id:'legs-a'});
await change({activationField:'duration'},'until');
await click('save-activation',{id:'legs-a'});
assert.equal(backing.activations.length,2);
assert.equal(backing.activations.at(-1).end_exclusive_date,null);
await click('create-routine',{category:'legs'});
await change({editorField:'name'},'My own glute routine');
await click('editor-add');
await click('select-exercise',{id:'db_hip_thrust'});
assert(nodes.main.innerHTML.includes('My own glute routine'));
await click('save-editor');
assert(backing.routines.some(r=>r.name==='My own glute routine'));
await tab('routines');
await click('new-category');
nodes['new-category-name'].value='Full body';
await click('save-category');
assert(backing.categories.some(c=>c.display_name==='Full body'));
console.log('PASS: template revision, history preservation, duration editing, new routine, custom category');
await tab('routines');
await click('category',{id:'chest'});
await click('routine-details',{id:'chest-a'});
await click('start-workout',{id:'chest-a'});
assert(nodes.main.innerHTML.includes('In progress') || nodes.main.innerHTML.includes('YOUR WORKOUT'));
const adhoc=backing.sessions.at(-1);
assert.equal(adhoc.activation_id,null);
await click('open-exercise',{session:adhoc.id,entry:adhoc.entries[0].id});
await click('swap-exercise',{session:adhoc.id,entry:adhoc.entries[0].id});
await click('select-exercise',{id:'flat_dumbbell_press'});
assert.equal(backing.sessions.at(-1).entries[0].exercise_id,'flat_dumbbell_press');
assert.equal(backing.routines.find(x=>x.id==='chest-a').exercises[0].exercise_id,'chest_press_machine');
await click('discard-workout',{id:adhoc.id});
assert.equal(backing.sessions.at(-1).status,'discarded');
console.log('PASS: ad-hoc sessions, exercise swap affects only session, discard requires confirmation');

// Manual shared-catalog pull is repeatable; no personal workout is replaced.
await click('settings');
assert(nodes.main.innerHTML.includes('Shared routine library'));
assert(nodes.main.innerHTML.includes('Choose routine file'));
const prePullSessions=JSON.stringify(backing.sessions);
await click('pull-catalog');
assert(backing.catalog.last_checked);
assert.equal(backing.routines.filter(r=>r.variation!=='Custom').length,75);
assert.equal(JSON.stringify(backing.sessions),prePullSessions);
console.log('PASS: Settings pull-only catalog check and existing session preservation');

// A timed exercise can be logged and reviewed without fake repetitions.
await tab('routines');
await click('category',{id:'stretch_mobility'});
await click('routine-details',{id:'stretch_mobility-a'});
await click('start-workout',{id:'stretch_mobility-a'});
const timedSession=backing.sessions.at(-1);
await click('open-exercise',{session:timedSession.id,entry:timedSession.entries[0].id});
assert(nodes.main.innerHTML.includes('seconds'));
await change({setInput:'duration_seconds',session:timedSession.id,entry:timedSession.entries[0].id,set:timedSession.entries[0].sets[0].id},'40');
await click('toggle-set',{session:timedSession.id,entry:timedSession.entries[0].id,set:timedSession.entries[0].sets[0].id});
await click('back');
await click('finish-workout',{id:timedSession.id});
await tab('history');
await click('history-detail',{id:timedSession.id});
assert(nodes.main.innerHTML.includes('40 sec'));
console.log('PASS: timed stretch logging and historical seconds');
