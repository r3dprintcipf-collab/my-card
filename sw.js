const VERSION='my-card-home-v1';
const CORE=['./','./index.html','./manifest.json?v=home-screen-1','./icon.svg','./style.css?v=home-screen-1','./app.js?v=home-screen-1','./config.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('my-card-home-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL('./',self.location);
 if(url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{
   if(response.ok)event.waitUntil(caches.open(VERSION).then(cache=>cache.put(new URL('./index.html',self.location),response.clone())));
   return response;
  }).catch(()=>caches.match(new URL('./index.html',self.location))));
  return;
 }
 if(url.pathname.startsWith(scope.pathname)){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
   if(response.ok)event.waitUntil(caches.open(VERSION).then(cache=>cache.put(event.request,response.clone())));
   return response;
  })));
 }
});
