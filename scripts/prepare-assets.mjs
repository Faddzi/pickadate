// Deployment output only. Keep the editable HTML, CSS, JS and images at root.
import {copyFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,basename} from 'node:path';
import {brandAssets} from '../seo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'public');
if(dirname(output)!==resolve(root)||basename(output)!=='public')throw Error('Invalid asset output directory');
const assets=['index.html','style.css','app.js','tool.html','tool.js','tool-next.js','tool.css','couple.html','couple.js','addresses.js','flow.js','account.js','ticket.js','help.html',...brandAssets];
await mkdir(output,{recursive:true});
// Refuse unexpected subdirectories; never recursively remove arbitrary paths.
for(const entry of await readdir(output,{withFileTypes:true})){
 if(!entry.isFile())throw Error('Unexpected entry in generated public directory: '+entry.name);
 if(!assets.includes(entry.name))await unlink(resolve(output,entry.name));
}
for(const name of assets)await copyFile(resolve(root,name),resolve(output,name));
console.log('Prepared '+assets.length+' public assets from root sources.');
