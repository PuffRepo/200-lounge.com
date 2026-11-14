const test=require('node:test');
const assert=require('node:assert/strict');
const {servePublishedResult}=require('../lib/published-results.cjs');
const png=Buffer.from([137,80,78,71,13,10,26,10,0,1,2]);
const response=()=>({headers:{},code:null,body:null,setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},end(body){this.body=body;return this;}});
const options={source:'https://public-feed.example/public/s9.json',loadSnapshot:async()=>({tables:[{id:84}]})};

test('returns exact image bytes from fixed public feed URL without forwarding cookies or tokens',async()=>{
  const res=response();let called;
  await servePublishedResult({method:'GET',query:{id:'84'},headers:{authorization:'private',cookie:'private'}},res,{
    ...options,fetch:async(url,init)=>{called={url,init};return new Response(png,{headers:{'Content-Type':'image/png'}});},
  });
  assert.equal(res.code,200);assert.deepEqual(res.body,png);
  assert.equal(String(called.url),'https://public-feed.example/public/results/84.png');
  assert.equal(called.init.headers,undefined);assert.equal(called.init.redirect,'error');
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.equal(res.headers['Content-Type'],'image/png');
});

test('HEAD response has no body and preserves PNG length',async()=>{
  const res=response();
  await servePublishedResult({method:'HEAD',query:{id:'84'}},res,{...options,fetch:async()=>new Response(png,{headers:{'Content-Type':'image/png'}})});
  assert.equal(res.code,200);assert.equal(res.body,undefined);assert.equal(Number(res.headers['Content-Length']),png.length);
});

test('invalid IDs, missing tables and non-read methods never request remote images',async()=>{
  let calls=0;const dependencies={...options,fetch:async()=>{calls++;}};
  for(const id of ['0','../84','https://private.example', ['84'],'999']){
    const res=response();await servePublishedResult({method:'GET',query:{id}},res,dependencies);assert.equal(res.code,404);
  }
  const res=response();await servePublishedResult({method:'POST',query:{id:'84'}},res,dependencies);assert.equal(res.code,405);
  assert.equal(calls,0);
});

test('unavailable or stale feed and missing attachment return fallback-compatible errors',async()=>{
  for(const status of [404,429,500]){
    const res=response();await servePublishedResult({method:'GET',query:{id:'84'}},res,{...options,fetch:async()=>new Response(null,{status})});
    assert.equal(res.code,status===404?404:503);assert.equal(res.body,undefined);
  }
  const res=response();let called=false;
  await servePublishedResult({method:'GET',query:{id:'84'}},res,{...options,loadSnapshot:async()=>{throw new Error('secret URL');},fetch:async()=>{called=true;}});
  assert.equal(res.code,503);assert.equal(called,false);assert.equal(res.body,undefined);
});

test('HTML, wrong PNG signature and oversized streaming responses are rejected',async()=>{
  for(const upstream of [
    new Response('<html>no</html>',{headers:{'Content-Type':'text/html'}}),
    new Response('not an image',{headers:{'Content-Type':'image/png'}}),
    new Response(png,{headers:{'Content-Type':'image/png','Content-Length':String(5*1024*1024)}}),
    new Response(Buffer.alloc(4*1024*1024+1),{headers:{'Content-Type':'image/png'}}),
  ]){
    const res=response();await servePublishedResult({method:'GET',query:{id:'84'}},res,{...options,fetch:async()=>upstream});
    assert.equal(res.code,503);assert.equal(res.body,undefined);
  }
});

test('untrusted public source settings never cause image requests',async()=>{
  for(const source of ['http://public-feed.example/data','https://secret:password@public-feed.example/data']){
    const res=response();let called=false;
    await servePublishedResult({method:'GET',query:{id:'84'}},res,{...options,source,fetch:async()=>{called=true;}});
    assert.equal(res.code,503);assert.equal(called,false);
  }
});
