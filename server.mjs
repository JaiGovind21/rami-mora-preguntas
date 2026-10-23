import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const directory=fileURLToPath(new URL('.',import.meta.url));
const backend=process.env.QUESTIONS_BACKEND_URL;
if(!backend)throw new Error('QUESTIONS_BACKEND_URL is required');
const upstream=new URL(backend);
if(upstream.protocol!=='https:' && process.env.NODE_ENV!=='test')throw new Error('Backend must use HTTPS');
const files=new Map([['/',['index.html','text/html; charset=utf-8']],['/admin',['index.html','text/html; charset=utf-8']],['/admin/',['index.html','text/html; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']],['/style.css',['style.css','text/css; charset=utf-8']]]);
const assets=new Map(await Promise.all([...files].map(async([path,[file,type]])=>[path,{body:await readFile(join(directory,file)),type}])));
const limits=new Map();
const sweep=setInterval(()=>{const now=Date.now();for(const [key,value] of limits)if(value.until<now)limits.delete(key)},60000);sweep.unref();
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
async function getBody(req){let data='';for await(const part of req){data+=part;if(Buffer.byteLength(data)>12000)throw new Error('large')}return data}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/healthz')return json(res,200,{ok:true});
 if(url.pathname==='/api/questions'){
  if(!['GET','POST','PATCH'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
  if(req.method!=='GET'){
   const origin=req.headers.origin;
   let allowed=false;try{allowed=!!origin&&new URL(origin).host===req.headers.host}catch{}
   if(!allowed)return json(res,403,{error:'Origen no permitido.'});
  }
  if(req.method==='POST'){
   const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim();const now=Date.now();let bucket=limits.get(ip);
   if(!bucket||bucket.until<now)bucket={count:0,until:now+60000};
   bucket.count++;limits.set(ip,bucket);if(bucket.count>12)return json(res,429,{error:'Esperá un minuto antes de enviar más preguntas.'});
  }
  const data=req.method==='GET'?undefined:await getBody(req);
  const headers={'Content-Type':'application/json','Origin':upstream.origin};
  if(req.headers.authorization)headers.Authorization=req.headers.authorization;
  const response=await fetch(new URL('/api/questions',upstream),{method:req.method,headers,body:data,redirect:'error',signal:AbortSignal.timeout(20000)});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw new Error('Unexpected backend response');
  const body=await response.text();res.writeHead(response.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(body);
 }
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
 const asset=assets.get(url.pathname);if(!asset)return json(res,404,{error:'Página no encontrada.'});
 res.writeHead(200,{'Content-Type':asset.type,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:asset.body);
 }catch(error){json(res,error.message==='large'?413:502,{error:error.message==='large'?'Mensaje demasiado largo.':'No pudimos conectar. Intentá nuevamente en unos segundos.'})}
});
server.listen(Number(process.env.PORT)||10000,'0.0.0.0',()=>console.log('Rami Mora: servicio listo'));
process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000).unref()});
