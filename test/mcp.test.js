import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const serverFile=fileURLToPath(new URL('../src/server.js',import.meta.url));

test('MCP advertises only local drafts, stores per-agent, and rejects live actions',async()=>{
  const dir=await mkdtemp(path.join(process.env.TMPDIR||process.cwd(),'linkedin-safe-mcp-test-'));
  const file=path.join(dir,'drafts.json');
  const client=new Client({name:'local-test',version:'1.0.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[serverFile],env:{...process.env,LINKEDIN_SAFE_DRAFTS_FILE:file}});
  try{
    await client.connect(transport);
    const {tools}=await client.listTools();
    assert.deepEqual(tools.map(t=>t.name).sort(),['draft_comment','draft_event','draft_image_post','draft_post','draft_reaction','list_pending'].sort());
    const created=await client.callTool({name:'draft_comment',arguments:{text:'Local comment',targetReference:'urn:example:post:1'}});
    assert.equal(created.isError,undefined);
    const image=await client.callTool({name:'draft_image_post',arguments:{text:'Caption',altText:'Alt',imageLabel:'Asset to add later',path:'C:/private/file.png'}});
    assert.equal(image.isError,true);
    const blocked=await client.callTool({name:'linkedin_create_post',arguments:{text:'Do not post'}});
    assert.equal(blocked.isError,true);
    const pending=await client.callTool({name:'list_pending',arguments:{}});
    assert.equal(JSON.parse(pending.content[0].text).length,1);
    const stored=JSON.parse(await readFile(file,'utf8'));
    assert.equal(stored.format,'linkedin-safe-mcp/drafts-v1');
    assert.equal(stored.items.length,1);
    assert.equal(stored.items[0].kind,'comment');
  }finally{
    await client.close();
    await rm(dir,{recursive:true,force:true});
  }
});
