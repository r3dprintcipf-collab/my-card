(() => {
  const root = document.getElementById('app');
  const cfg = window.MYCARD_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabaseAnonKey && !String(cfg.supabaseUrl).includes('YOUR_');
  const db = configured && window.supabase?.createClient ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cardSlug = new URLSearchParams(location.search).get('card');

  function vcf(c) {
    const lines = ['BEGIN:VCARD','VERSION:3.0',`FN:${c.name||''}`,`ORG:${c.company||''}`,`TITLE:${c.role||''}`];
    if(c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
    if(c.email) lines.push(`EMAIL:${c.email}`);
    if(c.website) lines.push(`URL:${c.website}`);
    if(c.address) lines.push(`ADR:;;${c.address}`);
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  function downloadContact(c) {
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([vcf(c)],{type:'text/vcard'}));
    a.download=(c.slug||'contact')+'.vcf';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function linkItems(c) {
    return (c.links||[]).filter(x=>x.label&&x.url).map(x=>`<a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="symbol">${esc(x.icon||'↗')}</span><span>${esc(x.label)}</span></a>`).join('');
  }

  function socialItems(c) {
    return (c.socials||[]).filter(x=>x.label&&x.url).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.label)}">${esc(x.icon||x.label.slice(0,1))}</a>`).join('');
  }

  function renderCard(c) {
    document.title=(c.name||'My Card')+' — My Card';
    root.innerHTML=`<main class="page"><article class="card" style="--accent:${esc(c.accent||'#6558f5')}">${c.logo?`<img class="logo" src="${esc(c.logo)}" alt="">`:''}${c.photo?`<img class="avatar" src="${esc(c.photo)}" alt="">`:''}${c.brand?`<div class="brand">${esc(c.brand)}</div>`:''}<h1 class="name">${esc(c.name)}</h1><div class="role">${esc(c.role||'')}${c.company?` · ${esc(c.company)}`:''}</div><div class="top-actions"><button class="btn secondary" id="save">Save My Contact</button><a class="btn primary" href="#links">Connect with Me</a></div><div class="links" id="links">${linkItems(c)}</div>${c.socials?.length?`<div class="socials">${socialItems(c)}</div>`:''}<div class="footer">MY CARD</div></article></main>`;
    document.getElementById('save').onclick=()=>downloadContact(c);
  }

  function message(t,err=false){
    const m=document.getElementById('msg');
    if(m)m.innerHTML=`<div class="notice ${err?'error':''}">${esc(t)}</div>`;
  }

  function field(n,l,type='text',placeholder=''){
    return `<div class="field ${['links','socials'].includes(n)?'full':''}"><label>${l}</label>${type==='textarea'?`<textarea name="${n}" placeholder="${esc(placeholder)}"></textarea>`:`<input name="${n}" type="${type}" placeholder="${esc(placeholder)}">`}</div>`;
  }

  async function showPublic(){
    if(!db){
      root.innerHTML='<div class="page"><div class="card"><h2>My Card setup required</h2><p>Check config.js and reload.</p></div></div>';
      return;
    }
    const {data,error}=await db.from('cards').select('*').eq('slug',cardSlug).eq('published',true).single();
    if(error||!data){
      root.innerHTML='<div class="page"><div class="card"><h2>Card not found</h2></div></div>';
      return;
    }
    renderCard(data);
  }

  async function showAdmin(){
    if(!db){
      root.innerHTML='<div class="admin-wrap"><section class="panel"><h1>MY CARD ADMIN</h1><p>Supabase configuration not found. Check config.js.</p></section></div>';
      return;
    }

    root.innerHTML='<div class="admin-wrap"><section class="panel"><h1>MY CARD ADMIN</h1><p>Loading…</p></section></div>';

    const {data:{session},error:sessionError}=await db.auth.getSession();

    if(sessionError){
      root.innerHTML=`<div class="admin-wrap"><section class="panel"><h1>MY CARD ADMIN</h1><p>${esc(sessionError.message)}</p></section></div>`;
      return;
    }

    if(!session){
      renderLogin();
      return;
    }

    renderAdmin();
  }

  function renderLogin(){
    root.innerHTML=`<div class="admin-wrap"><section class="panel"><h1>MY CARD ADMIN</h1><p>Administrator sign in</p><form id="login"><div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div><div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><button class="btn primary" type="submit" style="margin-top:15px">Log in</button></form><div id="msg"></div></section></div>`;

    document.getElementById('login').onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.target);
      const b=e.target.querySelector('button');
      b.disabled=true;
      b.textContent='Signing in…';
      const r=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
      b.disabled=false;
      b.textContent='Log in';
      if(r.error)message(r.error.message,true);
      else renderAdmin();
    };
  }

  async function renderAdmin(){
    root.innerHTML=`<div class="admin-wrap"><header class="admin-header"><h1>MY CARD</h1><button class="btn secondary" id="logout">Log out</button></header><div id="msg"></div><section class="panel"><h2>Create / Edit Card</h2><form id="editor"><input type="hidden" name="id"><div class="formgrid">${field('slug','URL slug (unique)')}${field('name','Full name')}${field('role','Role / title')}${field('company','Company')}${field('phone','Phone')}${field('email','Email')}${field('address','Address')}${field('website','Website')}${field('photo','Photo URL')}${field('logo','Logo URL')}${field('accent','Accent color','color','#6558f5')}${field('links','Buttons (JSON)','textarea','[]')}${field('socials','Social links (JSON)','textarea','[]')}<div class="field full"><label><input type="checkbox" name="published"> Published</label></div></div><div class="actionrow"><button class="btn primary" type="submit">Save card</button><button class="btn secondary" type="button" id="reset">New card</button></div></form></section><section class="panel"><h2>Your cards</h2><div id="cards" class="cardslist"></div></section></div>`;

    document.getElementById('logout').onclick=async()=>{
      await db.auth.signOut();
      renderLogin();
    };

    document.getElementById('reset').onclick=()=>{
      const f=document.getElementById('editor');
      f.reset();
      f.elements.id.value='';
      f.elements.links.value='[]';
      f.elements.socials.value='[]';
    };

    const form=document.getElementById('editor');

    form.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(form),o={};

      for(const k of ['slug','name','role','company','phone','email','address','website','photo','logo','accent'])
        o[k]=f.get(k)||null;

      try{
        o.links=JSON.parse(f.get('links')||'[]');
        o.socials=JSON.parse(f.get('socials')||'[]');
      }catch{
        message('Buttons/social JSON is invalid.',true);
        return;
      }

      o.published=form.elements.published.checked;
      const id=f.get('id');
      const res=id?await db.from('cards').update(o).eq('id',id):await db.from('cards').insert(o);

      if(res.error){
        message(res.error.message,true);
      }else{
        message('Saved.');
        form.reset();
        form.elements.id.value='';
        form.elements.links.value='[]';
        form.elements.socials.value='[]';
        loadCards();
      }
    };

    loadCards();
  }

  async function loadCards(){
    const box=document.getElementById('cards');
    if(!box)return;

    const {data,error}=await db.from('cards').select('*').order('created_at',{ascending:false});

    if(error){
      box.innerHTML=esc(error.message);
      return;
    }

    box.innerHTML=(data||[]).map(c=>`<div class="carditem"><div><b>${esc(c.name)}</b><div class="small">${esc(c.slug)} · ${c.published?'Published':'Draft'}</div></div><div class="actionrow"><button class="btn secondary" data-edit="${c.id}">Edit</button><button class="btn secondary" data-view="${esc(c.slug)}">View</button><button class="btn secondary" data-copy="${esc(c.slug)}">Copy link</button></div></div>`).join('');

    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
      const c=data.find(x=>x.id===b.dataset.edit),f=document.getElementById('editor');
      for(const k of ['id','slug','name','role','company','phone','email','address','website','photo','logo','accent'])
        f.elements[k].value=c[k]||'';
      f.elements.links.value=JSON.stringify(c.links||[],null,2);
      f.elements.socials.value=JSON.stringify(c.socials||[],null,2);
      f.elements.published.checked=c.published;
      window.scrollTo(0,0);
    });

    box.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
      window.open(location.pathname+'?card='+encodeURIComponent(b.dataset.view),'_blank');
    });

    box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
      const url=location.origin+location.pathname+'?card='+encodeURIComponent(b.dataset.copy);
      try{
        await navigator.clipboard.writeText(url);
        message('Link copied');
      }catch{
        message(url);
      }
    });
  }

  function route(){
    if(location.hash==='#admin'){
      showAdmin();
    }else if(cardSlug){
      showPublic();
    }else{
      root.innerHTML=`<div class="page"><div class="card" style="text-align:center"><h1>MY CARD</h1><p>Digital business cards.</p><a class="btn primary" href="#admin">Administrator</a></div></div>`;
    }
  }

  route();
})();
