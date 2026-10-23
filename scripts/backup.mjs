import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const MAGIC=Buffer.from('PD-BK1\n');
function keyFrom(value){const key=Buffer.from(value||'','base64');if(key.length!==32||key.toString('base64')!==value)throw Error('BACKUP_KEY must be a base64-encoded random 32-byte key.');return key}
export function encryptBackup(sql,keyValue){const key=keyFrom(keyValue),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(MAGIC);const encrypted=Buffer.concat([cipher.update(gzipSync(sql)),cipher.final()]);return Buffer.concat([MAGIC,iv,cipher.getAuthTag(),encrypted])}
export function decryptBackup(data,keyValue){const key=keyFrom(keyValue);if(data.length<36||!data.subarray(0,MAGIC.length).equals(MAGIC))throw Error('Unknown backup format.');const offset=MAGIC.length,decipher=createDecipheriv('aes-256-gcm',key,data.subarray(offset,offset+12));decipher.setAAD(MAGIC);decipher.setAuthTag(data.subarray(offset+12,offset+28));const compressed=Buffer.concat([decipher.update(data.subarray(offset+28)),decipher.final()]);return gunzipSync(compressed,{maxOutputLength:128*1024*1024})}
export async function exportSQL({account,database,token,fetcher=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms))}){
 if(!/^[a-f0-9]{32}$/.test(account||'')||!/^[-a-f0-9]{36}$/.test(database||'')||!token)throw Error('Missing or invalid backup configuration.');
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+database+'/export';let bookmark;
 for(let attempt=0;attempt<40;attempt++){
  const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({output_format:'polling',...(bookmark?{current_bookmark:bookmark}:{})}),signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)throw Error('D1 backup export was rejected (HTTP '+response.status+').');
  const data=await response.json(),result=data.result;if(!data.success||!result||result.status==='error')throw Error('D1 backup export failed.');
  if(result.status==='complete'){
   const url=new URL(result.result?.signed_url);if(url.protocol!=='https:')throw Error('Invalid backup download URL.');
   const download=await fetcher(url,{signal:AbortSignal.timeout(60000),redirect:'error'});if(!download.ok||!download.body)throw Error('Backup download failed.');
   const chunks=[];let size=0;for await(const chunk of download.body){size+=chunk.byteLength;if(size>128*1024*1024)throw Error('Backup exceeds the 128 MB limit.');chunks.push(Buffer.from(chunk))}if(!size)throw Error('Backup export was empty.');return Buffer.concat(chunks);
  }
  bookmark=result.at_bookmark;if(!bookmark)throw Error('D1 did not return an export bookmark.');await pause(3000);
 }
 throw Error('D1 backup export timed out.');
}
async function main(){const [mode,...args]=process.argv.slice(2),key=process.env.BACKUP_KEY;keyFrom(key);if(mode==='export'){const sql=await exportSQL({account:process.env.CLOUDFLARE_ACCOUNT_ID,database:process.env.D1_DATABASE_ID,token:process.env.CLOUDFLARE_BACKUP_TOKEN});const destination=resolve(args[0]||'backups/pickadate-'+new Date().toISOString().replace(/[:.]/g,'-')+'.pdbak');await mkdir(dirname(destination),{recursive:true});await writeFile(destination,encryptBackup(sql,key),{flag:'wx',mode:0o600});console.log('Encrypted database backup saved.');return}if(mode==='decrypt'&&args.length===2){const plain=decryptBackup(await readFile(resolve(args[0])),key);await writeFile(resolve(args[1]),plain,{flag:'wx',mode:0o600});console.log('Backup decrypted to the new output file. Keep it private.');return}throw Error('Use: node scripts/backup.mjs export [encrypted-output] or decrypt input.pdbak new-output.sql')}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1});
