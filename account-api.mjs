import {randomBytes,createHash,scryptSync} from 'node:crypto';
const random=()=>randomBytes(32).toString('hex');
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=(text,status=400)=>{throw Object.assign(Error(text),{status})};
const emailOf=v=>typeof v==='string'?v.trim().toLowerCase().slice(0,254):'';
const emailOK=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const accountSchema=`
CREATE TABLE IF NOT EXISTS account_state(user_id TEXT PRIMARY KEY REFERENCES users(id),verified_at INTEGER);
CREATE TABLE IF NOT EXISTS account_tokens(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,expires INTEGER NOT NULL,consumed TEXT);
CREATE INDEX IF NOT EXISTS account_tokens_user ON account_tokens(user_id,kind);
CREATE TABLE IF NOT EXISTS memory_trash(memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,deleted_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`;

export async function purgeAccountData(batch){const cutoff=Date.now()-30*86400000;await batch([['DELETE FROM memories WHERE id IN (SELECT memory_id FROM memory_trash WHERE deleted_at<=?)',cutoff],['DELETE FROM memory_trash WHERE deleted_at<=?',cutoff],['DELETE FROM account_tokens WHERE expires<?',Date.now()],['DELETE FROM rate_limits WHERE expires<?',Date.now()]]);}

export function accountAPI({query,batch,auth,owned,body,send,mail,origin,ip}){
 async function limit(key,max,window){const now=Date.now();const r=await query('get','INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count',digest('account:'+key),now+window,now,now);if(r.count>max)fail('Please wait before trying again.',429)}
 async function state(id){const row=await query('get','SELECT email,verified_at FROM users LEFT JOIN account_state ON users.id=account_state.user_id WHERE users.id=?',id);return {email:row.email,verified:!!row.verified_at,emailReady:mail.ready}}
 async function issue(id,email,kind){
  if(!mail.ready)fail('Account emails are not available yet. Please try again later.',503);
  const raw=random(),hashed=digest(raw),minutes=kind==='reset'?30:1440;
  await query('run','INSERT INTO account_tokens(token,user_id,kind,expires) VALUES(?,?,?,?)',hashed,id,kind,Date.now()+minutes*60000);
  const url=origin+'/tool#'+kind+'='+raw;
  try{await mail.send({to:email,subject:kind==='reset'?'Reset your Pick a Date password':'Verify your Pick a Date email',text:(kind==='reset'?'Choose a new password for your little space.':'Confirm this email belongs to you.')+'\n\n'+url+'\n\nThis link works once and expires in '+(kind==='reset'?'30 minutes.':'24 hours.')+' If you did not request it, you can ignore this email.'})}
  catch{await query('run','DELETE FROM account_tokens WHERE token=?',hashed);throw Error('Account email delivery failed.')}
 }
 const cleanup=()=>purgeAccountData(batch);
 async function route(p,m){
  if(p==='/api/account'&&m==='GET'){const id=await auth();return send(200,await state(id))}
  if(p==='/api/account/verification'&&m==='POST'){const id=await auth();await limit('ip:'+ip,30,900000);await limit('verify:'+id,5,3600000);const user=await state(id);if(user.verified)return send(200,{ok:true,message:'Your email is verified.'});await issue(id,user.email,'verify');return send(200,{ok:true,message:'Check your inbox for a verification link.'})}
  if(p==='/api/account/forgot'&&m==='POST'){
   await limit('ip:'+ip,30,900000);const b=await body(),email=emailOf(b.email);if(!emailOK(email))fail('Please enter a valid email.');await limit('reset:'+email,5,3600000);
   if(!mail.ready)fail('Account emails are not available yet. Please try again later.',503);
   const user=await query('get','SELECT id FROM users WHERE email=?',email);
   // The response is identical for existing and unknown addresses. Delivery runs
   // outside the response path so provider timing cannot reveal account existence.
   if(user)mail.defer(issue(user.id,email,'reset').catch(()=>mail.failed()));
   return send(200,{ok:true,message:'If an account uses that email, a reset link will arrive shortly. It expires in 30 minutes.'});
  }
  if(['/api/account/verify','/api/account/reset'].includes(p)&&m==='POST'){
   await limit('ip:'+ip,30,900000);const b=await body(),kind=p.endsWith('/reset')?'reset':'verify';
   if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))fail('This link is invalid or has expired. Request a new one.');
   const hashed=digest(b.token),t=await query('get','SELECT * FROM account_tokens WHERE token=? AND kind=? AND expires>? AND consumed IS NULL',hashed,kind,Date.now());
   if(!t)fail('This link is invalid or has expired. Request a new one.');
   if(kind==='reset'&&(typeof b.password!=='string'||b.password.length<10||b.password.length>128))fail('Choose a password of 10 to 128 characters.');
   const nonce=random(),now=Date.now();const statements=[['UPDATE account_tokens SET consumed=? WHERE token=? AND consumed IS NULL AND expires>?',nonce,hashed,now]];
   const condition=' EXISTS(SELECT 1 FROM account_tokens WHERE token=? AND consumed=?)';
   if(kind==='reset'){const salt=randomBytes(16).toString('hex'),password=salt+':'+scryptSync(b.password,salt,64).toString('hex');statements.push(['UPDATE users SET password=? WHERE id=? AND'+condition,password,t.user_id,hashed,nonce],['DELETE FROM sessions WHERE user_id=? AND'+condition,t.user_id,hashed,nonce]);}
   statements.push(['INSERT INTO account_state(user_id,verified_at) SELECT ?,? WHERE'+condition+' ON CONFLICT(user_id) DO UPDATE SET verified_at=excluded.verified_at',t.user_id,now,hashed,nonce]);
   statements.push(['UPDATE account_tokens SET consumed=? WHERE user_id=? AND consumed IS NULL AND'+condition,nonce,t.user_id,hashed,nonce]);
   const result=await batch(statements);if(!(result[0].meta?.changes??result[0].changes))fail('This link has already been used. Request a new one.');
   return send(200,{ok:true,message:kind==='reset'?'Password updated. Sign in with your new password.':'Email verified. Your little space is ready.'},kind==='reset'?{'Set-Cookie':'pd_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'}:{});
  }
  const match=p.match(/^\/api\/spaces\/([a-f0-9]+)\/memories\/(export|trash|[a-f0-9]+)(?:\/(restore))?$/);
  if(!match)return null;
  const space=await owned(match[1]);await cleanup();const action=match[2];
  if(action==='export'&&m==='GET'){const rows=await query('all','SELECT memories.*,memory_trash.deleted_at FROM memories LEFT JOIN memory_trash ON memories.id=memory_trash.memory_id WHERE space_id=? ORDER BY created DESC',space.id);return send(200,{format:'pickadate-scrapbook',version:1,exportedAt:new Date().toISOString(),space:{slug:space.slug,profile:JSON.parse(space.profile)},memories:rows.map(r=>({id:r.id,created:r.created,deletedAt:r.deleted_at||null,...JSON.parse(r.details)}))},{'Content-Disposition':'attachment; filename="'+space.slug+'-scrapbook.json"'})}
  if(action==='trash'&&m==='GET'){const rows=await query('all','SELECT memories.*,memory_trash.deleted_at FROM memories JOIN memory_trash ON memories.id=memory_trash.memory_id WHERE space_id=? ORDER BY deleted_at DESC',space.id);return send(200,{memories:rows.map(r=>({...r,details:JSON.parse(r.details)}))})}
  const memory=await query('get','SELECT id FROM memories WHERE id=? AND space_id=?',action,space.id);if(!memory)fail('Memory not found.',404);
  if(m==='DELETE'&&!match[3]){await query('run','INSERT INTO memory_trash(memory_id,deleted_at) VALUES(?,?) ON CONFLICT(memory_id) DO NOTHING',memory.id,Date.now());return send(200,{ok:true})}
  if(m==='POST'&&match[3]==='restore'){if((await query('get','SELECT count(*) AS n FROM memories WHERE space_id=? AND id NOT IN (SELECT memory_id FROM memory_trash)',space.id)).n>=50)fail('Make room in your scrapbook before restoring this memory.');await query('run','DELETE FROM memory_trash WHERE memory_id=?',memory.id);return send(200,{ok:true})}
  return null;
 }
 return {route,state,issue,cleanup};
}

export function emailTransport(env,defer=p=>{p.catch(()=>{})}){
 const ready=!!env.MAIL_FROM&&!!(env.EMAIL?.send||env.RESEND_API_KEY);
 return {ready,defer,failed:()=>console.error('Account email delivery failed.'),async send(message){
  if(!ready)throw Error('Email sender unavailable');
  if(env.EMAIL?.send)return env.EMAIL.send({...message,from:env.MAIL_FROM});
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({...message,from:env.MAIL_FROM}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Email provider rejected delivery');
 }};
}
