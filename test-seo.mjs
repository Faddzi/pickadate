import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import worker from './worker.mjs';
import {brandAssets} from './seo.mjs';
const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)},DB:{prepare(){return {bind(){return this},async first(){return {id:'synthetic',slug:'ourstory',profile:'{}'}}}}}};
const get=(path,host='suratwala.in',method='GET')=>worker.fetch(new Request('https://'+host+path,{method}),env,{waitUntil(){}});
for(const path of ['/','/help'])assert.match((await get(path)).headers.get('X-Robots-Tag'),/^index, follow/);
for(const path of ['/tool','/invite/'+'a'.repeat(48),'/tool.html','/couple.html'])assert.match((await get(path)).headers.get('X-Robots-Tag'),/^noindex/);
assert.match((await get('/','ourstory.suratwala.in')).headers.get('X-Robots-Tag'),/^noindex/);
assert.match((await get('/','example.workers.dev')).headers.get('X-Robots-Tag'),/^noindex/);
for(const [from,to] of [['/index.html','/'],['/help.html','/help']]){const r=await get(from+'?source=test');assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://suratwala.in'+to+'?source=test')}
const sitemap=await (await get('/sitemap.xml')).text();assert.equal((sitemap.match(/<loc>/g)||[]).length,2);assert.ok(!/tool|invite|ourstory/.test(sitemap));
assert.equal((await get('/sitemap.xml','ourstory.suratwala.in')).status,404);
assert.match(await (await get('/robots.txt')).text(),/Sitemap: https:\/\/suratwala.in\/sitemap.xml/);
assert.ok(!(await (await get('/robots.txt','ourstory.suratwala.in')).text()).includes('Sitemap:'));
for(const asset of brandAssets){const r=await get('/'+asset);assert.equal(r.status,200,asset);assert.ok(r.headers.get('Content-Type'),asset);assert.equal((await get('/'+asset,'suratwala.in','HEAD')).body,null)}
const generated=readdirSync('public');
for(const file of ['server.mjs','worker.mjs','schema.sql','README.md','.env'])assert.ok(!generated.includes(file),'Private source must not be staged: '+file);
for(const file of generated)assert.deepEqual(readFileSync('public/'+file),readFileSync(file),'Generated asset differs from root source: '+file);
const html=readFileSync('index.html','utf8');assert.ok(html.includes('rel="canonical" href="https://suratwala.in/"'));assert.ok(html.includes('https://suratwala.in/share-card.png'));
assert.equal((html.match(/<h1\b/g)||[]).length,1,'Homepage must have exactly one H1, including hidden previews');
assert.ok(!/<h[1-6]\b[^>]*>\s*<\/h[1-6]>/.test(html),'Headings must not be empty');
const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(data['@graph'][1].isAccessibleForFree,true);
for(const name of ['favicon-96.png','apple-touch-icon.png','icon-192.png','icon-512.png','share-card.png']){const b=readFileSync(name);assert.equal(b.subarray(1,4).toString(),'PNG');if(name==='share-card.png'){assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),630)}}
console.log('PASS: public discovery, private noindex, canonical redirects, tenant sitemap isolation, icon MIME/HEAD, structured data and PNG dimensions');
