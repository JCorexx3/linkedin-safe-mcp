#!/usr/bin/env node
import {createStore} from './core.js';
import {randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import path from 'node:path';
const store=createStore(path.join(homedir(),'.linkedin-safe-mcp','drafts.json'));
const [cmd,...args]=process.argv.slice(2);
if(cmd==='draft'){const d=await store.draft(args.join(' '));console.log(JSON.stringify(d,null,2))}
else if(cmd==='list'||cmd==='status'){const all=await store.list();console.log(JSON.stringify(cmd==='status'?all.filter(x=>x.id===args[0]):all,null,2))}
else if(cmd==='publish'){
 console.error('Publishing disabled: LinkedIn OIDC userinfo.sub is not a verified person URN binding.');process.exit(2)
}else{console.error('Usage: draft <text> | list | status [id] | publish <draft-id>');process.exit(2)}
