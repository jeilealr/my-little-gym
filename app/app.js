import {SCHEMA_VERSION,uid,deepClone,localDate,addDays,activationEnd,effectiveEnd,activationState,activeForCategory,activationsVisible,progressText,formatDate,createActivation,deactivate,createSession,sessionFinished,sessionSummary,lastSets,bestSeries,makeInitialState,validateBackup} from './domain.mjs';
import {loadState,saveState} from './db.mjs';
import {fetchVerifiedMedia,cacheIllustrations,imageUrl,MEDIA_NOTES} from './media.mjs';
import {completedSessions,summarizeHistory,monthlyHistory,exerciseProgress} from './history.mjs';

const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=s=>String(s||'').length>80?String(s).slice(0,80):String(s||'');
const exImg=(ex,pose='start')=> {
 const ref=S?.mediaRefs?.[ex?.id];
 if(ex?.media?.custom_data_url)return ex.media.custom_data_url;
 return imageUrl(ref,pose)||'assets/exercise-placeholder.svg';
};
const catIcon=id=>({chest:'🏋️',legs:'🍑',back:'🔷',arms_shoulders:'💪'})[id]||'✦';
const getCat=id=>S.categories.find(c=>c.id===id);
const getRoutine=id=>S.routines.find(r=>r.id===id);
const getEx=id=>S.exercises.find(e=>e.id===id);
const getSession=id=>S.sessions.find(s=>s.id===id);
const catColor=c=> /^#[0-9a-f]{6}$/i.test(c?.color||'')?c.color:'#f5ebf1';
const mediaHTML=(ex,cls='exercise-thumb',pose='start')=>`<img class="${cls}" data-exercise-image="${escapeHtml(ex?.id||'')}" data-pose="${pose}" alt="${escapeHtml(ex?.name||'Exercise')} ${pose==='peak'?'finish':'starting'} position" src="${escapeHtml(exImg(ex,pose))}" onerror="this.onerror=null;this.src='assets/exercise-placeholder.svg'" loading="lazy">`;
const chip=s=>`<span class="chip">${escapeHtml(s)}</span>`;
const fmtWeight=w=>w===null||w===undefined||w===''?'—':`${Number(w).toLocaleString('en-GB',{maximumFractionDigits:2})} kg`;
const fmtSets=sets=>sets.filter(s=>s.done).map(s=>`${s.weight_kg===null?'BW':fmtWeight(s.weight_kg)} × ${s.reps}`).join(' · ')||'No completed sets';
const today=()=>localDate();
let S=null, tab='workout', page='home', ctx={}, stack=[], draftRoutine=null, activationDraft=null, exerciseDraft=null, pickerMode=null, mediaRefreshing=false,toastTimer=0,restEndsAt=null,restInterval=null,historyFilter='all',historyShowAll=false,progressPeriod='3m',progressMetric='weight',imageUploadTarget=null;
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
async function persist(){try{await saveState(S);}catch(e){console.error(e);toast('Could not save. Export a backup and check storage.');}}
function route(next,params={}){stack.push({tab,page,ctx});page=next;ctx=params;render();}
function homePage(t){return ({workout:'home',routines:'routines',history:'history'})[t];}
function switchTab(next){tab=next;page=homePage(next);ctx={};stack=[];render();}
function back(){if(stack.length){const prev=stack.pop();tab=prev.tab;page=prev.page;ctx=prev.ctx;}else{page=homePage(tab);ctx={};}render();}
function goTo(next,params={}){stack=[];page=next;ctx=params;render();}
function backHeader(title){return `<div class="back-row"><button class="back-link" data-action="back" aria-label="Go back">‹ Back</button><span class="small-text">${escapeHtml(title||'')}</span></div>`;}
const coloredCard=(category,name,description,action,payload='')=>`<button class="list-row tap-area" data-action="${action}" ${payload} style="background:${catColor(category)}"><span class="dot-icon" style="background:#ffffff88">${catIcon(category.id)}</span><span class="card-copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(description)}</small></span><span class="chev">›</span></button>`;
function currentSession(){return S.sessions.find(s=>s.status==='in_progress')||null;}
function routineLines(r,session=null,interactive=true){return r.exercises.map((slot,i)=>{
 const ex=getEx(slot.exercise_id)||{id:slot.exercise_id,name:'Missing exercise',equipment:''};
 const entry=session?.entries[i];
 const done=entry?.sets.filter(s=>s.done).length||0;
 const detail=`${slot.sets} sets · ${slot.reps_min}–${slot.reps_max} reps${slot.priority==='optional'?' · Optional':''}`;
 return `<button class="exercise-row" data-action="${session?'open-exercise':'view-exercise-info'}" data-index="${i}" data-ex-id="${escapeHtml(ex.id)}" ${interactive?'':'disabled'}><span class="exercise-index">${i+1}</span>${mediaHTML(ex)}<span class="card-copy"><strong>${escapeHtml(ex.name)}</strong><small>${detail}</small>${session?`<small>${entry?.skipped?'Skipped':done?`${done} of ${entry.sets.length} sets completed`:'Ready to log'}</small>`:''}</span>${session&&done&&done===entry.sets.length?'<span class="complete-mark">✓</span>':'<span class="chev">›</span>'}</button>`;
}).join('');}
function viewHome(){
 const activations=activationsVisible(S).filter(a=>activationState(a)==='active');
 const inProgress=currentSession();
 let html=`<p class="eyebrow">YOUR TRAINING · NO FIXED SCHEDULE</p><h1 class="page-title">What shall we<br>train today?</h1><p class="subtitle">Choose any active routine, whenever you're ready.</p>`;
 if(inProgress)html+=`<div class="info-box green"><strong>You have an unfinished workout</strong><p>${escapeHtml(inProgress.routine_name)} · your logged sets are saved.</p><button class="primary" data-action="resume-workout" data-id="${inProgress.id}">Resume workout</button></div>`;
 if(!activations.length)html+=`<div class="no-content"><span class="symbol">🌷</span><strong>No active routines yet</strong><p>Your library already has 20 routines. Pick a few you like, and choose how long to use them.</p><button class="primary" data-action="go-routines">Explore my routines</button></div>`;
 else {
  html+=`<div class="grid-2">`;
  for(const a of activations){const r=getRoutine(a.routine_id),c=getCat(a.category_id);if(!r||!c)continue;
   html+=`<button class="category-card" style="background:${catColor(c)}" data-action="preview" data-id="${r.id}"><span class="cat-icon">${catIcon(c.id)}</span><strong>${escapeHtml(c.display_name)}</strong><small>${escapeHtml(r.variation?`Routine ${r.variation}`:r.name)} · ${progressText(a)}</small><small>${r.exercises.length} exercises · ~${r.estimated_minutes?.min||30}–${r.estimated_minutes?.max||55} min</small></button>`;
  }
  html+=`</div><div class="section-heading"><h2>Want a different workout?</h2><button class="inline-action" data-action="go-routines">Routine library ›</button></div><p class="subtitle">Change any routine without affecting the others, or start a different saved routine.</p>`;
 }
 html+=`<div class="info-box green"><strong>Keep it simple</strong><p>Start with a comfortable weight, note your repetitions, and aim for controlled movements. You can shorten or extend any workout.</p></div>`;
 return html;
}
function viewPreview(){const r=getRoutine(ctx.id),c=getCat(r?.category_id);if(!r)return notFound();
 return `${backHeader('Workout preview')}<p class="eyebrow">${escapeHtml(c?.display_name||'Workout')}</p><h1 class="page-title small">${escapeHtml(r.name)}</h1><p class="subtitle">${escapeHtml(r.description||'')} · About ${r.estimated_minutes?.min||30}–${r.estimated_minutes?.max||55} minutes, flexible.</p>${routineLines(r)}<div class="info-box green">Warm up for 5–8 minutes and try one or two lighter practice sets. The fourth exercise is optional.</div><button class="primary" data-action="start-workout" data-id="${r.id}">Start workout</button><button class="secondary" data-action="activation-form" data-id="${r.id}">Select as active routine</button>`;
}
function viewSession(){const session=getSession(ctx.id);if(!session)return notFound();
 const r=getRoutine(session.routine_id); const complete=session.entries.flatMap(e=>e.sets).filter(s=>s.done).length;
 const total=session.entries.flatMap(e=>e.sets).length;
 // Never use current template for the in-progress UI: it may have changed after session began.
 const lines=session.entries.map((entry,i)=>{
 const ex=getEx(entry.exercise_id)||{id:entry.exercise_id,name:entry.exercise_name};
 const count=entry.sets.filter(s=>s.done).length;
 return `<button class="exercise-row" data-action="open-exercise" data-entry="${entry.id}">${mediaHTML(ex)}<span class="card-copy"><strong>${i+1}. ${escapeHtml(entry.exercise_name)}</strong><small>${entry.sets.length} sets · ${entry.slot_snapshot.reps_min}–${entry.slot_snapshot.reps_max} reps${entry.slot_snapshot.priority==='optional'?' · optional':''}</small><small>${entry.skipped?'Skipped':`${count} of ${entry.sets.length} completed`}</small></span>${count&&count===entry.sets.length?'<span class="complete-mark">✓</span>':'<span class="chev">›</span>'}</button>`;
 }).join('');
 return `${backHeader('In progress')}<p class="eyebrow">YOUR WORKOUT</p><h1 class="page-title small">${escapeHtml(session.routine_name)}</h1><p class="subtitle">${complete} of ${total} sets complete · You can take as long as you need.</p><div class="card" style="padding:10px">${lines}</div><div class="form-row"><label for="workout-notes">Notes (optional)</label><textarea id="workout-notes" data-session-notes="${session.id}" placeholder="How did this session feel?">${escapeHtml(session.notes)}</textarea></div><button class="primary" data-action="finish-workout" data-id="${session.id}">Finish workout</button><button class="ghost" data-action="discard-workout" data-id="${session.id}">Discard this session</button><p class="footer-note">Every completed set is saved to your phone immediately.</p>`;
}
function viewExercise(){
 const session=ctx.sessionId?getSession(ctx.sessionId):null;
 const entry=session?.entries.find(e=>e.id===ctx.entryId);
 const ex=getEx(entry?.exercise_id||ctx.exerciseId);
 if(!ex && !entry)return notFound();
 const name=entry?.exercise_name||ex.name;
 const ref=S.mediaRefs[ex?.id];
 const available=!!(ex?.media?.custom_data_url||ref);
 const mediaNote=MEDIA_NOTES[ex?.id];
 const tips=(ex?.instructions||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('');
 let html=`${backHeader('Exercise details')}<h1 class="page-title small">${escapeHtml(name)}</h1><div class="pill-row">${chip(ex?.equipment||entry?.exercise_equipment||'Gym exercise')}${chip((ex?.primary_muscles||[]).join(', ').replaceAll('_',' '))}</div><div class="exercise-hero"><div>${mediaHTML(ex,'', 'start')}<span class="media-label">${available?'Start position':'Illustration pending'}</span></div><div>${mediaHTML(ex,'','peak')}<span class="media-label">${available?'Finish position':'See form tips below'}</span></div></div><div class="info-box"><strong>How to perform it</strong><ul>${tips||'<li>Ask a trainer to demonstrate this movement.</li>'}</ul>${mediaNote?`<p class="hint">Illustration note: ${escapeHtml(mediaNote)}</p>`:''}${!available?'<p><strong>Image required:</strong> no approved illustration has been found for this exercise. Add your own photo using the button below.</p>':''}</div>${!available?`<button class="secondary" data-action="upload-existing-photo" data-id="${escapeHtml(ex?.id||'')}">Add illustration for this exercise</button>`:''}`;
 const last=lastSets(S,entry?.exercise_id||ex.id,session?.id);
 if(last)html+=`<div class="info-box green"><strong>Last time · ${formatDate(last.session.started_at.slice(0,10))}</strong><p>${escapeHtml(fmtSets(last.sets))}</p></div>`;
 if(session&&entry){
  html+=`<div class="section-heading"><h2>Log your sets</h2><span class="badge green">kg · reps</span></div>`;
  html+=`<div class="set-header"><span>Set</span><span>${entry.exercise_load_kind==='per_dumbbell'?'Kg / dumbbell':'Weight (kg)'}</span><span>Reps</span><span>Done</span></div>`;
  entry.sets.forEach((set,i)=>{
   html+=`<div class="set-line"><span class="set-number">${i+1}</span><input aria-label="Set ${i+1} weight in kilograms" class="inline-input" type="number" step="0.25" min="0" max="2000" inputmode="decimal" placeholder="—" data-set-input="weight_kg" data-session="${session.id}" data-entry="${entry.id}" data-set="${set.id}" value="${set.weight_kg??''}"><input aria-label="Set ${i+1} repetitions" class="inline-input" type="number" step="1" min="0" max="300" inputmode="numeric" placeholder="—" data-set-input="reps" data-session="${session.id}" data-entry="${entry.id}" data-set="${set.id}" value="${set.reps??''}"><button class="set-check ${set.done?'done':''}" aria-label="${set.done?'Unmark':'Complete'} set ${i+1}" data-action="toggle-set" data-session="${session.id}" data-entry="${entry.id}" data-set="${set.id}">${set.done?'✓':'○'}</button></div>`;
  });
  html+=`<button class="secondary" data-action="add-set" data-session="${session.id}" data-entry="${entry.id}">+ Add set</button><div class="row-between" style="margin-top:10px"><span id="rest-label" class="small-text">${restEndsAt&&restEndsAt>Date.now()?`Rest · ${Math.ceil((restEndsAt-Date.now())/1000)} s`:'Optional rest timer'}</span><button class="inline-action" data-action="${restEndsAt&&restEndsAt>Date.now()?'stop-rest':'start-rest'}" data-seconds="${entry.slot_snapshot.rest_seconds||90}">${restEndsAt&&restEndsAt>Date.now()?'Stop timer':`Start ${entry.slot_snapshot.rest_seconds||90}s`}</button></div><div class="row-between" style="margin-top:16px"><button class="inline-action" data-action="swap-exercise" data-entry="${entry.id}" data-session="${session.id}">Swap exercise</button><button class="inline-action" data-action="skip-exercise" data-entry="${entry.id}" data-session="${session.id}">${entry.skipped?'Unskip':'Skip exercise'}</button></div>`;
  html+=`<button class="primary" data-action="back">Back to workout</button>`;
 } else html+=`<button class="primary" data-action="back">Back to routine</button>`;
 return html;
}
function viewFinished(){const session=getSession(ctx.id);if(!session)return notFound();const m=sessionSummary(session);
 return `<p class="eyebrow">SESSION SAVED</p><div style="text-align:center;font-size:60px;margin-top:28px">🌼</div><h1 class="page-title" style="text-align:center">Workout complete!</h1><p class="subtitle" style="text-align:center">${escapeHtml(session.routine_name)}</p><div class="history-summary"><div class="metric"><strong>${m.exercises}</strong><small>exercises</small></div><div class="metric"><strong>${m.sets}</strong><small>sets</small></div><div class="metric"><strong>${m.minutes}</strong><small>minutes</small></div></div><div class="info-box green">Saved locally, including every completed set and your notes. See them anytime in History.</div><button class="primary" data-action="history-detail" data-id="${session.id}">View summary</button><button class="secondary" data-action="go-home">Back to workouts</button>`;
}
function viewRoutines(){
 const active=activationsVisible(S);
 let html=`<p class="eyebrow">YOUR TRAINING, YOUR PACE</p><h1 class="page-title">My Routines</h1><p class="subtitle">Choose a routine for each area and decide when to change it.</p><div class="section-heading"><h2>My active routines</h2><span class="badge green">${active.length} selected</span></div>`;
 if(!active.length)html+=`<div class="no-content"><span class="symbol">🌱</span><strong>Nothing active yet</strong><p>Open the library below to select your first routine. Start dates and durations are entirely up to you.</p></div>`;
 else for(const a of active){const r=getRoutine(a.routine_id),c=getCat(a.category_id);if(!r||!c)continue;
  html+=coloredCard(c,r.name,`${progressText(a)} · ${activationState(a)==='scheduled'?'Scheduled':'Current'}`,'manage-activation',`data-id="${a.id}"`);
 }
 html+=`<div class="section-heading"><h2>Routine library</h2><button class="inline-action" data-action="new-category">+ Category</button></div>`;
 for(const c of [...S.categories].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))){const count=S.routines.filter(r=>r.category_id===c.id).length;
  html+=coloredCard(c,c.display_name,`${count} ${count===1?'routine':'routines'} · tap to explore`,'category',`data-id="${c.id}"`);
 }
 html+=`<button class="secondary" data-action="create-routine">+ Create a new routine</button><p class="footer-note">All your routines are editable. Your past workout records won't change.</p>`;
 return html;
}
function viewCategory(){const c=getCat(ctx.id);if(!c)return notFound();const routines=S.routines.filter(r=>r.category_id===c.id);
 let html=`${backHeader('Routine library')}<p class="eyebrow">${routines.length} ROUTINES</p><h1 class="page-title small">${escapeHtml(c.display_name)}</h1><p class="subtitle">Browse the variations, choose one, and set how long you want to follow it.</p>`;
 for(const r of routines){html+=`<button class="list-row" data-action="routine-details" data-id="${r.id}"><span class="dot-icon" style="background:${catColor(c)}">${catIcon(c.id)}</span><span class="card-copy"><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(r.description)}</small><small class="meta">${r.exercises.length} exercises · ~${r.estimated_minutes?.min||30}–${r.estimated_minutes?.max||55} min</small></span><span class="chev">›</span></button>`;}
 html+=`<button class="secondary" data-action="create-routine" data-category="${c.id}">+ New ${escapeHtml(c.display_name)} routine</button>`;
 return html;
}
function viewRoutine(){const r=getRoutine(ctx.id);const c=getCat(r?.category_id);if(!r)return notFound();const current=activeForCategory(S,r.category_id);
 let html=`${backHeader('Routine library')}<p class="eyebrow">${escapeHtml(c?.display_name)} · ROUTINE ${escapeHtml(r.variation||'CUSTOM')}</p><h1 class="page-title small">${escapeHtml(r.name)}</h1><p class="subtitle">${escapeHtml(r.description||'')} · About ${r.estimated_minutes?.min||30}–${r.estimated_minutes?.max||55} min</p>${routineLines(r)}`;
 if(current?.routine_id===r.id)html+=`<div class="info-box green">✓ This routine is active · ${progressText(current)}</div>`;
 html+=`<button class="primary" data-action="activation-form" data-id="${r.id}">Activate routine</button><button class="secondary" data-action="start-workout" data-id="${r.id}">Train this routine once</button><button class="secondary" data-action="edit-routine" data-id="${r.id}">Edit exercises and sets</button><button class="ghost" data-action="duplicate-routine" data-id="${r.id}">Duplicate routine</button><button class="inline-action" style="display:block;margin:17px auto" data-action="delete-routine" data-id="${r.id}">Delete from library</button>`;
 return html;
}
function viewActivation(){const r=getRoutine(ctx.id);if(!r)return notFound();if(!activationDraft)activationDraft={start:today(),duration:'4',custom:''};
 const opts=[['2','2 weeks'],['4','4 weeks'],['6','6 weeks'],['8','8 weeks'],['until','Until I change it'],['custom','Custom end date']];
 return `${backHeader('Activate routine')}<p class="eyebrow">SELECT YOUR ROUTINE</p><h1 class="page-title small">${escapeHtml(r.name)}</h1><p class="subtitle">This changes only the ${escapeHtml(getCat(r.category_id)?.display_name)} routine. Other training areas stay as they are.</p><div class="form-row"><label for="activation-start">Start date</label><input id="activation-start" type="date" data-activation-field="start" value="${activationDraft.start}"></div><div class="form-label">For how long?</div><div class="option-list">${opts.map(([v,t])=>`<label class="option"><input type="radio" name="duration" data-activation-field="duration" value="${v}" ${activationDraft.duration===v?'checked':''}><span>${t}</span></label>`).join('')}</div>${activationDraft.duration==='custom'?`<div class="form-row"><label for="custom-end">Last active day</label><input id="custom-end" type="date" data-activation-field="custom" min="${activationDraft.start}" value="${activationDraft.custom}"></div>`:''}<button class="primary" data-action="save-activation" data-id="${r.id}">Activate this routine</button><p class="footer-note">You may change, extend or deactivate it later. No automatic rotation.</p>`;
}
function viewManage(){const a=S.activations.find(x=>x.id===ctx.id);if(!a)return notFound();const r=getRoutine(a.routine_id),c=getCat(a.category_id);if(!r)return notFound();const end=effectiveEnd(a);
 return `${backHeader('Manage active routine')}<p class="eyebrow">${escapeHtml(c?.display_name||'Category')}</p><h1 class="page-title small">${escapeHtml(r.name)}</h1><div class="card"><div class="row-between"><strong>${escapeHtml(progressText(a))}</strong><span class="badge ${activationState(a)==='active'?'green':'muted'}">${activationState(a)}</span></div><p class="small-text">Started: ${formatDate(a.start_date)}</p><p class="small-text">${end?`Last active day: ${formatDate(addDays(end,-1))}`:'No planned end date'}</p></div><button class="primary" data-action="manage-change" data-category="${r.category_id}">Change to another routine</button><button class="secondary" data-action="manage-duration" data-id="${a.id}">Change duration</button><button class="ghost" data-action="deactivate" data-id="${a.id}">Deactivate routine</button><p class="hint">The completed workouts from this routine always remain in History.</p>`;
}
function viewDuration(){const a=S.activations.find(x=>x.id===ctx.id);if(!a)return notFound();if(!activationDraft)activationDraft={start:a.start_date,duration:a.duration_mode||'until',custom:effectiveEnd(a)?addDays(effectiveEnd(a),-1):''};
 return `${backHeader('Edit duration')}<h1 class="page-title small">Change routine duration</h1><p class="subtitle">Original start: ${formatDate(a.start_date)}. You can extend it or let it continue indefinitely.</p><div class="option-list">${[['2','2 weeks from start'],['4','4 weeks from start'],['6','6 weeks from start'],['8','8 weeks from start'],['until','Until I change it'],['custom','Custom end date']].map(([v,t])=>`<label class="option"><input type="radio" name="duration" data-activation-field="duration" value="${v}" ${activationDraft.duration===v?'checked':''}>${t}</label>`).join('')}</div>${activationDraft.duration==='custom'?`<div class="form-row"><label>Last active day</label><input type="date" data-activation-field="custom" min="${a.start_date}" value="${activationDraft.custom}"></div>`:''}<button class="primary" data-action="save-duration" data-id="${a.id}">Save duration</button>`;
}
function viewEditor(){const r=draftRoutine;if(!r)return notFound();const c=getCat(r.category_id);
 const cats=S.categories.map(x=>`<option value="${x.id}" ${r.category_id===x.id?'selected':''}>${escapeHtml(x.display_name)}</option>`).join('');
 let html=`${backHeader('Routine editor')}<h1 class="page-title small">${ctx.new?'Create routine':'Edit routine'}</h1><div class="form-row"><label>Routine name</label><input data-editor-field="name" maxlength="80" value="${escapeHtml(r.name)}" placeholder="e.g. Legs · Glute focus"></div><div class="form-row"><label>Category</label><select data-editor-field="category_id">${cats}</select></div><div class="form-row"><label>Short description (optional)</label><textarea data-editor-field="description" maxlength="240">${escapeHtml(r.description||'')}</textarea></div><div class="section-heading"><h2>Exercises</h2><span class="badge">${r.exercises.length}</span></div>`;
 r.exercises.forEach((slot,i)=>{
  const ex=getEx(slot.exercise_id);
  html+=`<div class="card" style="margin-bottom:12px"><div class="card-row">${mediaHTML(ex)}<div class="card-copy"><strong>${escapeHtml(ex?.name||'Missing exercise')}</strong><small>${escapeHtml(ex?.equipment||'')}</small></div></div><div class="slot-edit"><div><span class="small-text">Sets</span><input data-editor-slot="sets" data-index="${i}" type="number" min="1" max="10" value="${slot.sets}"></div><div><span class="small-text">Min reps</span><input data-editor-slot="reps_min" data-index="${i}" type="number" min="1" max="50" value="${slot.reps_min}"></div><div><span class="small-text">Max reps</span><input data-editor-slot="reps_max" data-index="${i}" type="number" min="1" max="50" value="${slot.reps_max}"></div></div><div class="mini-actions"><button class="mini-btn" data-action="move-slot" data-index="${i}" data-dir="-1" ${i===0?'disabled':''}>↑ Move</button><button class="mini-btn" data-action="move-slot" data-index="${i}" data-dir="1" ${i===r.exercises.length-1?'disabled':''}>↓ Move</button><button class="mini-btn" data-action="editor-swap" data-index="${i}">Swap</button><button class="mini-btn warn" data-action="remove-slot" data-index="${i}">Remove</button></div></div>`;
 });
 html+=`<button class="secondary" data-action="editor-add">+ Add an exercise</button><button class="primary" data-action="save-editor">Save routine</button><p class="footer-note">Edits increase the routine revision. Previous workouts remain unchanged.</p>`;
 return html;
}
function viewPicker(){return `${backHeader('Exercise library')}<h1 class="page-title small">Choose an exercise</h1><p class="subtitle">Search by name or equipment. You can also add your own.</p><div class="form-row"><input id="exercise-search" type="search" placeholder="Search exercise or equipment" aria-label="Search exercises" autocomplete="off"></div><div id="picker-list">${pickerItems('')}</div><button class="secondary" data-action="new-exercise">+ Create custom exercise</button>`;}
function pickerItems(query){const s=String(query||'').trim().toLowerCase();const items=S.exercises.filter(e=>`${e.name} ${e.name_de||''} ${e.equipment} ${(e.primary_muscles||[]).join(' ')}`.toLowerCase().includes(s)).slice(0,80);
 if(!items.length)return '<div class="no-content">No exercises found. Create your own below.</div>';
 return items.map(e=>`<button class="list-row" data-action="select-exercise" data-id="${e.id}">${mediaHTML(e)}<span class="card-copy"><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.equipment)}</small></span><span class="chev">+</span></button>`).join('');
}
function viewExerciseCreate(){if(!exerciseDraft)exerciseDraft={name:'',name_de:'',equipment:'',primary_muscles:[],instructions:['',''],logging:{load_kind:'machine_or_total_load'},media:{}};
 return `${backHeader('Exercise library')}<h1 class="page-title small">New exercise</h1><p class="subtitle">Give the exercise a name and add a picture showing the correct movement. Pictures are required.</p><div class="form-row"><label>Name</label><input data-exercise-create="name" value="${escapeHtml(exerciseDraft.name)}" maxlength="100" placeholder="e.g. Cable glute kickback"></div><div class="form-row"><label>Equipment (optional)</label><input data-exercise-create="equipment" value="${escapeHtml(exerciseDraft.equipment)}" maxlength="100" placeholder="e.g. Cable station"></div><div class="form-row"><label>Technique cue 1</label><input data-exercise-create="instruction0" value="${escapeHtml(exerciseDraft.instructions[0]||'')}" maxlength="220" placeholder="Starting position"></div><div class="form-row"><label>Technique cue 2</label><input data-exercise-create="instruction1" value="${escapeHtml(exerciseDraft.instructions[1]||'')}" maxlength="220" placeholder="Movement and finishing position"></div><div class="form-row"><label>How should weight be logged?</label><select data-exercise-create="load_kind"><option value="machine_or_total_load" ${exerciseDraft.logging.load_kind==='machine_or_total_load'?'selected':''}>Total / machine weight</option><option value="per_dumbbell" ${exerciseDraft.logging.load_kind==='per_dumbbell'?'selected':''}>Weight per dumbbell</option><option value="bodyweight" ${exerciseDraft.logging.load_kind==='bodyweight'?'selected':''}>Bodyweight / optional kg</option></select></div><button class="secondary" data-action="upload-exercise-photo">${exerciseDraft.media.custom_data_url?'✓ Photo added':'Add required exercise picture'}</button><button class="primary" data-action="save-exercise">Save exercise</button>`;
}
function viewCategoryCreate(){return `${backHeader('Routines')}<h1 class="page-title small">New category</h1><p class="subtitle">For future full-body, upper/lower or any kind of workout.</p><div class="form-row"><label for="new-category-name">Category name</label><input id="new-category-name" maxlength="40" placeholder="e.g. Full Body"></div><button class="primary" data-action="save-category">Create category</button>`;}
function filterPills(selected,options,action){
 return `<div class="history-filters" role="group" aria-label="History filters">${options.map(x=>`<button type="button" class="history-pill ${x.id===selected?'chosen':''}" data-action="${action}" data-value="${escapeHtml(x.id)}">${escapeHtml(x.label)}</button>`).join('')}</div>`;
}
function activityBars(bins,key='workouts'){
 const max=Math.max(1,...bins.map(x=>x[key]));
 return `<div class="history-bars" role="img" aria-label="${key==='sets'?'Completed sets':'Completed workouts'} by month: ${bins.map(b=>`${b.label} ${b[key]}`).join(', ')}">${bins.map(b=>`<div class="bar-column" title="${escapeHtml(`${b.label}: ${b[key]} ${key}`)}"><span class="bar-value">${b[key]||''}</span><span class="bar-track"><span class="bar-fill" style="height:${Math.max(b[key]?7:0,Math.round(100*b[key]/max))}%"></span></span><small>${escapeHtml(b.label)}</small></div>`).join('')}</div>`;
}
function viewHistory(){
 const all=completedSessions(S),sessions=historyFilter==='all'?all:all.filter(s=>s.category_id===historyFilter);
 const totals=summarizeHistory(sessions);
 const cFilter=[{id:'all',label:'All'},...S.categories.map(c=>({id:c.id,label:c.display_name.replace(' & Shoulders','')}))];
 let html=`<p class="eyebrow">SMALL STEPS ADD UP</p><h1 class="page-title">History</h1><p class="subtitle">Every completed workout, kept even if you change routines.</p>${filterPills(historyFilter,cFilter,'history-filter')}`;
 if(!all.length)return html+`<div class="no-content"><span class="symbol">📖</span><strong>Your history begins here</strong><p>Finish your first workout to see your real training progress. No sample entries will be added to your phone.</p><button class="primary" data-action="go-home">See my workouts</button></div>`;
 html+=`<div class="history-summary"><div class="metric"><strong>${totals.workouts}</strong><small>Workouts</small></div><div class="metric"><strong>${totals.sets}</strong><small>Completed sets</small></div><div class="metric"><strong>${totals.minutes}</strong><small>Total minutes</small></div></div>`;
 html+=`<div class="history-panel"><div class="row-between"><strong>Last 6 months</strong><button class="inline-action" data-action="view-trends">Yearly view ›</button></div><p class="small-text">Workouts per month</p>${activityBars(monthlyHistory(sessions,6,today()))}</div>`;
 html+=`<div class="section-heading"><h2>Previous workouts</h2><span class="badge muted">${sessions.length}</span></div>`;
 if(!sessions.length)html+=`<div class="no-content"><strong>No workouts in this category yet</strong><p>Choose another filter to explore your history.</p></div>`;
 const shown=historyShowAll?sessions:sessions.slice(0,6);
 for(const s of shown){const c=getCat(s.category_id),m=sessionSummary(s);
  html+=`<button class="list-row" data-action="history-detail" data-id="${escapeHtml(s.id)}"><span class="dot-icon" style="background:${catColor(c)}">${catIcon(s.category_id)}</span><span class="card-copy"><strong>${escapeHtml(s.routine_name)}</strong><small>${formatDate(s.started_at.slice(0,10))} · ${m.minutes} min · ${m.sets} sets</small></span><span class="chev">›</span></button>`;
 }
 if(sessions.length>6)html+=`<button class="secondary" data-action="history-more">${historyShowAll?'Show recent only':`Show all ${sessions.length} workouts`}</button>`;
 html+=`<p class="hint">Tap a workout, then any exercise, to see its progress across months.</p>`;
 return html;
}
function viewHistoryDetail(){const session=getSession(ctx.id);if(!session)return notFound();const m=sessionSummary(session);
 let html=`${backHeader('Workout history')}<p class="eyebrow">${formatDate(session.started_at.slice(0,10))}</p><h1 class="page-title small">${escapeHtml(session.routine_name)}</h1><div class="history-summary"><div class="metric"><strong>${m.exercises}</strong><small>Exercises</small></div><div class="metric"><strong>${m.sets}</strong><small>Sets</small></div><div class="metric"><strong>${m.minutes}</strong><small>Minutes</small></div></div>`;
 for(const entry of session.entries){
  const done=entry.sets.filter(s=>s.done);if(!done.length)continue;
  const ex=getEx(entry.exercise_id)||{name:entry.exercise_name,id:entry.exercise_id};
  html+=`<button class="list-row" data-action="exercise-progress" data-id="${escapeHtml(entry.exercise_id)}">${mediaHTML(ex)}<span class="card-copy"><strong>${escapeHtml(entry.exercise_name)}</strong><small>${escapeHtml(fmtSets(done))}</small><small class="meta">Tap for exercise progress over time</small></span><span class="chev">›</span></button>`;
 }
 if(session.notes)html+=`<div class="info-box">${escapeHtml(session.notes)}</div>`;
 return html;
}
function lineChart(series,unit){
 if(!series.length)return '<div class="no-content"><p>No results for this period and metric yet. Choose All or another metric.</p></div>';
 const numbers=series.map(x=>x.value);let min=Math.min(...numbers),max=Math.max(...numbers);
 const spread=Math.max(2,max-min);min=Math.max(0,Math.floor(min-spread*.18));max=Math.ceil(max+spread*.18);
 if(min===max)max+=2;
 const pos=(i)=>24+i*(292/Math.max(1,series.length-1));
 const y=v=>138-105*(v-min)/(max-min);
 const positions=series.map((e,i)=>[pos(i),y(e.value)]);
 const pts=positions.map(p=>p.join(',')).join(' ');
 const start=series[0].date.slice(5),end=series.at(-1).date.slice(5);
 return `<svg class="progress-chart" role="img" aria-label="${unit} progression, ${series.length} recorded sessions, from ${series[0].value} to ${series.at(-1).value}" viewBox="0 0 350 174" preserveAspectRatio="xMidYMid meet">${[0,1,2,3].map(i=>{const yy=33+i*35;return `<line x1="24" y1="${yy}" x2="319" y2="${yy}" stroke="#eee6eb" stroke-width="1"/>`;}).join('')}<polyline points="${pts}" fill="none" stroke="#d9568c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${positions.map(([x,yy])=>`<circle cx="${x}" cy="${yy}" r="4.6" fill="#e05e8d" stroke="#fff" stroke-width="2"/>`).join('')}<text x="25" y="158" font-size="11" fill="#897c8a">${escapeHtml(start)}</text><text x="319" y="158" text-anchor="end" font-size="11" fill="#897c8a">${escapeHtml(end)}</text><text x="25" y="17" font-size="11" fill="#7c6f7d">${escapeHtml(unit)}</text></svg>`;
}
function viewExerciseProgress(){
 const ex=getEx(ctx.id),complete=completedSessions(S);
 const history=complete.flatMap(s=>s.entries.filter(e=>e.exercise_id===ctx.id).map(e=>({session:s,sets:e.sets.filter(x=>x.done)}))).filter(x=>x.sets.length);
 const name=ex?.name||history[0]?.session.entries.find(e=>e.exercise_id===ctx.id)?.exercise_name||'Exercise';
 const all=exerciseProgress(S,ctx.id,progressMetric,'all',today());
 const visible=exerciseProgress(S,ctx.id,progressMetric,progressPeriod,today());
 const unit=progressMetric==='weight'?'kg':'reps';
 let html=`${backHeader('History')}<h1 class="page-title small">${escapeHtml(name)}</h1><p class="subtitle">Your actual logged sets, independent of which routine you used.</p>`;
 html+=filterPills(progressMetric,[{id:'weight',label:'Best weight'},{id:'reps',label:'Best reps'}],'progress-metric');
 html+=`<div class="history-panel">${filterPills(progressPeriod,[{id:'1m',label:'1M'},{id:'3m',label:'3M'},{id:'6m',label:'6M'},{id:'1y',label:'1Y'},{id:'all',label:'All'}],'progress-period')}<p class="small-text">${progressMetric==='weight'?'Heaviest completed set each session. Compare repetitions below to judge progress fairly.':'Highest repetitions completed in any set each session.'}</p>${lineChart(visible,unit)}`;
 if(all.length>1){const first=all[0],latest=all.at(-1);const delta=latest.value-first.value;
  html+=`<div class="history-summary"><div class="metric"><strong>${first.value}</strong><small>First ${unit}</small></div><div class="metric"><strong>${delta>0?'+':''}${Number(delta.toFixed(2))}</strong><small>Change ${unit}</small></div><div class="metric"><strong>${latest.value}</strong><small>Latest ${unit}</small></div></div>`;
 }
 html+=`</div><div class="section-heading"><h2>Previous sessions</h2><span class="badge muted">${history.length}</span></div>`;
 for(const x of history.slice(0,20))html+=`<button class="list-row" data-action="history-detail" data-id="${escapeHtml(x.session.id)}"><span class="card-copy"><strong>${formatDate(x.session.started_at.slice(0,10))}</strong><small>${escapeHtml(fmtSets(x.sets))}</small></span><span class="chev">›</span></button>`;
 if(history.length>20)html+='<p class="hint">Showing 20 most recent sessions. All records are preserved in your backup.</p>';
 return html;
}
function viewTrends(){
 const sessions=completedSessions(S),bins=monthlyHistory(sessions,12,today());
 const totals=summarizeHistory(sessions);
 return `${backHeader('History')}<p class="eyebrow">OVER TIME</p><h1 class="page-title small">Training trends</h1><p class="subtitle">A simple overview of how consistently you train. More sessions do not always mean better results.</p><div class="history-summary"><div class="metric"><strong>${totals.workouts}</strong><small>All workouts</small></div><div class="metric"><strong>${totals.sets}</strong><small>All sets</small></div><div class="metric"><strong>${totals.minutes}</strong><small>Total minutes</small></div></div><div class="history-panel"><strong>Workouts by month</strong>${activityBars(bins,'workouts')}</div><div class="history-panel"><strong>Completed sets by month</strong>${activityBars(bins,'sets')}</div><p class="hint">Charts show your own saved workouts only, and do not depend on routine-rotation dates.</p>`;
}
function viewSettings(){const loaded=S.exercises.filter(e=>e.media?.custom_data_url||S.mediaRefs?.[e.id]).length;
 const missing=S.exercises.filter(e=>!e.media?.custom_data_url&&!S.mediaRefs?.[e.id]);
 return `${backHeader('Settings')}<h1 class="page-title small">Settings & backup</h1><div class="section-heading"><h2>Your data stays with you</h2></div><div class="card"><strong>Export a backup</strong><p class="small-text">Download all routines, edits, activations and workout logs as a JSON file. Keep it somewhere safe.</p><button class="secondary" data-action="export-backup">Export my data</button></div><div class="card"><strong>Import a backup</strong><p class="small-text">Restores an exported file. You'll review and confirm before replacing any existing data.</p><button class="secondary" data-action="import-backup">Choose backup file</button></div><div class="section-heading"><h2>Exercise illustrations</h2></div><div class="card"><strong>Illustrations found: <span id="media-count">${loaded}</span> / ${S.exercises.length}</strong><p class="small-text">Every exercise needs a clear image. The 42 starter movements now have curated source mappings. Check them here, then download images over Wi-Fi before training offline. If an image is missing, add a verified photo yourself.</p><button class="secondary" data-action="refresh-media" ${mediaRefreshing?'disabled':''}>Find exercise illustrations</button><button class="ghost" data-action="cache-images">Download found illustrations for offline use</button><p class="hint" id="media-progress">Image requests contact the image provider; personal workout logs are never sent there.</p>${missing.length?`<div class="missing-exercises"><strong>${missing.length} images still need attention</strong>${missing.map(e=>`<button class="list-row" data-action="upload-existing-photo" data-id="${escapeHtml(e.id)}"><span class="card-copy">${escapeHtml(e.name)}<small>Add my photo</small></span><span class="chev">＋</span></button>`).join('')}</div>`:'<div class="info-box green"><strong>All exercise images mapped</strong><p>Cache them for offline use, then verify by opening them once on your iPhone.</p></div>'}</div><div class="section-heading"><h2>About</h2></div><div class="card"><p class="small-text">My Little Gym · personal, independent app · Leipzig Thomaskirche. No account, ads, paid features or analytics.</p><p class="small-text">Exercise illustrations, when available: <a href="https://repdb.co" rel="noopener noreferrer" target="_blank">Exercise data by RepDB (repdb.co)</a>, free tier with attribution. Illustrations may contain errors; follow movement cues and ask a trainer if unsure.</p><p class="small-text">Your records stay in this browser on this device. Clearing website data or reinstalling may remove them. Export backups regularly.</p><p class="small-text">Install from Safari: Share → Add to Home Screen → Open as Web App. A publicly accessible HTTPS site is required to install.</p></div>`;
}
function notFound(){return `${backHeader('')}<h1 class="page-title small">Not found</h1><p class="subtitle">This item isn't available anymore.</p><button class="primary" data-action="go-home">Go to workouts</button>`;}
function render(){
 const views={home:viewHome,preview:viewPreview,session:viewSession,exercise:viewExercise,finished:viewFinished,routines:viewRoutines,category:viewCategory,routine:viewRoutine,activate:viewActivation,manage:viewManage,duration:viewDuration,editor:viewEditor,picker:viewPicker,'exercise-create':viewExerciseCreate,'category-create':viewCategoryCreate,history:viewHistory,'history-detail':viewHistoryDetail,'exercise-progress':viewExerciseProgress,trends:viewTrends,settings:viewSettings};
 const func=views[page]||notFound;
 $('main').innerHTML=func();
 document.querySelectorAll('[data-tab]').forEach(btn=>{
  btn.classList.toggle('selected',btn.dataset.tab===tab);
  btn.setAttribute('aria-current',btn.dataset.tab===tab?'page':'false');
 });
 window.scrollTo({top:0,behavior:'instant'});
}
function getSet(target){const session=getSession(target.dataset.session),entry=session?.entries.find(e=>e.id===target.dataset.entry),set=entry?.sets.find(s=>s.id===target.dataset.set);return {session,entry,set};}
async function act(action,el){
 const id=el.dataset.id,entryId=el.dataset.entry,sessionId=el.dataset.session;
 switch(action){
  case 'settings':route('settings');return;
  case 'start-rest':{const n=Number(el.dataset.seconds)||90;restEndsAt=Date.now()+n*1000;clearInterval(restInterval);restInterval=setInterval(()=>{if(!restEndsAt)return;const remaining=Math.ceil((restEndsAt-Date.now())/1000);const label=$('rest-label');if(label)label.textContent=remaining>0?`Rest · ${remaining} s`:'Rest finished';if(remaining<=0){restEndsAt=null;clearInterval(restInterval);toast('Rest finished');}},1000);render();return;}
  case 'stop-rest':{restEndsAt=null;clearInterval(restInterval);render();return;}
  case 'back':back();return;
  case 'go-home':switchTab('workout');return;
  case 'go-routines':switchTab('routines');return;
  case 'preview':route('preview',{id});return;
  case 'resume-workout':route('session',{id});return;
  case 'start-workout': {
   if(currentSession()){toast('Finish or discard your current workout first');route('session',{id:currentSession().id});return;}
   const session=createSession(S,id);await persist();tab='workout';goTo('session',{id:session.id});return;
  }
  case 'open-exercise':{
   let entry=entryId;
   if(!entry && page==='session'){const s=getSession(ctx.id);entry=s?.entries[Number(el.dataset.index)]?.id;}
   route('exercise',{sessionId:sessionId||ctx.id,entryId:entry});return;
  }
  case 'view-exercise-info':route('exercise',{exerciseId:el.dataset.exId});return;
  case 'toggle-set':{
   const {set,entry}=getSet(el);if(!set)return;
   if(!set.done && (!Number.isInteger(set.reps)||set.reps<0)){toast('Enter repetitions first');return;}
   set.done=!set.done;set.completed_at=set.done?new Date().toISOString():null;entry.skipped=false;await persist();render();return;
  }
  case 'add-set':{
   const s=getSession(sessionId),e=s?.entries.find(x=>x.id===entryId);if(!e)return;
   e.sets.push({id:uid('set'),number:e.sets.length+1,weight_kg:null,reps:null,done:false,completed_at:null});await persist();render();return;
  }
  case 'skip-exercise':{
   const s=getSession(sessionId),e=s?.entries.find(x=>x.id===entryId);if(!e)return;
   if(!e.skipped && e.sets.some(x=>x.done)){toast('Undo completed sets before skipping');return;}
   e.skipped=!e.skipped;await persist();toast(e.skipped?'Exercise skipped':'Exercise restored');render();return;
  }
  case 'swap-exercise':pickerMode={kind:'session',sessionId,entryId};route('picker');return;
  case 'finish-workout':{
   const s=getSession(id);if(!s)return;const done=s.entries.flatMap(e=>e.sets).filter(x=>x.done).length;
   if(done===0){toast('Complete at least one set before finishing');return;}
   if(s.entries.some(e=>e.sets.some(x=>!x.done))&&!confirm('Some sets are unfinished. Finish the workout and keep only completed sets?'))return;
   sessionFinished(s);await persist();goTo('finished',{id:s.id});return;
  }
  case 'discard-workout':{
   const s=getSession(id);if(!s)return;
   if(!confirm('Discard this unfinished workout and its logged sets? This cannot be undone.'))return;
   s.status='discarded';await persist();switchTab('workout');return;
  }
  case 'category':route('category',{id});return;
  case 'routine-details':route('routine',{id});return;
  case 'activation-form':activationDraft={start:today(),duration:'4',custom:''};route('activate',{id});return;
  case 'save-activation':{
   try{createActivation(S,{routineId:id,startDate:activationDraft.start,duration:activationDraft.duration,customEnd:activationDraft.custom});await persist();toast('Routine activated');switchTab('routines');}
   catch(e){toast(e.message);}return;
  }
  case 'manage-activation':route('manage',{id});return;
  case 'manage-change':route('category',{id:el.dataset.category});return;
  case 'manage-duration':{
   const a=S.activations.find(x=>x.id===id);if(!a)return;
   activationDraft={start:a.start_date,duration:a.duration_mode||'until',custom:effectiveEnd(a)?addDays(effectiveEnd(a),-1):''};route('duration',{id});return;
  }
  case 'save-duration':{
   const a=S.activations.find(x=>x.id===id);if(!a)return;
   try{a.end_exclusive_date=activationEnd(a.start_date,activationDraft.duration,activationDraft.custom);a.duration_mode=activationDraft.duration;
    // Never erase a replacement boundary when extending a superseded period.
    await persist();toast('Duration updated');goTo('manage',{id});}
   catch(e){toast(e.message);}return;
  }
  case 'deactivate':{
   if(!confirm('Deactivate this routine? Your workout history will remain.'))return;
   deactivate(S,id);await persist();toast('Routine deactivated');switchTab('routines');return;
  }
  case 'create-routine':{
   const category=el.dataset.category||S.categories[0]?.id;
   draftRoutine={id:uid('routine'),category_id:category,variation:'Custom',name:'',description:'',estimated_minutes:{min:20,max:65},warmup_minutes:5,revision:0,exercises:[]};
   route('editor',{new:true});return;
  }
  case 'edit-routine':draftRoutine=deepClone(getRoutine(id));route('editor',{new:false});return;
  case 'duplicate-routine':{
   const r=getRoutine(id);if(!r)return;
   draftRoutine={...deepClone(r),id:uid('routine'),name:`${r.name} (copy)`,variation:'Custom',revision:0};route('editor',{new:true});return;
  }
  case 'delete-routine':{
   const r=getRoutine(id);if(!r)return;
   if(S.activations.some(a=>a.routine_id===id && ['active','scheduled'].includes(activationState(a)))){toast('Deactivate the routine before deleting it');return;}
   if(!confirm(`Remove "${r.name}" from the library? Past workout records will remain.`))return;
   S.routines=S.routines.filter(x=>x.id!==id);await persist();toast('Routine removed');switchTab('routines');return;
  }
  case 'save-editor':{
   const r=draftRoutine;if(!r)return;
   if(!r.name.trim()){toast('Please give the routine a name');return;}
   if(!r.exercises.length){toast('Add at least one exercise');return;}
   if(r.exercises.some(s=>!getEx(s.exercise_id)||!Number.isInteger(s.sets)||s.sets<1||s.sets>10||s.reps_min<1||s.reps_min>s.reps_max||s.reps_max>50)){toast('Check each exercise’s sets and reps');return;}
   const current=getRoutine(r.id);
   r.name=r.name.trim();r.revision=(current?.revision||0)+1;r.updated_at=new Date().toISOString();
   if(current)S.routines[S.routines.indexOf(current)]=deepClone(r);else S.routines.push(deepClone(r));
   await persist();draftRoutine=null;toast('Routine saved');goTo('routine',{id:r.id});return;
  }
  case 'editor-add':pickerMode={kind:'editor-add'};route('picker');return;
  case 'editor-swap':pickerMode={kind:'editor-swap',index:Number(el.dataset.index)};route('picker');return;
  case 'remove-slot':draftRoutine.exercises.splice(Number(el.dataset.index),1);render();return;
  case 'move-slot':{
   const i=Number(el.dataset.index),j=i+Number(el.dataset.dir);
   if(j<0||j>=draftRoutine.exercises.length)return;
   [draftRoutine.exercises[i],draftRoutine.exercises[j]]=[draftRoutine.exercises[j],draftRoutine.exercises[i]];render();return;
  }
  case 'select-exercise':{
   if(!getEx(id)){toast('Exercise unavailable');return;}
   if(pickerMode?.kind==='editor-add')draftRoutine.exercises.push({exercise_id:id,sets:3,reps_min:8,reps_max:12,rest_seconds:90,priority:'essential',substitution_allowed:true,target_reps_in_reserve:'1-3'});
   else if(pickerMode?.kind==='editor-swap')draftRoutine.exercises[pickerMode.index].exercise_id=id;
   else if(pickerMode?.kind==='session'){
    const s=getSession(pickerMode.sessionId),e=s?.entries.find(x=>x.id===pickerMode.entryId),ex=getEx(id);
    if(!e)return;
    if(e.sets.some(x=>x.done)){toast('You cannot swap an exercise after logging completed sets');return;}
    e.exercise_id=id;e.exercise_name=ex.name;e.exercise_equipment=ex.equipment;e.exercise_load_kind=ex.logging?.load_kind||'machine_or_total_load';
    await persist();toast('Exercise swapped for this workout');
   }
   if(pickerMode?.kind==='session'){goTo('session',{id:pickerMode.sessionId});}
   else { // Return to editor with draft intact.
    page='editor';ctx={new:!getRoutine(draftRoutine.id)};stack=[];render();
   }
   return;
  }
  case 'new-exercise':exerciseDraft=null;route('exercise-create');return;
  case 'upload-exercise-photo':imageUploadTarget=null;$('exercise-photo').click();return;
  case 'upload-existing-photo':imageUploadTarget=id;$('exercise-photo').click();return;
  case 'save-exercise':{
   if(!exerciseDraft?.name?.trim()){toast('Please name your exercise');return;}
   if(!exerciseDraft.media?.custom_data_url){toast('Please add an exercise picture before saving');return;}
   const e={id:uid('exercise'),name:exerciseDraft.name.trim(),name_de:exerciseDraft.name.trim(),equipment:exerciseDraft.equipment||'Custom',primary_muscles:['custom'],instructions:exerciseDraft.instructions.filter(Boolean),media:exerciseDraft.media||{},logging:exerciseDraft.logging,custom:true};
   S.exercises.push(e);await persist();exerciseDraft=null;toast('Exercise added');
   if(pickerMode){
    // Select the newly created exercise in the previous picker workflow.
    await act('select-exercise',{dataset:{id:e.id}});
   }else switchTab('routines');return;
  }
  case 'new-category':route('category-create');return;
  case 'save-category':{
   const name=$('new-category-name')?.value.trim();if(!name){toast('Enter a category name');return;}
   const c={id:uid('category'),display_name:short(name),color:['#f8e0e6','#e5f1df','#e6ebfa','#fff0d8','#e8e4f5'][S.categories.length%5],sort_order:S.categories.length+1};
   S.categories.push(c);await persist();toast('Category created');switchTab('routines');return;
  }
  case 'history-detail':if(page==='finished'){tab='history';goTo('history-detail',{id});}else route('history-detail',{id});return;
  case 'exercise-progress':progressMetric='weight';progressPeriod='3m';route('exercise-progress',{id});return;
  case 'history-filter':historyFilter=el.dataset.value||'all';historyShowAll=false;render();return;
  case 'history-more':historyShowAll=!historyShowAll;render();return;
  case 'view-trends':route('trends');return;
  case 'progress-period':progressPeriod=el.dataset.value||'3m';render();return;
  case 'progress-metric':progressMetric=el.dataset.value||'weight';render();return;
  case 'export-backup':{
   const content=JSON.stringify({...S,exported_at:new Date().toISOString()},null,2);
   const blob=new Blob([content],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`my-little-gym-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Backup downloaded');return;
  }
  case 'import-backup':$('backup-file').click();return;
  case 'refresh-media':await refreshMedia(true);return;
  case 'cache-images':{
   if(!Object.keys(S.mediaRefs||{}).length){toast('Find illustrations first');return;}
   const btn=el;btn.disabled=true;btn.textContent='Caching illustrations…';
   try {const results=await cacheIllustrations(S.mediaRefs,(ok,fail,total)=>{const info=$('media-progress');if(info)info.textContent=`${ok+fail}/${total} requested · ${fail} unavailable`;});
     toast(`${results.saved} illustrations cached · ${results.failed} unavailable`);
   }catch(e){toast(`Could not cache: ${e.message}`);}finally{render();}return;
  }
  default:console.warn('Unknown action',action);
 }
}
async function refreshMedia(manual=false){
 if(mediaRefreshing)return;mediaRefreshing=true;
 try {
  const refs=await fetchVerifiedMedia(S.exercises);
  S.mediaRefs={...S.mediaRefs,...refs};await persist();
  if(manual)toast(`${Object.keys(refs).length} exercise illustrations found`);
  if(page==='settings'||page==='exercise')render();
  else document.querySelectorAll('[data-exercise-image]').forEach(img=>{
   const ex=getEx(img.dataset.exerciseImage);const src=exImg(ex,img.dataset.pose||'start');
   if(img.getAttribute('src')!==src)img.setAttribute('src',src);
  });
 }catch(e){if(manual)toast(`Could not reach illustration library: ${e.message}`);console.info('Illustration catalog could not be reached:',e.message);}
 finally{mediaRefreshing=false;}
}
async function handleClick(e){const button=e.target.closest('button[data-action], button[data-tab]');if(!button)return;
 if(button.dataset.tab){switchTab(button.dataset.tab);return;}
 try{await act(button.dataset.action,button);}catch(err){console.error(err);toast(err.message||'Something went wrong');}
}
function handleInput(e){if(e.target.id==='exercise-search'){$('picker-list').innerHTML=pickerItems(e.target.value);}}
async function handleChange(e){const el=e.target;
 if(el.dataset.setInput){const {set}=getSet(el);if(!set)return;const key=el.dataset.setInput;const n=el.value.trim()===''?null:Number(el.value);
  if(n!==null&&(!Number.isFinite(n)||n<0||n>(key==='reps'?300:2000)||(key==='reps'&&!Number.isInteger(n)))){toast('Please enter a valid number');render();return;}
  set[key]=n;if(set.done&&key==='reps'&&n===null){set.done=false;set.completed_at=null;}await persist();return;}
 if(el.dataset.sessionNotes){const s=getSession(el.dataset.sessionNotes);if(s){s.notes=el.value.slice(0,2000);await persist();}return;}
 if(el.dataset.editorField&&draftRoutine){draftRoutine[el.dataset.editorField]=el.value;return;}
 if(el.dataset.editorSlot&&draftRoutine){const slot=draftRoutine.exercises[Number(el.dataset.index)];if(slot)slot[el.dataset.editorSlot]=Number(el.value);return;}
 if(el.dataset.activationField&&activationDraft){activationDraft[el.dataset.activationField]=el.value;if(el.dataset.activationField==='duration')render();return;}
 if(el.dataset.exerciseCreate&&exerciseDraft){const field=el.dataset.exerciseCreate;
  if(field==='instruction0')exerciseDraft.instructions[0]=el.value;
  else if(field==='instruction1')exerciseDraft.instructions[1]=el.value;
  else if(field==='load_kind')exerciseDraft.logging.load_kind=el.value;
  else exerciseDraft[field]=el.value;
  return;}
}
async function handleBackup(file){if(!file)return;
 try{
  if(file.size>25_000_000)throw new Error('Backup exceeds 25 MB');
  const body=JSON.parse(await file.text());validateBackup(body);
  const summary=`${body.routines.length} routines, ${body.exercises.length} exercises, ${body.sessions.filter(x=>x.status==='completed').length} completed workouts`;
  if(!confirm(`Import backup containing ${summary}? This REPLACES all data currently saved on this phone. Export your current data first if you need it.`))return;
  const clean=deepClone(body);delete clean.exported_at;
  S=clean;await persist();toast('Backup restored');switchTab('workout');
 }catch(e){toast(`Import failed: ${e.message}`);}finally{$('backup-file').value='';}
}
async function handlePhoto(file){if(!file||(!exerciseDraft&&!imageUploadTarget))return;
 if(file.size>12_000_000){toast('Choose an image smaller than 12 MB');return;}
 try{
  const src=URL.createObjectURL(file);const image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=src;});
  const scale=Math.min(1,540/Math.max(image.naturalWidth,image.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(image.naturalWidth*scale);c.height=Math.round(image.naturalHeight*scale);
  c.getContext('2d').drawImage(image,0,0,c.width,c.height);const picture=c.toDataURL('image/jpeg',.78);
  if(imageUploadTarget){const target=getEx(imageUploadTarget);if(!target)throw new Error('Exercise was not found');target.media={...(target.media||{}),custom_data_url:picture};await persist();imageUploadTarget=null;}
  else exerciseDraft.media.custom_data_url=picture;}finally{URL.revokeObjectURL(src);}
  toast('Image added · it will be included in backups');render();
 }catch(e){toast('Unable to read that image');}finally{$('exercise-photo').value='';}
}
async function boot(){
 try{
  const existing=await loadState();
  if(existing){validateBackup(existing);S=existing;}
  else {
   const [categories,exercises,routines]=await Promise.all(['categories','exercises','routines'].map(async name=>{
    const response=await fetch(`../data/${name}.json`);if(!response.ok)throw new Error(`Could not load ${name} data`);return response.json();}));
   S=makeInitialState({categories,exercises,routines});await persist();
  }
  document.addEventListener('click',handleClick);
  document.addEventListener('input',handleInput);
  document.addEventListener('change',handleChange);
  $('backup-file').addEventListener('change',e=>handleBackup(e.target.files?.[0]));
  $('exercise-photo').addEventListener('change',e=>handlePhoto(e.target.files?.[0]));
  render();
  if('serviceWorker' in navigator&&location.protocol==='https:'||('serviceWorker' in navigator && location.hostname==='localhost')){
   navigator.serviceWorker.register('service-worker.js').catch(e=>console.warn('PWA offline setup:',e));
  }
  if(navigator.onLine && S.exercises.some(e=>!e.media?.custom_data_url&&!S.mediaRefs?.[e.id]))refreshMedia(false);
 }catch(e){console.error(e);$('main').innerHTML=`<div class="no-content"><strong>Unable to open My Little Gym</strong><p>${escapeHtml(e.message)}</p><p>Open it from an HTTPS website or a local web server, not directly as a file.</p></div>`;}
}
boot();
