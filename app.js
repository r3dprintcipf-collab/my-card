(() => {
  const root = document.getElementById('app');
  const cfg = window.MYCARD_CONFIG || {};
  const db = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentLinks = [], currentSocials = [], cards = [];

  const css = `
  <style>
  .mc{max-width:1100px;margin:auto;padding:20px;font-family:inherit}
  .mc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
  .mc-box{background:var(--background,#fff);border:1px solid #ddd;border-radius:18px;padding:20px;margin:18px 0}
  .mc-box input,.mc-box select,.mc-box textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:10px;margin:5px 0 14px}
  .mc-box label{font-weight:600;display:block}
  .mc-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .mc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .mc-btn{padding:11px 16px;border:0;border-radius:10px;cursor:pointer;font-weight:600}
  .mc-primary{background:#6558f5;color:white}
  .mc-secondary{background:#eee;color:#222}
  .mc-item{border:1px solid #ddd;padding:12px;border-radius:12px;margin:10px 0}
  .mc-preview{border-radius:24px;padding:25px;text-align:center;color:#fff;background:#171717;min-height:250px}
  .mc-preview img{max-width:100%;max-height:100px;object-fit:contain}
  .mc-preview .mc-avatar{width:100px;height:100px;object-fit:cover;border-radius:50%;margin:10px auto}
  .mc-link{display:block;margin:9px auto;padding:12px;border:1px solid #ffffff55;border-radius:12px;color:inherit;text-decoration:none}
  .mc-qr{width:180px;height:180px;display:block;margin:15px auto;background:white;padding:10px;border-radius:12px}
  .mc-muted{opacity:.7;font-size:13px}
  @media(max-width:600px){.mc-row{grid-template-columns:1fr}}
  </style>`;

  function vcf(c){
    return ['BEGIN:VCARD','VERSION:3.0',`FN:${c.name||''}`,`ORG:${c.company||''}`,`TITLE:${c.role||''}`,
      c.phone?`TEL;TYPE=CELL:${c.phone}`:'',c.email?`EMAIL:${c.email}`:'',
      c.website?`URL:${c.website}`:'',c.address?`ADR:;;${c.address}`:'','END:VCARD'].filter(Boolean).join('\r\n');
  }
  function download(data,name,type){
    const a=document.createElement('a'),u=URL.createObjectURL(new Blob([data],{type}));
    a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  function cardURL(slug){return location.origin+location.pathname+'?card='+encodeURIComponent(slug);}
  function injectCSS(){if(!document.getElementById('mc-css')){const s=document.createElement('div');s.id='mc-css';s.innerHTML=css;document.head.appendChild(s);}}

  async function route(){
    injectCSS();
    if(location.hash==='#admin')return admin();
    const slug=new URLSearchParams(location.search).get('card');
    if(slug)return publicCard(slug);
    root.innerHTML=`<div class="mc"><div class="mc-box" style="text-align:center"><h1>MY CARD</h1><a class="mc-btn mc-primary" href="#admin">Administrator</a></div></div>`;
  }

  async function publicCard(slug){
    if(!db){root.innerHTML='Configuration missing';return;}
    const {data,error}=await db.from('cards').select('*').eq('slug',slug).eq('published',true).single();
    if(error||!data){root.innerHTML='<div class="mc"><h2>Card not found</h2></div>';return;}
    const c=data;
    root.innerHTML=`<div class="mc"><div class="mc-preview" style="background:${esc(c.accent||'#171717')}">
      ${c.logo?`<img src="${esc(c.logo)}" alt="logo">`:''}
      ${c.photo?`<img class="mc-avatar" src="${esc(c.photo)}" alt="">`:''}
      <h1>${esc(c.name)}</h1><p>${esc(c.role||'')}${c.company?' · '+esc(c.company):''}</p>
      <button class="mc-btn mc-secondary" id="vcf">Save Contact</button>
      ${(c.links||[]).map(x=>`<a class="mc-link" href="${esc(x.url)}" target="_blank">${esc(x.label)}</a>`).join('')}
      ${(c.socials||[]).map(x=>`<a class="mc-link" href="${esc(x.url)}" target="_blank">${esc(x.label)}</a>`).join('')}
      </div></div>`;
    document.getElementById('vcf').onclick=()=>download(vcf(c),(c.slug||'contact')+'.vcf','text/vcard');
  }

  async function admin(){
    if(!db){root.innerHTML='Supabase configuration missing';return;}
    const {data:{session}}=await db.auth.getSession();
    if(!session)return login();
    dashboard();
  }

  function login(){
    root.innerHTML=`<div class="mc"><section class="mc-box" style="max-width:420px;margin:50px auto"><h1>MY CARD</h1><form id="login"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><button class="mc-btn mc-primary">Log in</button><div id="err"></div></form></section></div>`;
    document.getElementById('login').onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.target);
      const r=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
      if(r.error)document.getElementById('err').textContent=r.error.message;else dashboard();
    };
  }

  async function dashboard(){
    const r=await db.from('cards').select('*').order('created_at',{ascending:false});
    if(r.error){root.innerHTML=`<div class="mc">${esc(r.error.message)}</div>`;return;}
    cards=r.data||[];
    root.innerHTML=`<div class="mc"><header class="mc-actions" style="justify-content:space-between"><h1>MY CARD</h1><div><button class="mc-btn mc-primary" id="new">+ Create card</button> <button class="mc-btn mc-secondary" id="logout">Log out</button></div></header>
    <div class="mc-grid" id="list">${cards.map(c=>`<section class="mc-box"><h3>${esc(c.name)}</h3><div class="mc-muted">${esc(c.slug)} · ${c.published?'Published':'Draft'}</div><div class="mc-actions"><button class="mc-btn mc-primary" data-edit="${c.id}">Edit</button><button class="mc-btn mc-secondary" data-dup="${c.id}">Duplicate</button><button class="mc-btn mc-secondary" data-qr="${c.id}">QR</button><button class="mc-btn mc-secondary" data-view="${esc(c.slug)}">View</button><button class="mc-btn mc-secondary" data-del="${c.id}">Delete</button></div></section>`).join('')}</div><div id="editor"></div></div>`;
    document.getElementById('new').onclick=()=>editor();
    document.getElementById('logout').onclick=async()=>{await db.auth.signOut();login();};
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(cards.find(c=>c.id===b.dataset.edit)));
    root.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{const c=cards.find(c=>c.id===b.dataset.dup);editor({...c,id:null,slug:c.slug+'-copy',name:c.name+' copy',published:false});});
    root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>window.open(cardURL(b.dataset.view),'_blank'));
    root.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>qrDialog(cards.find(c=>c.id===b.dataset.qr)));
    root.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this card?')){const r=await db.from('cards').delete().eq('id',b.dataset.del);if(r.error)alert(r.error.message);else dashboard();}});
  }

  function editor(c={}){
    c=c||{};currentLinks=[...(c.links||[])];currentSocials=[...(c.socials||[])];
    const box=document.getElementById('editor');
    box.innerHTML=`<section class="mc-box"><h2>${c.id?'Edit card':'Create card'}</h2><form id="form">
      <input type="hidden" name="id" value="${esc(c.id||'')}">
      <div class="mc-row"><div><label>Name *</label><input name="name" required value="${esc(c.name||'')}"></div><div><label>URL slug *</label><input name="slug" required value="${esc(c.slug||'')}"></div></div>
      <div class="mc-row"><div><label>Role</label><input name="role" value="${esc(c.role||'')}"></div><div><label>Company</label><input name="company" value="${esc(c.company||'')}"></div></div>
      <div class="mc-row"><div><label>Phone</label><input name="phone" value="${esc(c.phone||'')}"></div><div><label>Email</label><input name="email" type="email" value="${esc(c.email||'')}"></div></div>
      <div class="mc-row"><div><label>Address</label><input name="address" value="${esc(c.address||'')}"></div><div><label>Website</label><input name="website" value="${esc(c.website||'')}"></div></div>
      <div class="mc-row"><div><label>Photo URL</label><input name="photo" value="${esc(c.photo||'')}"></div><div><label>Logo URL</label><input name="logo" value="${esc(c.logo||'')}"></div></div>
      <div class="mc-row"><div><label>Card color</label><input name="accent" type="color" value="${esc(c.accent||'#6558f5')}"></div><div><label><input name="published" type="checkbox" ${c.published?'checked':''}> Published</label></div></div>
      <h3>Contact buttons</h3><div id="links"></div><button type="button" class="mc-btn mc-secondary" id="addlink">+ Add button</button>
      <h3>Social links</h3><div id="socials"></div><button type="button" class="mc-btn mc-secondary" id="addsocial">+ Add social link</button>
      <div class="mc-actions"><button class="mc-btn mc-primary" type="submit">Save card</button><button class="mc-btn mc-secondary" type="button" id="cancel">Cancel</button></div>
      </form><div class="mc-grid"><div><h3>Live preview</h3><div id="preview" class="mc-preview"></div></div><div><h3>QR code</h3><div id="qrlive"></div></div></div></section>`;
    drawRows();preview();
    const f=document.getElementById('form');
    f.querySelectorAll('input').forEach(i=>i.addEventListener('input',preview));
    document.getElementById('addlink').onclick=()=>{currentLinks.push({label:'',url:'',icon:'↗'});drawRows();};
    document.getElementById('addsocial').onclick=()=>{currentSocials.push({label:'',url:'',icon:''});drawRows();};
    document.getElementById('cancel').onclick=()=>dashboard();
    f.onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(f),o={};
      ['slug','name','role','company','phone','email','address','website','photo','logo','accent'].forEach(k=>o[k]=fd.get(k)||null);
      o.links=currentLinks.filter(x=>x.label&&x.url);o.socials=currentSocials.filter(x=>x.label&&x.url);o.published=f.elements.published.checked;
      const id=fd.get('id');
      const res=id?await db.from('cards').update(o).eq('id',id):await db.from('cards').insert(o);
      if(res.error)alert(res.error.message);else dashboard();
    };
  }

  function drawRows(){
    const l=document.getElementById('links'),s=document.getElementById('socials');if(!l||!s)return;
    l.innerHTML=currentLinks.map((x,i)=>`<div class="mc-item"><div class="mc-row"><div><label>Button name</label><input data-l="${i}" data-k="label" value="${esc(x.label)}"></div><div><label>Icon (optional)</label><input data-l="${i}" data-k="icon" value="${esc(x.icon||'')}"></div></div><label>URL</label><input data-l="${i}" data-k="url" value="${esc(x.url)}"><button type="button" class="mc-btn mc-secondary" data-rml="${i}">Remove</button></div>`).join('');
    s.innerHTML=currentSocials.map((x,i)=>`<div class="mc-item"><div class="mc-row"><div><label>Social name</label><input data-s="${i}" data-k="label" value="${esc(x.label)}"></div><div><label>Icon (optional)</label><input data-s="${i}" data-k="icon" value="${esc(x.icon||'')}"></div></div><label>URL</label><input data-s="${i}" data-k="url" value="${esc(x.url)}"><button type="button" class="mc-btn mc-secondary" data-rms="${i}">Remove</button></div>`).join('');
    l.querySelectorAll('[data-l]').forEach(i=>i.oninput=()=>{currentLinks[+i.dataset.l][i.dataset.k]=i.value;preview();});
    s.querySelectorAll('[data-s]').forEach(i=>i.oninput=()=>{currentSocials[+i.dataset.s][i.dataset.k]=i.value;preview();});
    l.querySelectorAll('[data-rml]').forEach(b=>b.onclick=()=>{currentLinks.splice(+b.dataset.rml,1);drawRows();preview();});
    s.querySelectorAll('[data-rms]').forEach(b=>b.onclick=()=>{currentSocials.splice(+b.dataset.rms,1);drawRows();preview();});
  }

  function preview(){
    const f=document.getElementById('form');if(!f)return;
    const d=new FormData(f),name=d.get('name')||'Your Name',slug=d.get('slug')||'card';
    const color=d.get('accent')||'#6558f5';
    document.getElementById('preview').style.background=color;
    document.getElementById('preview').innerHTML=`${d.get('logo')?`<img src="${esc(d.get('logo'))}">`:''}${d.get('photo')?`<img class="mc-avatar" src="${esc(d.get('photo'))}">`:''}<h2>${esc(name)}</h2><p>${esc(d.get('role')||'')}${d.get('company')?' · '+esc(d.get('company')):''}</p>${currentLinks.map(x=>`<a class="mc-link">${esc(x.label||'Button')}</a>`).join('')}${currentSocials.map(x=>`<a class="mc-link">${esc(x.label||'Social')}</a>`).join('')}`;
    const url=cardURL(slug);
    document.getElementById('qrlive').innerHTML=`<img class="mc-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}"><div class="mc-actions"><button class="mc-btn mc-secondary" id="dlqr">Download QR</button><button class="mc-btn mc-secondary" id="copyurl">Copy link</button></div>`;
    document.getElementById('dlqr').onclick=()=>downloadQR(url,slug);
    document.getElementById('copyurl').onclick=async()=>{try{await navigator.clipboard.writeText(url);alert('Link copied');}catch{prompt('Copy link',url);}};
  }

  function downloadQR(url,slug){
    const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').drawImage(img,0,0);canvas.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(slug||'card')+'-QR.png';a.click();});};img.onerror=()=>prompt('QR image URL',`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`);img.src=`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  }

  function qrDialog(c){const u=cardURL(c.slug);const w=window.open('','_blank');if(w)w.document.write(`<h2>${esc(c.name)}</h2><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(u)}"><p>${esc(u)}</p>`);}

  route();
})();
