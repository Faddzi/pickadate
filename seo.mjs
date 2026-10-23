// Keep discovery confined to the public marketing and help pages.
export const brandAssets=['favicon.svg','favicon-96.png','apple-touch-icon.png','icon-192.png','icon-512.png','share-card.png','site.webmanifest'];
export const assetTypes={'.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json; charset=utf-8'};
const origin='https://suratwala.in';
export function seoRoute(url){
 const main=url.hostname==='suratwala.in';
 if(main&&['/index.html','/help.html'].includes(url.pathname)){
  const target=new URL(url);target.pathname=url.pathname==='/index.html'?'/':'/help';
  return new Response(null,{status:308,headers:{Location:target.href}});
 }
 if(url.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /api/\n'+(main?'Sitemap: '+origin+'/sitemap.xml\n':''),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
 if(url.pathname==='/sitemap.xml')return new Response(main?'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+origin+'/</loc></url><url><loc>'+origin+'/help</loc></url></urlset>':'Not found.',{status:main?200:404,headers:{'Content-Type':main?'application/xml; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600','X-Robots-Tag':main?'index, follow':'noindex, nofollow'}});
}
export function seoHeaders(url,file){
 const publicPage=url.hostname==='suratwala.in'&&['/','/help'].includes(url.pathname);
 return file.endsWith('.html')?{'X-Robots-Tag':publicPage?'index, follow, max-image-preview:large':'noindex, nofollow, noarchive'}:{};
}
