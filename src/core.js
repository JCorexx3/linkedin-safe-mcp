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
  async function load() { try { return JSON.parse(await readFile(file,'utf8')); } catch(e) { if(e.code==='ENOENT')return []; throw e; } }
  async function save(rows) { const tmp=`${file}.${randomUUID()}.tmp`; try { await writeFile(tmp,JSON.stringify(rows,null,2),{mode:0o600,flag:'wx'}); await rename(tmp,file); } finally { await rm(tmp,{force:true}); } }
  return {
    async draft(text) { if(typeof text!=='string'||!text.trim()||text.length>3000)throw Error('text must be nonempty and at most 3000 characters'); return locked(async()=>{const rows=await load(),d={id:randomUUID(),text,status:'pending',createdAt:new Date().toISOString()};rows.push(d);await save(rows);return d;}); },
    async list(){return load();}, async get(id){return (await load()).find(x=>x.id===id);},
    async update(id,patch){return locked(async()=>{const rows=await load(),i=rows.findIndex(x=>x.id===id);if(i<0)throw Error('draft not found');rows[i]={...rows[i],...patch};await save(rows);return rows[i];});},
    async claim(id){return locked(async()=>{const rows=await load(),i=rows.findIndex(x=>x.id===id);if(i<0)throw Error('draft not found');if(rows[i].status!=='pending')throw Error('draft is not pending; sending state is non-retryable');rows[i]={...rows[i],status:'sending'};await save(rows);return rows[i];});}
  };
}
// LinkedIn OIDC advertises pairwise subjects. No verified mapping from userinfo.sub
// to the numeric person URN is available, so publishing is intentionally disabled.
export async function publishDraft(){ throw Error('publishing disabled: LinkedIn userinfo.sub is app-specific and is not a verified person URN binding'); }
