// Pull-only shared library. Never uploads local data to the repository.
// Source records have stable IDs. User edits, deletions, logged workouts and active plans win.
export const KINDS=['categories','exercises','routines'];
export const MAX_CATALOG_ITEMS={categories:250,exercises:2000,routines:1000};
const clone=x=>structuredClone(x);
const canonical=(record,kind)=>{
  const obj=clone(record);
  for(const key of ['revision','created_at','catalog_version','catalog_hash','source'])delete obj[key];
  return obj;
};
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export async function digest(record,kind){
  const str=JSON.stringify(stable(canonical(record,kind)));
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function emptyMap(){return {categories:{},exercises:{},routines:{}};}
function emptyDeleted(){return {categories:[],exercises:[],routines:[]};}
function initMeta(version=0){return {version,base:emptyMap(),deleted:emptyDeleted(),pending:emptyMap(),last_checked:null,last_result:null,dismissed:emptyMap(),aliases:{categories:{}}};}
export async function initializeNewCatalog(state,version){
  const m=initMeta(version);
  await Promise.all(KINDS.flatMap(kind=>state[kind].map(async item=>{m.base[kind][item.id]=await digest(item,kind);})));
  state.catalog=m;return m;
}
export async function migrateLegacyCatalog(state,baseline){
  if(state.catalog)return state.catalog;
  if(!baseline||KINDS.some(kind=>!baseline[kind]||typeof baseline[kind]!=='object'))throw new Error('Legacy catalog baseline unavailable; reconnect to finish migration');
  const m=initMeta(1);
  for(const kind of KINDS){
    m.base[kind]={...baseline[kind]};
    const localIds=new Set(state[kind].map(x=>x.id));
    for(const id of Object.keys(baseline[kind]))if(!localIds.has(id))m.deleted[kind].push(id);
  }
  state.catalog=m;return m;
}
export function markCatalogDelete(state,kind,id){
  if(!state.catalog?.base?.[kind]?.[id])return;
  if(!state.catalog.deleted[kind].includes(id))state.catalog.deleted[kind].push(id);
  delete state.catalog.pending[kind][id];
}
export function verifyCatalogPayload(payload){
  if(!payload||!Number.isSafeInteger(payload.version)||payload.version<1)throw new Error('Invalid shared library version');
  for(const kind of KINDS){
    const arr=payload[kind];
    if(!Array.isArray(arr)||arr.length>MAX_CATALOG_ITEMS[kind])throw new Error(`Unexpected ${kind} catalog`);
    const ids=arr.map(x=>x?.id);
    if(ids.some(x=>typeof x!=='string'||!x||x.length>160)||new Set(ids).size!==ids.length)throw new Error(`Duplicate/invalid ${kind} IDs`);
  }
  const cats=new Set(payload.categories.map(x=>x.id));
  const exercises=new Set(payload.exercises.map(x=>x.id));
  if(payload.routines.some(r=>!cats.has(r.category_id)||!Array.isArray(r.exercises)||r.exercises.length<1||r.exercises.length>20||r.exercises.some(s=>!exercises.has(s.exercise_id))))throw new Error('Shared routines contain unresolved references');
  if(payload.exercises.some(e=>!e.name||!Array.isArray(e.instructions)||e.instructions.length<1))throw new Error('Invalid shared exercise');
  return true;
}
// All mutations happen in a cloned state. Caller saves the clone once after checking the result.
export async function mergeCatalog(current,payload){
  verifyCatalogPayload(payload);
  if(!current.catalog)throw new Error('Catalog migration required first');
  const state=clone(current),meta=state.catalog;
  if(payload.version<meta.version)return {state,result:{version:meta.version,added:{categories:0,exercises:0,routines:0},updated:{categories:0,exercises:0,routines:0},pending:{categories:0,exercises:0,routines:0}}};
  meta.aliases||={categories:{}};meta.aliases.categories||={};
  for(const kind of KINDS){meta.base[kind]||={};meta.deleted[kind]||=[];meta.pending[kind]||={};meta.dismissed||=emptyMap();meta.dismissed[kind]||={};}
  const result={version:payload.version,added:{categories:0,exercises:0,routines:0},updated:emptyMap(),kept:emptyMap(),pending:emptyMap(),is_newer:payload.version>meta.version};
  for(const kind of KINDS){
    const arr=state[kind],known=new Map(arr.map((x,i)=>[x.id,i]));
    for(const original of payload[kind]){
      const item=clone(original);
      if(kind==='routines'&&meta.aliases.categories[item.category_id])item.category_id=meta.aliases.categories[item.category_id];
      const remoteHash=await digest(item,kind),idx=known.get(item.id),baseHash=meta.base[kind][item.id];
      if(meta.deleted[kind].includes(item.id))continue;
      if(idx===undefined){
        // If a historical catalog entry was intentionally deleted, never resurrect it.
        if(baseHash)continue;
        if(kind==='categories'){const sameName=arr.find(c=>String(c.display_name).trim().toLowerCase()===String(item.display_name).trim().toLowerCase());if(sameName){meta.aliases.categories[item.id]=sameName.id;meta.base.categories[item.id]=remoteHash;continue;}}
        const copy=clone(item);
        if(kind==='routines'){copy.revision=1;copy.created_at=new Date().toISOString();}
        known.set(copy.id,arr.length);arr.push(copy);meta.base[kind][copy.id]=remoteHash;result.added[kind]++;
        continue;
      }
      const existing=arr[idx],localHash=await digest(existing,kind);
      if(meta.dismissed[kind][item.id]===remoteHash)continue;
      if(remoteHash===baseHash){delete meta.pending[kind][item.id];continue;}
      if(!baseHash){
        // Local-only record collided with a new GitHub ID: local record always wins.
        if(localHash!==remoteHash){meta.pending[kind][item.id]={...clone(item),_catalog_remote_digest:remoteHash};result.pending[kind][item.id]=1;}
        continue;
      }
      const active=kind==='routines' && (state.activations.some(a=>a.routine_id===item.id&&(!a.stop_exclusive_date||a.stop_exclusive_date>new Date().toISOString().slice(0,10))) || state.sessions.some(s=>s.status==='in_progress'&&s.routine_id===item.id));
      if(localHash!==baseHash||active){
        // Preserve edits and currently used plans. Offer the revised shared routine as a copy.
        meta.pending[kind][item.id]={...clone(item),_catalog_remote_digest:remoteHash};result.pending[kind][item.id]=1;result.kept[kind][item.id]=1;
        continue;
      }
      const copy=clone(item);
      if(kind==='routines'){copy.revision=(existing.revision||1)+1;copy.created_at=existing.created_at||new Date().toISOString();}
      arr[idx]=copy;meta.base[kind][item.id]=remoteHash;
      delete meta.pending[kind][item.id];result.updated[kind][item.id]=1;
    }
  }
  meta.version=Math.max(meta.version,payload.version);
  meta.last_checked=new Date().toISOString();
  meta.last_result={version:meta.version,added:Object.fromEntries(KINDS.map(k=>[k,result.added[k]])),updated:Object.fromEntries(KINDS.map(k=>[k,Object.keys(result.updated[k]).length])),pending:Object.fromEntries(KINDS.map(k=>[k,Object.keys(meta.pending[k]).length]))};
  return {state,result:meta.last_result};
}
export function pendingRoutineCopies(state){return Object.entries(state.catalog?.pending?.routines||{}).map(([id,routine])=>({id,routine}));}
export function copyPendingRoutine(state,id,makeId){
  const src=state.catalog?.pending?.routines?.[id];if(!src)throw new Error('No pending shared routine');
  const record=clone(src);delete record._catalog_remote_digest;record.id=makeId('routine');record.name=`${record.name} (shared update)`;record.revision=1;record.variation='Custom';record.created_at=new Date().toISOString();
  state.routines.push(record);state.catalog.dismissed||=emptyMap();state.catalog.dismissed.routines[id]=state.catalog.pending.routines[id]._catalog_remote_digest||null;delete state.catalog.pending.routines[id];return record;
}
export async function fetchCatalog(){
  // Cache-busting + a service-worker network-first rule prevent stale manifest data.
  const nonce=`t=${Date.now()}`;
  const res=await fetch(`../data/catalog.json?${nonce}`,{cache:'no-store'});
  if(!res.ok)throw new Error('Could not reach shared library');
  const meta=await res.json();
  if(meta.catalog_schema!==1||!Number.isSafeInteger(meta.version))throw new Error('Unsupported shared library metadata');
  const files=await Promise.all(KINDS.map(async kind=>{
    const path=String(meta[kind]||'');
    if(!/^[a-z0-9_-]+\.json$/.test(path))throw new Error('Unexpected catalog file name');
    const response=await fetch(`../data/${path}?v=${meta.version}&${nonce}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Could not load ${kind} catalog`);
    return response.json();
  }));
  const payload={version:meta.version,...Object.fromEntries(KINDS.map((k,i)=>[k,files[i]]))};
  verifyCatalogPayload(payload);return payload;
}
