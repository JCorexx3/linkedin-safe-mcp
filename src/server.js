import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {createStore} from './core.js';import path from 'node:path';import {homedir} from 'node:os';
const store=createStore(path.join(homedir(),'.linkedin-safe-mcp','drafts.json'));
const server=new Server({name:'linkedin-safe-mcp',version:'1.0.0'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:'draft_post',description:'Create a local pending draft; does not publish.',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text']}},{name:'list_pending',description:'List local pending drafts and status.',inputSchema:{type:'object',properties:{},additionalProperties:false}}]}));
server.setRequestHandler(CallToolRequestSchema,async({params})=>{try{if(params.name==='draft_post')return {content:[{type:'text',text:JSON.stringify(await store.draft(params.arguments.text))}]};if(params.name==='list_pending')return {content:[{type:'text',text:JSON.stringify((await store.list()).filter(x=>x.status==='pending'))}]};throw Error('Unknown tool') }catch(e){return {isError:true,content:[{type:'text',text:e.message}]}}});
await server.connect(new StdioServerTransport());
