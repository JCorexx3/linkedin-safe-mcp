import {readFile, writeFile, mkdir, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function createStore(file) {
  const lockPath = `${file}.lock`;
  async function locked(fn) {
    await mkdir(path.dirname(file), {recursive:true});
    for (let attempt=0; ; attempt++) {
      try { await mkdir(lockPath); break; }
      catch(e) { if(e.code!=='EEXIST')throw e; if(attempt>=200)throw Error('store lock busy; fail-closed, retry later'); await new Promise(resolve=>setTimeout(resolve,10)); }
    }
    try { return await fn(); } finally { await rm(lockPath,{recursive:true,force:true}); }
  }
  const format='linkedin-safe-mcp/drafts-v1';
  function validRow(row) {
    return row && typeof row==='object' && !Array.isArray(row) &&
      typeof row.id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id) &&
      typeof row.createdAt==='string' && !Number.isNaN(Date.parse(row.createdAt)) &&
      typeof row.status==='string' &&
      (typeof row.text==='string' || (row.payload && typeof row.payload==='object' && !Array.isArray(row.payload)));
  }
  async function load() {
    let data;
    try { data=JSON.parse(await readFile(file,'utf8')); }
    catch(e) { if(e.code==='ENOENT')return []; throw e; }
    // Accept the earlier array format only when every row matches our own draft shape.
    const rows=Array.isArray(data)?data:(data?.format===format?data.items:null);
    if(!Array.isArray(rows)||!rows.every(validRow))throw Error('draft store format invalid; refusing to overwrite');
    return rows;
  }
  async function save(rows) { const tmp=`${file}.${randomUUID()}.tmp`; try { await writeFile(tmp,JSON.stringify({format,items:rows},null,2),{mode:0o600,flag:'wx'}); await rename(tmp,file); } finally { await rm(tmp,{force:true}); } }
  return {
    async draft(text) { if(typeof text!=='string'||!text.trim()||text.length>3000)throw Error('text must be nonempty and at most 3000 characters'); return this.draftItem('post',{text}); },
    async draftItem(kind,payload) {
      const schemas={post:{required:['text'],allowed:['text'],max:3000},comment:{required:['text','targetReference'],allowed:['text','targetReference'],max:1250},reaction:{required:['reaction','targetReference'],allowed:['reaction','targetReference'],max:1000},event:{required:['title','startsAt'],allowed:['title','description','startsAt','endsAt','location'],max:3000},image_post:{required:['text','altText','imageLabel'],allowed:['text','altText','imageLabel'],max:3000}};
      const schema=schemas[kind]; if(!schema||!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('invalid draft payload');
      if(Object.keys(payload).some(k=>!schema.allowed.includes(k)))throw Error('unsupported field');
      for(const k of schema.required)if(typeof payload[k]!=='string'||!payload[k].trim())throw Error(`${k} must be nonempty text`);
      for(const [k,v] of Object.entries(payload))if(typeof v!=='string'||v.length>(k==='text'?schema.max:1000))throw Error(`${k} must be text within the allowed length`);
      if(kind==='reaction'&&!['LIKE','PRAISE','EMPATHY','INTEREST','APPRECIATION','ENTERTAINMENT'].includes(payload.reaction))throw Error('unsupported reaction');
      if(kind==='event')for(const k of ['startsAt','endsAt'])if(payload[k]&&Number.isNaN(Date.parse(payload[k])))throw Error(`${k} must be a valid date`);
      return locked(async()=>{const rows=await load(),d={id:randomUUID(),kind,payload:{...payload},status:'pending',createdAt:new Date().toISOString()};if(kind==='post')d.text=payload.text;rows.push(d);await save(rows);return d;});
    },
    async list(){return load();}, async get(id){return (await load()).find(x=>x.id===id);},
    async update(id,patch){return locked(async()=>{const rows=await load(),i=rows.findIndex(x=>x.id===id);if(i<0)throw Error('draft not found');rows[i]={...rows[i],...patch};await save(rows);return rows[i];});},
    async claim(id){return locked(async()=>{const rows=await load(),i=rows.findIndex(x=>x.id===id);if(i<0)throw Error('draft not found');if(rows[i].status!=='pending')throw Error('draft is not pending; sending state is non-retryable');rows[i]={...rows[i],status:'sending'};await save(rows);return rows[i];});}
  };
}
// LinkedIn OIDC advertises pairwise subjects. No verified mapping from userinfo.sub
// to the numeric person URN is available, so publishing is intentionally disabled.
export async function publishDraft(){ throw Error('publishing disabled: LinkedIn userinfo.sub is app-specific and is not a verified person URN binding'); }
