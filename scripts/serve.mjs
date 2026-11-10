import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..',process.env.VIEWER_DIST??'dist');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary','.pdf':'application/pdf','.zip':'application/zip','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end('Invalid path');return;}
  let target=path.resolve(ROOT,'.'+pathname);if(target!==ROOT&&!target.startsWith(ROOT+path.sep)){res.writeHead(403).end('Forbidden');return;}
  try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');if(!fs.statSync(target).isFile())throw new Error();}catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}fs.createReadStream(target).pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log(`Local viewer: http://127.0.0.1:${port}\nServing static dist/ only. Ctrl+C stops the preview.`));
