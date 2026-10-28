const SHELL='little-gym-shell-v4';
const MEDIA='little-gym-exercise-images-v2';
const APP_FILES=['./','index.html','styles.css','app.js','db.mjs','domain.mjs','history.mjs','media.mjs','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/icon-180.png','assets/exercise-placeholder.svg','../data/categories.json','../data/exercises.json','../data/routines.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(SHELL).then(c=>c.addAll(APP_FILES.map(x=>new URL(x,self.registration.scope).href))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('little-gym-')&& ![SHELL,MEDIA].includes(k)).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.hostname==='raw.githubusercontent.com' && url.pathname.includes('/images/flat/')) {
  event.respondWith(caches.open(MEDIA).then(async cache=>{
   const match=await cache.match(req);if(match)return match;
   try {const response=await fetch(req);if(response.ok||response.type==='opaque')await cache.put(req,response.clone());return response;}catch{return Response.error();}
  }));
  return;
 }
 if(url.origin!==self.location.origin)return;
 event.respondWith(caches.match(req).then(cached=>{
  if(cached)return cached;
  return fetch(req).then(r=>{if(r.ok) {const clone=r.clone();caches.open(SHELL).then(c=>c.put(req,clone)).catch(()=>{});}return r;});
 }));
});
