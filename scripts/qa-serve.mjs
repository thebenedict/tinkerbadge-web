// Local-only browser QA fixtures. They are never copied into dist/.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const root=path.resolve('dist'); const seen=new Set(); const log=path.resolve('.work/browser-requests.jsonl');
fs.mkdirSync(path.dirname(log),{recursive:true});
const qaScript=`const box=document.createElement('section');box.style.cssText='margin:24px;padding:20px;border:2px solid #a97520;background:#fff;color:#222;font:12px monospace';box.setAttribute('aria-label','QA diagnostics');const title=document.createElement('h2');title.textContent='QA diagnostics';box.append(title);const metrics=document.createElement('button');metrics.textContent='Capture resource metrics';const loss=document.createElement('button');loss.textContent='Simulate graphics context loss';const output=document.createElement('pre');output.id='qa-output';output.style.whiteSpace='pre-wrap';metrics.addEventListener('click',()=>{const resources=performance.getEntriesByType('resource').filter(r=>!r.name.includes('__qa'));output.textContent=JSON.stringify({resources:resources.map(r=>({path:new URL(r.name).pathname,bytes:r.transferSize,ms:Math.round(r.duration)})),initialNavigation:performance.getEntriesByType('navigation').map(r=>({bytes:r.transferSize,domContentLoadedMs:Math.round(r.domContentLoadedEventEnd)})),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth},null,2);});loss.addEventListener('click',()=>{const canvas=document.querySelector('#model-host canvas');const gl=canvas?.getContext('webgl2');const ext=gl?.getExtension('WEBGL_lose_context');if(ext){ext.loseContext();output.textContent='Graphics context loss requested.';}else output.textContent='No active WebGL context.';});box.append(metrics,loss,output);document.body.append(box);`;
const noWebGL=`const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.call(this,type,...args);};`;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.glb':'model/gltf-binary','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');let route=decodeURIComponent(u.pathname);
 if(route==='/__qa.js'||route==='/__no-webgl.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(route==='/__qa.js'?qaScript:noWebGL);return;}
 const match=route.match(/^\/(metrics|fail-model|fail-drawing|slow-model|no-webgl|no-js|context-loss|fail-components|mismatch-components|slow-components)(\/.*)?$/);const mode=match?.[1]||'metrics';if(match)route=match[2]||'/';
 let target=path.resolve(root,'.'+route);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}
 try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');}catch{res.writeHead(404).end();return;}
 const ext=path.extname(target),key=mode+route;
 const fail=(mode==='fail-components'&&route.endsWith('/components.json'))||(mode==='fail-model'&&ext==='.glb')||(mode==='fail-drawing'&&ext==='.svg'&&/\/(schematic|layers)\//.test(route));
 if(fail&&!seen.has(key)){seen.add(key);fs.appendFileSync(log,JSON.stringify({mode,route,status:503,bytes:0})+'\n');res.writeHead(503).end('Intentional first-request failure for QA');return;}
 if((mode==='slow-model'&&ext==='.glb')||(mode==='slow-components'&&route.endsWith('/components.json')))await new Promise(r=>setTimeout(r,5000));
 let bytes;try{bytes=fs.readFileSync(target);}catch{res.writeHead(404).end();return;}
 if(mode==='mismatch-components'&&route.endsWith('/components.json')){const data=JSON.parse(bytes);data.bindingId='intentional-stale-index';bytes=Buffer.from(JSON.stringify(data));}
 if(ext==='.html'&&mode!=='no-js'){let html=bytes.toString();if(mode==='no-webgl')html=html.replace('</head>','<script src="/__no-webgl.js"></script></head>');html=html.replace('</body>','<script type="module" src="/__qa.js"></script></body>');bytes=Buffer.from(html);}
 const headers={'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'};
 if(mode==='no-js')headers['Content-Security-Policy']="sandbox allow-same-origin";
 fs.appendFileSync(log,JSON.stringify({mode,route,status:200,bytes:bytes.length})+'\n');res.writeHead(200,headers).end(bytes);
}).listen(4183,'127.0.0.1',()=>console.log('QA fixtures: http://127.0.0.1:4183/metrics/ (also fail-model, fail-drawing, slow-model, no-webgl, no-js, context-loss)'));
