import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createStore, publishDraft} from '../src/core.js';

async function fixture(){const dir=await mkdtemp(path.join(process.env.TMPDIR||os.tmpdir(),'li-safe-')); return {dir,file:path.join(dir,'drafts.json'),done:()=>rm(dir,{recursive:true,force:true})};}
test('drafts are locally pending and listing never exposes tokens',async()=>{const f=await fixture();try{const s=createStore(f.file);const d=await s.draft('hello');assert.equal((await s.list())[0].id,d.id);assert.equal((await readFile(f.file,'utf8')).includes('token'),false)}finally{await f.done()}});
test('publishing is fail-closed because OIDC subject cannot be bound to person URN',async()=>{const f=await fixture();try{const s=createStore(f.file),d=await s.draft('hi');let calls=0;await assert.rejects(publishDraft({store:s,id:d.id,tty:true,token:'fake',fetchImpl:async()=>{calls++}}),/publishing disabled/i);assert.equal(calls,0);assert.equal((await s.get(d.id)).status,'pending')}finally{await f.done()}});
test('concurrent draft writes preserve every draft',async()=>{const f=await fixture();try{const s=createStore(f.file);const results=await Promise.allSettled(Array.from({length:12},(_,i)=>s.draft(`draft ${i}`)));assert.equal(results.filter(x=>x.status==='fulfilled').length,12);assert.equal((await s.list()).length,12)}finally{await f.done()}});
test('atomic claim permits only one claimant and sending remains non-retryable',async()=>{const f=await fixture();try{const s=createStore(f.file),d=await s.draft('hi');const r=await Promise.allSettled([s.claim(d.id),s.claim(d.id)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await s.get(d.id)).status,'sending');await assert.rejects(s.claim(d.id),/non-retryable/i)}finally{await f.done()}});

test('supported local draft kinds validate payloads and persist metadata only',async()=>{const f=await fixture();try{const s=createStore(f.file);for(const [kind,payload] of [['comment',{text:'hello',targetReference:'urn:example:post:1'}],['reaction',{reaction:'LIKE',targetReference:'urn:example:post:1'}],['event',{title:'Meetup',startsAt:'2027-01-02T10:00:00Z'}],['image_post',{text:'caption',altText:'description',imageLabel:'mock-image'}]])assert.equal((await s.draftItem(kind,payload)).status,'pending');await assert.rejects(s.draftItem('image_post',{text:'x',altText:'y',imageLabel:'z',path:'C:/secret'}),/unsupported field/);await assert.rejects(s.draftItem('reaction',{reaction:'PUBLISH',targetReference:'x'}),/unsupported reaction/);assert.equal((await s.list()).length,4)}finally{await f.done()}});

test('unrecognized drafts.json is never overwritten; legacy rows migrate without loss',async()=>{
  const f=await fixture();
  try{
    const store=createStore(f.file);
    const unrelated='{"customer":"private","items":[1]}';
    await writeFile(f.file,unrelated);
    await assert.rejects(store.draft('new'),/format invalid/);
    assert.equal(await readFile(f.file,'utf8'),unrelated);
    const legacy=[{id:'123e4567-e89b-42d3-a456-426614174000',text:'old draft',status:'pending',createdAt:'2026-01-01T00:00:00.000Z'}];
    await writeFile(f.file,JSON.stringify(legacy));
    await store.draft('new');
    const stored=JSON.parse(await readFile(f.file,'utf8'));
    assert.equal(stored.format,'linkedin-safe-mcp/drafts-v1');
    assert.equal(stored.items.length,2);
    assert.equal(stored.items[0].text,'old draft');
  }finally{await f.done()}
});
