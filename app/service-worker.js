// Version 0.2: install a new shell and prefer fresh network responses for the shared catalog.
const SHELL='little-gym-shell-v5';
const MEDIA='little-gym-exercise-images-v2';
const APP_FILES=['./','index.html','styles.css','app.js','db.mjs','domain.mjs','history.mjs','media.mjs','catalog.mjs','share.mjs','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/icon-180.png','assets/exercise-placeholder.svg','../data/catalog.json','../data/catalog-v1-fingerprints.json','../data/categories.json','../data/exercises.json','../data/routines.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(SHELL).then(c=>c.addAll(APP_FILES.map(x=>new URL(x,self.registration.scope).href))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('little-gym-')&&![SHELL,MEDIA].includes(k)).map(k=>caches.delete(k)))),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.hostname==='raw.githubusercontent.com'&&url.pathname.includes('/images/flat/')){
  event.respondWith(caches.open(MEDIA).then(async cache=>{
   const match=await cache.match(req);if(match)return match;
   try{const response=await fetch(req);if(response.ok||response.type==='opaque')await cache.put(req,response.clone());return response;}catch{return Response.error();}
  }));return;
 }
 if(url.origin!==self.location.origin)return;
 if(url.pathname.includes('/my-little-gym/data/')||url.pathname.includes('/data/')){
  // Shared catalog is pull-only. Revalidate online; fall back to previously cached JSON offline.
  // Normalize query arguments so repeated checks don't grow caches endlessly.
  event.respondWith(caches.open(SHELL).then(async cache=>{
   const key=new Request(url.origin+url.pathname);
   try{const result=await fetch(req);if(result.ok)await cache.put(key,result.clone());return result;}catch{
    return await cache.match(key)||Response.error();
   }
  }));return;
 }
 // PWA shell is cached; deploying v5 replaces it. The next full reopen uses new code.
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{
  if(r.ok){const clone=r.clone();caches.open(SHELL).then(c=>c.put(req,clone)).catch(()=>{});}return r;
 })));
});
