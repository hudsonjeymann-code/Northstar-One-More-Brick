import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const appDirectory=fileURLToPath(new URL('../',import.meta.url));
const code=fs.readFileSync(appDirectory+'service-worker.js','utf8');
const scope='https://example.test/Project-52-Ironwall/';
const key=value=>new URL(typeof value==='string'?value:value.url,scope).href;
const cacheMaps=new Map(),handlers=new Map(),checks=[];let offline=false,fetches=0,claims=0,skip=0;
const caches={async keys(){return [...cacheMaps.keys()];},async delete(name){return cacheMaps.delete(name);},async open(name){if(!cacheMaps.has(name))cacheMaps.set(name,new Map());const map=cacheMaps.get(name);return{
 async addAll(items){for(const item of items){const file=item==='./'?'index.html':item.replace('./','');assert.ok(fs.existsSync(appDirectory+file));map.set(key(item),new Response('shell:'+file));}},
 async match(request){return map.get(key(request))?.clone();},async put(request,response){map.set(key(request),response.clone());}
 };},async match(request){for(const map of cacheMaps.values())if(map.has(key(request)))return map.get(key(request)).clone();}};
const self={registration:{scope},location:{origin:new URL(scope).origin},clients:{claim:async()=>{claims++;}},skipWaiting(){skip++;},addEventListener:(name,fn)=>handlers.set(name,fn)};
const context={self,caches,URL,Response,fetch:async request=>{fetches++;if(offline)throw new Error('Offline');return new Response('network:'+key(request),{status:200});}};
vm.createContext(context);vm.runInContext(code,context);
async function test(name,fn){await fn();checks.push({name,pass:true});}
async function lifecycle(type){let pending;handlers.get(type)({waitUntil:p=>{pending=p;}});await pending;}
async function request(url,mode='navigate',method='GET'){let response;handlers.get('fetch')({request:{url:new URL(url,scope).href,mode,method},respondWith:p=>{response=p;}});return response===undefined?undefined:await response;}
await test('Every install-shell resource exists and caches successfully',()=>lifecycle('install'));
const own=[...cacheMaps.keys()][0];
await test('Cache is isolated to this repository path',()=>assert.ok(own.startsWith('p52scope-project-52-ironwall-')));
await test('Install does not force a worker swap',()=>assert.equal(skip,0));
cacheMaps.set('p52scope-project-52-ironwall-old',new Map());cacheMaps.set('p52scope-other-app-old',new Map());
await lifecycle('activate');
await test('Activation removes only this app’s outdated cache',()=>{assert.equal(cacheMaps.has('p52scope-project-52-ironwall-old'),false);assert.equal(cacheMaps.has('p52scope-other-app-old'),true);});
await test('Activation claims the current app',()=>assert.equal(claims,1));
await test('Online navigation loads and refreshes the cache',async()=>assert.ok((await (await request('index.html')).text()).startsWith('network:')));
offline=true;
await test('Offline navigation restores the cached app shell',async()=>assert.ok((await (await request('index.html')).text()).startsWith('network:')));
await test('An unvisited offline route falls back to index.html',async()=>assert.ok((await (await request('missing-route')).text()).startsWith('network:')));
await test('Cached icons remain usable offline',async()=>assert.equal(await (await request('icon-192.png','no-cors')).text(),'shell:icon-192.png'));
await test('Cross-origin traffic is not intercepted',async()=>assert.equal(await request('https://other.example/private','cors'),undefined));
await test('Non-GET traffic is not intercepted',async()=>assert.equal(await request('index.html','cors','POST'),undefined));
await test('Only the explicit update message swaps workers',()=>{handlers.get('message')({data:{type:'OTHER'}});assert.equal(skip,0);handlers.get('message')({data:{type:'SKIP_WAITING'}});assert.equal(skip,1);});
const report={checkedAt:new Date().toISOString(),passed:checks.length,total:checks.length,checks,limit:'Service-worker simulation; actual iPhone airplane-mode launch remains a device acceptance step.'};
console.log(JSON.stringify(report,null,2));
