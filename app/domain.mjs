export const SCHEMA_VERSION = 3;
export const TODAY_DEFAULT_WEEKS = 4;
export const deepClone = (x) => structuredClone(x);
export const uid = (prefix = 'id') => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function addDays(ymd, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error('Expected YYYY-MM-DD');
  const [y,m,d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y,m-1,d+Number(days)));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth()+1).padStart(2,'0')}-${String(utc.getUTCDate()).padStart(2,'0')}`;
}
export function activationEnd(start, duration, customEndInclusive = '') {
  if (duration === 'until') return null;
  if (duration === 'custom') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customEndInclusive) || customEndInclusive < start) throw new Error('End date must be on or after start date');
    return addDays(customEndInclusive,1);
  }
  const n = Number(duration);
  if (!Number.isInteger(n) || n < 1 || n > 104) throw new Error('Invalid number of weeks');
  return addDays(start, n * 7);
}
export function effectiveEnd(a) {
  const dates = [a.end_exclusive_date, a.stop_exclusive_date].filter(Boolean);
  return dates.length ? dates.sort()[0] : null;
}
export function activationState(a, today = localDate()) {
  const end = effectiveEnd(a);
  if (end && end <= a.start_date) return 'expired'; // explicitly superseded before it began
  if (a.start_date > today) return 'scheduled';
  if (end && today >= end) return 'expired';
  return 'active';
}
export function activeForCategory(state, categoryId, today = localDate()) {
  return state.activations.filter(a => a.category_id === categoryId && activationState(a,today) === 'active')
    .sort((a,b) => b.start_date.localeCompare(a.start_date))[0] || null;
}
export function scheduledForCategory(state, categoryId, today = localDate()) {
  return state.activations.filter(a => a.category_id===categoryId && activationState(a,today)==='scheduled')
    .sort((a,b)=>a.start_date.localeCompare(b.start_date))[0] || null;
}
export function activationsVisible(state, today = localDate()) {
  const ids = [...new Set(state.activations.map(a=>a.category_id))];
  return ids.flatMap(id => [activeForCategory(state,id,today),scheduledForCategory(state,id,today)].filter(Boolean));
}
export function progressText(a, today = localDate()) {
  if (activationState(a,today) === 'scheduled') return `Starts ${formatDate(a.start_date)}`;
  if (activationState(a,today) === 'expired') return 'Finished · choose again anytime';
  const weeks = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${a.start_date}T00:00:00Z`)) / (7*86400000)) + 1;
  const end = effectiveEnd(a);
  const count = end ? Math.max(1,Math.ceil((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${a.start_date}T00:00:00Z`))/(7*86400000))) : null;
  return count ? `Week ${weeks} of ${count}` : `Week ${weeks} · until changed`;
}
export function formatDate(ymd) {
  if (!ymd) return '';
  const [y,m,d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d));
}
export function createActivation(state, {routineId,startDate,duration='4',customEnd=''}) {
  const routine = state.routines.find(r=>r.id===routineId);
  if (!routine) throw new Error('Routine not found');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error('Choose a valid start date');
  const end = activationEnd(startDate,duration,customEnd);
  // A newly chosen routine supersedes all old, overlapping or later activations of this category.
  // Older records are retained to explain history, but stop at the replacement start date.
  for (const prev of state.activations.filter(a=>a.category_id===routine.category_id)) {
    const prevEnd = effectiveEnd(prev);
    if (prev.start_date >= startDate) {
      prev.stop_exclusive_date = prev.start_date; // future/same-day booking superseded (zero duration)
    } else if (!prevEnd || prevEnd > startDate) {
      prev.stop_exclusive_date = startDate;
    }
  }
  const activation = {id:uid('activation'),routine_id:routine.id,routine_revision:routine.revision||1,
    category_id:routine.category_id,start_date:startDate,end_exclusive_date:end,stop_exclusive_date:null,
    duration_mode:duration,created_at:new Date().toISOString()};
  state.activations.push(activation);
  return activation;
}
export function deactivate(state, activationId, today = localDate()) {
  const a = state.activations.find(a=>a.id===activationId);
  if (!a) throw new Error('Activation not found');
  a.stop_exclusive_date = a.start_date>today?a.start_date:today;
}
export function createSession(state, routineId, today = localDate()) {
  const routine = state.routines.find(r=>r.id===routineId);
  if (!routine) throw new Error('Routine missing');
  const category = state.categories.find(c=>c.id===routine.category_id);
  const activation = activeForCategory(state,routine.category_id,today);
  const entry = (slot,index) => {
    const ex = state.exercises.find(e=>e.id===slot.exercise_id);
    if (!ex) throw new Error(`Exercise ${slot.exercise_id} missing`);
    return {id:uid('entry'),exercise_id:ex.id,exercise_name:ex.name,exercise_equipment:ex.equipment,
      exercise_load_kind:ex.logging?.load_kind||'machine_or_total_load', exercise_mode:ex.logging?.mode||'reps',
      slot_snapshot:deepClone(slot), order:index, skipped:false,
      sets:Array.from({length:slot.sets},(_,i)=>({id:uid('set'),number:i+1,weight_kg:null,reps:null,duration_seconds:null,done:false,completed_at:null}))};
  };
  const session = {id:uid('session'),status:'in_progress',routine_id:routine.id,routine_revision:routine.revision||1,
    routine_name:routine.name,category_id:routine.category_id,category_name:category?.display_name||'Custom',
    activation_id:activation?.routine_id===routine.id ? activation.id : null,
    started_at:new Date().toISOString(),completed_at:null,notes:'',
    entries:routine.exercises.map(entry)};
  state.sessions.push(session);
  return session;
}
export function sessionFinished(session) {
  session.status = 'completed';
  session.completed_at = new Date().toISOString();
  return session;
}
export function sessionSummary(session) {
  const sets = session.entries.flatMap(e=>e.sets.filter(s=>s.done));
  const trained = session.entries.filter(e=>e.sets.some(s=>s.done)).length;
  const durationMinutes = Math.max(1,Math.round((new Date(session.completed_at || Date.now()).getTime() - new Date(session.started_at).getTime())/60000));
  return {sets:sets.length,exercises:trained,minutes:durationMinutes};
}
export function lastSets(state, exerciseId, excludeSessionId='') {
  return state.sessions.filter(s=>s.id!==excludeSessionId && s.status==='completed')
    .sort((a,b)=>b.started_at.localeCompare(a.started_at))
    .flatMap(s=>s.entries.filter(e=>e.exercise_id===exerciseId)
      .map(e=>({session:s,sets:e.sets.filter(set=>set.done)})))
    .find(r=>r.sets.length) || null;
}
export function bestSeries(state, exerciseId) {
  const out=[];
  for (const s of state.sessions.filter(s=>s.status==='completed').sort((a,b)=>a.started_at.localeCompare(b.started_at))) {
    const logged=s.entries.filter(e=>e.exercise_id===exerciseId).flatMap(e=>e.sets.filter(set=>set.done && typeof set.weight_kg==='number'));
    if (!logged.length) continue;
    out.push({date:s.started_at.slice(0,10),value:Math.max(...logged.map(x=>x.weight_kg)),sessionId:s.id});
  }
  return out;
}
export function makeInitialState({categories, exercises, routines}) {
  const templates = routines.map(r=>({...deepClone(r),revision:1,created_at:new Date().toISOString()}));
  return {schemaVersion:SCHEMA_VERSION,created_at:new Date().toISOString(),categories:deepClone(categories),exercises:deepClone(exercises),
    routines:templates,activations:[],sessions:[],mediaRefs:{},preferences:{restTimer:true,restSeconds:90,language:'en',weightUnit:'kg'}};
}
export function validateBackup(data) {
  if (!data || typeof data!=='object' || data.schemaVersion!==SCHEMA_VERSION) throw new Error(`This app imports version ${SCHEMA_VERSION} backups only`);
  for (const key of ['categories','exercises','routines','activations','sessions']) {
    if (!Array.isArray(data[key])) throw new Error(`Backup is missing ${key}`);
    const ids=data[key].map(x=>x?.id);
    if (ids.some(x=>typeof x!=='string'||!x) || new Set(ids).size!==ids.length) throw new Error(`${key} contains invalid or duplicate IDs`);
  }
  if (data.sessions.some(s=>!['completed','in_progress','discarded'].includes(s.status)||!Array.isArray(s.entries))) throw new Error('Backup has invalid workouts');
  if (data.routines.some(r=>!Array.isArray(r.exercises) || !r.category_id)) throw new Error('Backup has invalid routines');
  if (data.exercises.some(e=>!e.name || !Array.isArray(e.instructions))) throw new Error('Backup has invalid exercises');
  if (JSON.stringify(data).length>25_000_000) throw new Error('Backup is too large (max 25 MB)');
  return true;
}
