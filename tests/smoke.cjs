// Production-build smoke test; local synthetic public data only, no database or bot.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
async function main(){
  const root=path.resolve(__dirname,'..'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'s9-smoke-'));
  const file=path.join(dir,'public.json'),fixture=structuredClone(require('./fixtures/s9.json'));
  fixture.players[0].country_code='JP';fixture.players[11].country_code='US';
  fixture.generated_at=new Date().toISOString();await fs.writeFile(file,JSON.stringify(fixture));
  const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const standalone=process.env.STANDALONE_SMOKE==='1';
  if(standalone){
    await fs.cp(path.join(root,'public'),path.join(root,'.next/standalone/public'),{recursive:true});
    await fs.cp(path.join(root,'.next/static'),path.join(root,'.next/standalone/.next/static'),{recursive:true});
  }
  const args=standalone?[path.join(root,'.next/standalone/server.js')]:[require.resolve('next/dist/bin/next'),'start','-p',String(port),'--hostname','127.0.0.1'];
  const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,PORT:String(port),HOSTNAME:'127.0.0.1',S9_PUBLIC_DATA_FILE:file},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const base=`http://127.0.0.1:${port}`;
  try{
    let ready=false;
    for(let n=0;n<100;n++){
      if(child.exitCode!==null)throw new Error(output);
      try{const res=await fetch(base+'/api/all_players');if(res.status===200){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(ready,'Server did not become ready: '+output);
    for(const [route,status] of [['/api/health',200],['/',200],['/player/P12',200],['/player/P13',200],['/player/NotFound',404],['/mogi/1',200],['/mogi/999',404],['/stats',200],['/records',200],['/api/all_players?player_id=123456789123456789',200],['/api/player/P12',200],['/api/discord/12',200],['/api/stats',200],['/api/stats/getCountOfPlayersInEachRank',200],['/?season=8',404]]){
      const response=await fetch(base+route),body=await response.text();
      assert.equal(response.status,status,route+' '+body.slice(0,150));
      if(route.startsWith('/api/all_players'))assert.equal(JSON.parse(body)[0].player_id,'123456789123456789');
      if(route==='/api/player/P12'){assert.equal(JSON.parse(body)[0].mmr,5900);assert.equal(JSON.parse(body)[0].country_code,'US');}
      if(route==='/')assert.ok(body.includes('/flags/jp.svg'),'leaderboard flag missing');
      if(route==='/player/P12')assert.ok(body.includes('/flags/us.svg'),'profile flag missing');
      assert.ok(!body.includes('/flags/.svg'),'unknown country created a broken image');
      if(route==='/player/P13')assert.ok(body.includes('Unplaced'));
      console.log('PASS',status,route);
    }
    const flag=await fetch(base+'/flags/jp.svg');assert.equal(flag.status,200);assert.ok((await flag.text()).includes('<svg'));
    console.log('PASS bundled flag HTTP asset');
    fixture.generated_at=new Date(Date.now()-901000).toISOString();await fs.writeFile(file,JSON.stringify(fixture));
    assert.equal((await fetch(base+'/api/all_players')).status,503);
    assert.equal((await fetch(base+'/api/health')).status,503);
    const unavailable=await fetch(base+'/');assert.equal(unavailable.status,503);assert.ok((await unavailable.text()).includes('S9 data unavailable'));
    console.log('PASS stale feed: API and page return 503 without historical fallback');
  }finally{
    child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(resolve=>setTimeout(resolve,3000))]);
    if(child.exitCode===null)child.kill('SIGKILL');
    await fs.rm(dir,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
