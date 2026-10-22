"""Generate the Workers adapter from the checked local API and stage public assets."""
from pathlib import Path
import re, shutil, json
root=Path(__file__).resolve().parent
source=(root/'server.mjs').read_text(encoding='utf-8')
schema=re.search(r'db.exec\(`(.*?)`\);',source,re.S).group(1)
schema=schema.replace('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;','PRAGMA foreign_keys=ON;')
schema+='\nCREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);\n'
(root/'schema.sql').write_text(schema,encoding='utf-8')
helpers=source[source.index('const token='):source.index('const mime=')]
helpers=re.sub(r'const attempts=new Map\(\);\s*function rate\(req\)\{.*?\}\s*function password', '''async function rate(req){const now=Date.now(),window=Math.floor(now/900000),key=hash(req.socket.remoteAddress+':'+window);const row=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+900000).first();if(row.count>30)fail('Too many attempts. Please try again in 15 minutes.',429);ctx.waitUntil(env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(now).run())}
function password''',helpers,flags=re.S)
helpers=re.sub(r'async function body\(req\)\{.*?\}\s*$', '''async function body(req){let text='';const reader=request.body?.getReader();if(reader){const decoder=new TextDecoder();let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>500000){await reader.cancel();fail('That upload is too large.',413)}text+=decoder.decode(value,{stream:true})}text+=decoder.decode()}try{return JSON.parse(text||'{}')}catch{fail('Invalid request.')}}
''',helpers,flags=re.S)
handlers=source[source.index(' const url=new URL'):source.index(" const file=p===")]
handlers=handlers.replace("new URL(req.url,'http://localhost')","new URL(request.url)")
handlers=handlers.replace('process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`','new URL(request.url).origin')
helpers=helpers.replace('function auth(req)','async function auth(req)').replace('function owned(req,id)','async function owned(req,id)').replace('const user=auth(req)','const user=await auth(req)')
handlers=handlers.replace('function session(id)','async function session(id)').replace('const id=auth(req)','const id=await auth(req)').replace('const user=auth(req)','const user=await auth(req)').replace('const s=owned(req,sm[1])','const s=await owned(req,sm[1])').replace('rate(req);','await rate(req);')
handlers=handlers.replace("process.env.PUBLIC_ORIGIN?.startsWith('https:')","new URL(request.url).protocol==='https:'")
def endparen(text,start):
 depth=0;quote=None;escape=False
 for i in range(start,len(text)):
  c=text[i]
  if quote:
   if escape:escape=False
   elif c=='\\':escape=True
   elif c==quote:quote=None
   continue
  if c in "'\"`":quote=c
  elif c=='(':depth+=1
  elif c==')':
   depth-=1
   if depth==0:return i
 raise ValueError('Unbalanced expression')
def adapt(text):
 while 'db.prepare(' in text:
  start=text.index('db.prepare(');open1=start+len('db.prepare');end1=endparen(text,open1);sql=text[open1+1:end1]
  match=re.match(r'\.(get|all|run)\(',text[end1+1:]);assert match
  op=match.group(1);open2=end1+1+len(match.group(0))-1;end2=endparen(text,open2);args=text[open2+1:end2]
  replacement="(await query('"+op+"',"+sql+(','+args if args else '')+'))'
  text=text[:start]+replacement+text[end2+1:]
 return text
handlers=handlers.replace("const im=p.match", "const im=p.match")
helpers=adapt(helpers);handlers=adapt(handlers)
prefix="""import {addressStatus,tenantName,RESERVED_NAMES} from './tenant.mjs';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
export default {async fetch(request,env,ctx){
const send=(code,data,headers={})=>new Response(JSON.stringify(data),{status:code,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...headers}});
const req={url:request.url,method:request.method,headers:Object.fromEntries(request.headers),socket:{remoteAddress:request.headers.get('CF-Connecting-IP')||'local'}};
async function query(op,sql,...args){const statement=env.DB.prepare(sql).bind(...args);if(op==='get')return statement.first();if(op==='all')return (await statement.all()).results;return statement.run()}
"""
suffix="""
const file=p==='/tool'||p.startsWith('/invite/')?'tool.html':p==='/'?'index.html':p.slice(1);
if(!['index.html','style.css','app.js','tool.html','tool.js','tool-next.js','tool.css','couple.html','couple.js','addresses.js'].includes(file))return send(404,{error:'Not found.'});
const assetURL=new URL(request.url);assetURL.pathname='/'+file;
const response=await env.ASSETS.fetch(new Request(assetURL,request));const headers=new Headers(response.headers);headers.set('Referrer-Policy','no-referrer');headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Cache-Control','no-cache');return new Response(response.body,{status:response.status,headers});
}catch(e){if(!e.status)console.error(e.message);return send(e.status||(String(e.message).includes('UNIQUE constraint failed')?409:500),{error:e.status?e.message:String(e.message).includes('UNIQUE constraint failed')?'That address or email is already in use.':'Something went wrong. Please try again.'})}
}};
"""
tenant_code="""
const host=new URL(request.url).hostname,tenant=tenantName(host);
if(tenant!==null){
 if(tenant==='www'||tenant==='pickadate')return Response.redirect('https://suratwala.in'+new URL(request.url).pathname,302);
 if(!addressStatus(tenant).valid)return send(404,{error:'This address is not available.'});
 const space=await query('get','SELECT id,slug,profile FROM spaces WHERE slug=?',tenant);
 if(!space)return send(404,{error:'This little address is waiting for its story.'});
 const pathname=new URL(request.url).pathname;
 if(pathname==='/api/couple'&&request.method==='GET'){const invitation=await query('get','SELECT token,details,status FROM invites WHERE space_id=? ORDER BY created DESC,id DESC LIMIT 1',space.id);return send(200,{slug:space.slug,profile:JSON.parse(space.profile),invitation:invitation?{...invitation,details:JSON.parse(invitation.details)}:null},{'X-Robots-Tag':'noindex, nofollow'})}
 if(pathname.startsWith('/api/')){const match=pathname.match(/^\\/api\\/invitations\\/([a-f0-9]{48})$/);if(!match)return send(404,{error:'Not found.'});const allowed=await query('get','SELECT id FROM invites WHERE token=? AND space_id=?',match[1],space.id);if(!allowed)return send(404,{error:'Invitation not found.'})}
 if(pathname==='/'){const assetURL=new URL(request.url);assetURL.pathname='/couple.html';const result=await env.ASSETS.fetch(new Request(assetURL,request));const headers=new Headers(result.headers);headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Referrer-Policy','no-referrer');return new Response(result.body,{status:result.status,headers})}
 if(pathname==='/tool')return Response.redirect('https://suratwala.in/tool',302);
}
"""
(root/'worker.mjs').write_text(prefix+helpers+'try{\n'+tenant_code+handlers+suffix,encoding='utf-8')
public=root/'public';public.mkdir(exist_ok=True)
for name in ['index.html','style.css','app.js','tool.html','tool.js','tool-next.js','tool.css','couple.html','couple.js','addresses.js']:shutil.copyfile(root/name,public/name)
print('Prepared Workers API, D1 schema, and public assets.')
