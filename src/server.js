import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {createStore} from './core.js';import path from 'node:path';
const draftFile=process.env.LINKEDIN_SAFE_DRAFTS_FILE;
if (!draftFile || !path.isAbsolute(draftFile) || path.basename(draftFile)!=='drafts.json') {
  throw Error('Set LINKEDIN_SAFE_DRAFTS_FILE to an absolute per-agent drafts.json path before starting the MCP server');
}
const store=createStore(draftFile);
const server=new Server({name:'linkedin-safe-mcp',version:'1.0.0'},{capabilities:{tools:{}}});
const object=(properties,required)=>({type:'object',properties,required,additionalProperties:false});
const draftTools=[['draft_post','post',{text:{type:'string'}},['text']],['draft_comment','comment',{text:{type:'string'},targetReference:{type:'string'}},['text','targetReference']],['draft_reaction','reaction',{reaction:{type:'string',enum:['LIKE','PRAISE','EMPATHY','INTEREST','APPRECIATION','ENTERTAINMENT']},targetReference:{type:'string'}},['reaction','targetReference']],['draft_event','event',{title:{type:'string'},description:{type:'string'},startsAt:{type:'string'},endsAt:{type:'string'},location:{type:'string'}},['title','startsAt']],['draft_image_post','image_post',{text:{type:'string'},altText:{type:'string'},imageLabel:{type:'string'}},['text','altText','imageLabel']]].map(([name,kind,properties,required])=>({name,description:`Create a local ${kind} draft only; no image file read or upload.`,inputSchema:object(properties,required)}));
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...draftTools,{name:'list_pending',description:'List local pending drafts and status.',inputSchema:object({},[])}]}));
server.setRequestHandler(CallToolRequestSchema,async({params})=>{try{const kinds={draft_post:'post',draft_comment:'comment',draft_reaction:'reaction',draft_event:'event',draft_image_post:'image_post'};if(kinds[params.name])return {content:[{type:'text',text:JSON.stringify(await store.draftItem(kinds[params.name],params.arguments))}]};if(params.name==='list_pending')return {content:[{type:'text',text:JSON.stringify((await store.list()).filter(x=>x.status==='pending'))}]};throw Error('Unknown tool') }catch(e){return {isError:true,content:[{type:'text',text:e.message}]}}});
await server.connect(new StdioServerTransport());
