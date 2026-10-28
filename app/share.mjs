// Routine-only interchange. Includes required category/exercise definitions but NO user history.
const clone=x=>structuredClone(x);
export const ROUTINE_SHARE_FORMAT='my-little-gym-routine';
export function exportRoutine(state,routineId){
  const routine=state.routines.find(r=>r.id===routineId);if(!routine)throw new Error('Routine not found');
  const category=state.categories.find(c=>c.id===routine.category_id);if(!category)throw new Error('Category not found');
  const exercises=routine.exercises.map(slot=>state.exercises.find(e=>e.id===slot.exercise_id));
  if(exercises.some(x=>!x))throw new Error('Routine contains an unknown exercise');
  return {format:ROUTINE_SHARE_FORMAT,version:1,exported_at:new Date().toISOString(),category:clone(category),
    routine:clone(routine),exercises:[...new Map(exercises.map(e=>[e.id,clone(e)])).values()]};
}
export function validateRoutineShare(payload){
  if(!payload||payload.format!==ROUTINE_SHARE_FORMAT||payload.version!==1)throw new Error('This is not a My Little Gym shared routine');
  const {routine,category,exercises}=payload;
  if(!category||!routine||!Array.isArray(exercises))throw new Error('Incomplete shared routine');
  if(!routine.id||typeof routine.name!=='string'||routine.name.length>120||!category.id||typeof category.display_name!=='string'||category.display_name.length>80)throw new Error('Invalid routine details');
  if(!Array.isArray(routine.exercises)||routine.exercises.length<1||routine.exercises.length>20||exercises.length>20)throw new Error('Unexpected number of exercises');
  const ids=exercises.map(e=>e?.id);if(new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||x.length>160))throw new Error('Invalid exercise IDs');
  if(routine.category_id!==category.id||routine.exercises.some(x=>!ids.includes(x.exercise_id)||!Number.isInteger(x.sets)||x.sets<1||x.sets>10))throw new Error('The shared routine has missing or invalid exercises');
  if(exercises.some(e=>typeof e.name!=='string'||e.name.length>120||!Array.isArray(e.instructions)||e.instructions.length>12))throw new Error('Invalid exercise details');
  if(JSON.stringify(payload).length>3_000_000)throw new Error('Shared routine is too large (3 MB maximum)');
  return true;
}
// This only adds a new routine and any missing exercises. It never mutates sessions or activations.
export function importRoutine(state,payload,makeId){
  validateRoutineShare(payload);
  const category=state.categories.find(c=>c.id===payload.category.id && c.display_name===payload.category.display_name)
    ||state.categories.find(c=>c.display_name.toLowerCase()===payload.category.display_name.toLowerCase());
  let categoryId=category?.id;
  if(!categoryId){const c=clone(payload.category);categoryId=makeId('category');c.id=categoryId;c.sort_order=state.categories.length+1;state.categories.push(c);}
  const idMap=new Map();let addedExercises=0;
  for(const source of payload.exercises){
    const found=state.exercises.find(e=>e.id===source.id && e.name===source.name && e.equipment===source.equipment);
    if(found){idMap.set(source.id,found.id);continue;}
    const e=clone(source);e.id=makeId('exercise');idMap.set(source.id,e.id);state.exercises.push(e);addedExercises++;
  }
  const r=clone(payload.routine);
  r.id=makeId('routine');r.category_id=categoryId;r.variation='Custom';r.revision=1;r.created_at=new Date().toISOString();
  if(state.routines.some(x=>x.category_id===categoryId&&x.name===r.name))r.name=`${r.name} (shared)`;
  r.exercises.forEach(slot=>slot.exercise_id=idMap.get(slot.exercise_id));
  state.routines.push(r);
  return {routine:r,addedExercises};
}
