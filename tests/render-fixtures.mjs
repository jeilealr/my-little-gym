// Developer-only fixture to visually review history layouts without seeding real users.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeInitialState,createSession} from '../app/domain.mjs';
const root=new URL('..',import.meta.url).pathname;
const data=x=>JSON.parse(readFileSync(join(root,'data',x+'.json'),'utf8'));
const s=makeInitialState({categories:data('categories'),exercises:data('exercises'),routines:data('routines')});
let i=0;
for(let month=4;month<=9;month++){
 for(let day=0;day<3+(month%3);day++){
  const rid=['legs-a','chest-a','back-b','arms_shoulders-a'][i%4];
  const session=createSession(s,rid);
  const date=new Date(Date.UTC(2026,month,3+day*5,12,0,0));
  session.started_at=date.toISOString();session.completed_at=new Date(date.getTime()+(38+(i%18))*60000).toISOString();session.status='completed';
  for(const [eIndex,entry] of session.entries.entries())for(const [j,set] of entry.sets.entries()){
   set.done=true;set.weight_kg=Math.round((18+eIndex*9+i*1.7-j*2)*2)/2;set.reps=j===0?12:j===1?10:8;
  }
  // Make hip thrust progression unmistakable (but demo only).
  for(const entry of session.entries.filter(e=>e.exercise_id==='hip_thrust_machine'))for(const [j,set] of entry.sets.entries())set.weight_kg=45+(i/4|0)*2.5-j*2.5;
  i++;
 }
}
let backing=s;
const listeners={};
function dummy(id){return {id,innerHTML:'',value:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(type,cb){listeners[`${id}:${type}`]=cb;},click(){},setAttribute(){}};}
const nodes=Object.fromEntries(['main','toast','backup-file','exercise-photo','media-progress'].map(x=>[x,dummy(x)]));
Object.defineProperty(globalThis,'document',{value:{getElementById(id){return nodes[id]||(nodes[id]=dummy(id));},querySelectorAll(){return [];},addEventListener(type,cb){listeners[type]=cb;},createElement(){return {click(){}};}}});
Object.defineProperty(globalThis,'navigator',{value:{onLine:false}});
Object.defineProperty(globalThis,'location',{value:{protocol:'file:',hostname:'test'}});
globalThis.window={scrollTo(){}};globalThis.confirm=()=>true;
globalThis.fetch=async rel=>({ok:true,json:async()=>data(rel.split('/').at(-1).split('.')[0])});
globalThis.indexedDB={open(){
 const req={result:null,error:null};
 queueMicrotask(()=>{
  const db={objectStoreNames:{contains(){return true;}},createObjectStore(){},close(){},transaction(){
    const tx={error:null,oncomplete:null,onerror:null,objectStore(){return {
      get(){const q={result:null,onerror:null,onsuccess:null};queueMicrotask(()=>{q.result=backing;if(q.onsuccess)q.onsuccess();queueMicrotask(()=>{if(tx.oncomplete)tx.oncomplete();});});return q;},
      put(state){queueMicrotask(()=>{backing=structuredClone(state);if(tx.oncomplete)tx.oncomplete();});}
    };}};
    return tx;
  }};
  req.result=db;if(req.onsuccess)req.onsuccess();
 });
 return req;
}};
await import(pathToFileURL(join(root,'app/app.js')));
const pause=()=>new Promise(r=>setTimeout(r,15));
async function click(action,props={}){await listeners.click({target:{closest(){return {dataset:{action,...props}};}}});await pause();}
async function tab(which){await listeners.click({target:{closest(){return {dataset:{tab:which}};}}});await pause();}
await pause();await pause();
const css=readFileSync(join(root,'app/styles.css'),'utf8');
const original=readFileSync(join(root,'app/index.html'),'utf8');
const out=join(root,'tests/visual-fixtures');mkdirSync(out,{recursive:true});
function save(name){let html=original.replace('data-tab="workout" class="nav-item selected"','data-tab="workout" class="nav-item"').replace('data-tab="history" class="nav-item"','data-tab="history" class="nav-item selected"').replace('<link rel="stylesheet" href="styles.css" />',`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>','').replace(/<main id="main"[^>]*>[\s\S]*?<\/main>/,`<main id="main">${nodes.main.innerHTML}</main>`);writeFileSync(join(out,name+'.html'),html);console.log('saved',name,html.length);}
await tab('history');save('history-overview');
await click('view-trends');save('history-trends');
await tab('history');await click('history-detail',{id:s.sessions.at(-4).id});save('history-session');
await tab('history');await click('exercise-progress',{id:'hip_thrust_machine'});await click('progress-period',{value:'all'});save('history-exercise');
