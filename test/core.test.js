import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createStore, publishDraft} from '../src/core.js';

async function fixture(){const dir=await mkdtemp(path.join(os.tmpdir(),'li-safe-')); return {dir,file:path.join(dir,'drafts.json'),done:()=>rm(dir,{recursive:true,force:true})};}
test('drafts are locally pending and listing never exposes tokens',async()=>{const f=await fixture();try{const s=createStore(f.file);const d=await s.draft('hello');assert.equal((await s.list())[0].id,d.id);assert.equal((await readFile(f.file,'utf8')).includes('token'),false)}finally{await f.done()}});
test('publishing is fail-closed because OIDC subject cannot be bound to person URN',async()=>{const f=await fixture();try{const s=createStore(f.file),d=await s.draft('hi');let calls=0;await assert.rejects(publishDraft({store:s,id:d.id,tty:true,token:'fake',fetchImpl:async()=>{calls++}}),/publishing disabled/i);assert.equal(calls,0);assert.equal((await s.get(d.id)).status,'pending')}finally{await f.done()}});
test('concurrent draft writes preserve every draft',async()=>{const f=await fixture();try{const s=createStore(f.file);const results=await Promise.allSettled(Array.from({length:12},(_,i)=>s.draft(`draft ${i}`)));assert.equal(results.filter(x=>x.status==='fulfilled').length,12);assert.equal((await s.list()).length,12)}finally{await f.done()}});
test('atomic claim permits only one claimant and sending remains non-retryable',async()=>{const f=await fixture();try{const s=createStore(f.file),d=await s.draft('hi');const r=await Promise.allSettled([s.claim(d.id),s.claim(d.id)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await s.get(d.id)).status,'sending');await assert.rejects(s.claim(d.id),/non-retryable/i)}finally{await f.done()}});
