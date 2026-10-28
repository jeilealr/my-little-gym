// Curated RepDB free-tier mapping for all 42 starter exercise IDs.
// We dynamically check the publisher's CURRENT index before using any image URL.
// We never package or redistribute RepDB's image dataset as a standalone data product.
// The free tier requires visible attribution inside the app.
// See https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md
const BASE='https://raw.githubusercontent.com/RepDB/exercise-dataset/main/';
const INDEX=BASE+'exercises.json';
export const STARTER_IMAGES={
 chest_press_machine:'chest-press-machine',
 incline_dumbbell_press:'incline-db-press',
 pec_deck:'pec-deck',
 cable_fly:'cable-fly',
 low_to_high_cable_fly:'cable-fly', // Same family; actual cable angle needs confirmation.
 flat_dumbbell_press:'db-bench-press',
 push_up:'push-up',
 barbell_bench_press:'bench-press',
 leg_press:'leg-press',
 db_rdl:'dumbbell-romanian-deadlift',
 seated_leg_curl:'seated-leg-curl',
 lying_leg_curl:'leg-curl',
 standing_calf_raise:'standing-calf-raise',
 seated_calf_raise:'seated-calf-raise',
 goblet_squat:'goblet-squat',
 leg_extension:'leg-extension',
 hip_thrust_machine:'plate-loaded-glute-drive',
 db_hip_thrust:'dumbbell-hip-thrust',
 bulgarian_split_squat:'bulgarian-split-squat',
 lat_pulldown:'lat-pulldown',
 neutral_grip_pulldown:'v-bar-lat-pulldown',
 chest_supported_machine_row:'chest-supported-machine-row',
 seated_cable_row:'seated-cable-row',
 reverse_pec_deck:'machine-reverse-fly',
 single_arm_dumbbell_row:'single-arm-db-row',
 straight_arm_cable_pulldown:'straight-arm-pulldown',
 one_arm_cable_row:'one-arm-seated-cable-row',
 back_extension:'back-extension',
 assisted_pull_up:'assisted-pull-ups',
 face_pull:'face-pull',
 machine_shoulder_press:'machine-shoulder-press',
 db_lateral_raise:'lateral-raise',
 rope_triceps_pressdown:'tricep-pushdown',
 db_hammer_curl:'hammer-curl',
 db_shoulder_press:'dumbbell-shoulder-press',
 ez_bar_curl:'ez-bar-curl',
 lateral_raise_machine:'plate-loaded-lateral-raise',
 cable_overhead_triceps_extension:'cable-overhead-tricep-extension',
 cable_biceps_curl:'cable-curl',
 cable_lateral_raise:'cable-lateral-raise',
 machine_biceps_curl:'machine-bicep-curl',
 machine_triceps_extension:'machine-triceps-extension'
};
// These illustrations show a closely related movement; the exact bench/cable/grip setup
// may differ. Surface a note rather than silently passing a different movement as exact.
export const MEDIA_NOTES={
 low_to_high_cable_fly:'The picture shows a standard cable fly. For this variation, set the cables low and bring your hands upward.',
 rope_triceps_pressdown:'The picture shows a cable pressdown; use the rope attachment as described in the instructions.',
 lateral_raise_machine:'The picture shows a plate-loaded lateral raise machine. Adjust to the machine available at your gym.',
 lying_leg_curl:'Compare the pictured leg curl equipment with the lying model at your gym.'
};
export function imageUrl(ref,pose='start') {
 if(!ref) return null;
 return ref[pose] || ref.start || ref.peak || ref.main || null;
}
const nameSlug=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function matchVerifiedMedia(exercises,catalog) {
 if(!Array.isArray(catalog?.exercises))throw new Error('Unexpected illustration catalog');
 const lookup=new Map(catalog.exercises.map(e=>[e.id,e]));
 const byName=new Map(catalog.exercises.map(e=>[nameSlug(e.name_en),e]));
 const out={};
 for (const ex of exercises) {
   // For custom entries use only an exact name match; don't guess a different movement.
   const chosen=STARTER_IMAGES[ex.id] ? lookup.get(STARTER_IMAGES[ex.id]) : byName.get(nameSlug(ex.name));
   const flat=chosen?.images?.flat;
   if(!flat)continue;
   const ref={provider:'RepDB',catalog_id:chosen.id};
   for(const p of ['start','peak','main']) {
     const path=flat[p];
     if(typeof path==='string' && /^images\/flat\/[a-z0-9-]+\.webp$/.test(path))ref[p]=BASE+path;
   }
   if(ref.start||ref.main)out[ex.id]=ref;
 }
 return out;
}
export async function fetchVerifiedMedia(exercises) {
 const resp=await fetch(INDEX,{cache:'no-cache'});
 if(!resp.ok)throw new Error('Illustration catalog unavailable');
 return matchVerifiedMedia(exercises,await resp.json());
}
export async function cacheIllustrations(mediaRefs,onProgress=()=>{}) {
 if(!('caches' in window))throw new Error('This browser does not support offline image caching');
 const urls=[...new Set(Object.values(mediaRefs).flatMap(ref=>[ref.start,ref.peak,ref.main].filter(Boolean)))];
 const cache=await caches.open('little-gym-exercise-images-v2');
 let saved=0,failed=0;
 for(let i=0;i<urls.length;i+=4) {
  await Promise.all(urls.slice(i,i+4).map(async url=>{
   try {
    const req=new Request(url,{mode:'no-cors'});
    const old=await cache.match(req);
    if(!old) {
     const res=await fetch(req);
     if(res.type!=='opaque'&&!res.ok)throw new Error('Bad image');
     await cache.put(req,res);
    }
    saved++;
   }catch{failed++;}
   onProgress(saved,failed,urls.length);
  }));
 }
 return {saved,failed,total:urls.length};
}
