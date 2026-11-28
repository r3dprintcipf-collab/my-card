const VERSION='my-card-home-v2';
const CORE=['./','./index.html','./manifest.json?v=card-launch-fr-2','./icon.svg','./style.css?v=card-launch-fr-2','./app.js?v=card-launch-fr-2','./config.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('my-card-home-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL('./',self.location);
 if(url.origin!==self.location.origin)return;
 if(url.pathname===new URL('./manifest.json',self.location).pathname&&url.searchParams.has('card')){
  const cardSlug=url.searchParams.get('card')||'',cardStart='./?card='+encodeURIComponent(cardSlug);
  const manifest={id:cardStart,name:'Ma carte de visite',short_name:'Ma carte',description:'Accédez directement à cette carte de visite numérique.',start_url:cardStart,scope:'./',display:'standalone',background_color:'#f8f7fc',theme_color:'#6b63f6',icons:[{src:'icon.svg',sizes:'192x192',type:'image/svg+xml',purpose:'any'},{src:'icon.svg',sizes:'512x512',type:'image/svg+xml',purpose:'any maskable'}]};
  event.respondWith(new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store'}}));
  return;
 }
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
