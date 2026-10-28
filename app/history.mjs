// Read-only aggregations derived solely from completed workout snapshots.
// There are no pre-seeded or fabricated personal results.
export const completedSessions = state => (state.sessions||[]).filter(s=>s.status==='completed').sort((a,b)=>b.started_at.localeCompare(a.started_at));
export function summarizeHistory(sessions) {
 const result={workouts:sessions.length,sets:0,minutes:0};
 for(const s of sessions){
  result.sets+=s.entries.flatMap(e=>e.sets).filter(set=>set.done).length;
  result.minutes+=Math.max(1,Math.round((Date.parse(s.completed_at||s.started_at)-Date.parse(s.started_at))/60000));
 }
 return result;
}
function monthKeyFromOffset(ymd, offset){
 const [y,m]=ymd.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+offset,1));
 return d.toISOString().slice(0,7);
}
export function monthlyHistory(sessions, count=6, asOf='2026-10-28') {
 const bins=[];
 for(let i=count-1;i>=0;i--) {
  const key=monthKeyFromOffset(asOf,-i), d=new Date(`${key}-01T00:00:00Z`);
  const subset=sessions.filter(s=>s.started_at.slice(0,7)===key);
  const totals=summarizeHistory(subset);
  bins.push({key,label:d.toLocaleString('en-GB',{month:'short',timeZone:'UTC'}),...totals});
 }
 return bins;
}
export function exerciseProgress(state,exerciseId,metric='weight',period='3m',asOf='2026-10-28') {
 const allowed={ '1m':1,'3m':3,'6m':6,'1y':12,'all':null };
 if(!(period in allowed))throw new Error('Unknown time range');
 if(!['weight','reps','duration'].includes(metric))throw new Error('Unknown progress metric');
 const threshold=allowed[period]===null?'0000-00-00':monthKeyFromOffset(asOf,-allowed[period]).concat('-').concat(asOf.slice(8));
 return completedSessions(state).filter(s=>s.started_at.slice(0,10)>=threshold)
 .flatMap(s=>s.entries.filter(e=>e.exercise_id===exerciseId).map(e=>{
  const done=e.sets.filter(x=>x.done && ((Number.isInteger(x.reps)&&x.reps>=0)||(Number.isInteger(x.duration_seconds)&&x.duration_seconds>0)));
  const weighted=done.filter(x=>typeof x.weight_kg==='number' && Number.isFinite(x.weight_kg));
  if(!done.length)return null;
  const bestWeight=weighted.length?Math.max(...weighted.map(x=>x.weight_kg)):null;
  const bestReps=Math.max(0,...done.filter(x=>Number.isInteger(x.reps)).map(x=>x.reps));
  const timed=done.filter(x=>Number.isInteger(x.duration_seconds)&&x.duration_seconds>0);
  const bestDuration=timed.length?Math.max(...timed.map(x=>x.duration_seconds)):null;
  return {date:s.started_at.slice(0,10),sessionId:s.id,value:metric==='weight'?bestWeight:metric==='duration'?bestDuration:bestReps,bestWeight,bestReps,bestDuration,sets:done.length};
 })).filter(x=>x!==null && x.value!==null).reverse();
}
