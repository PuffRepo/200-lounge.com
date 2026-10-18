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
    for(const route of ['/?season=5','/player/P12?season=6','/mogi/1?season=7','/stats?season=5','/records?season=7']) {
      const response=await fetch(base+route,{redirect:'manual'});assert.equal(response.status,307,route);assert.equal(response.headers.get('location'),'/?season=9');
    }
    const oldStats=await fetch(base+'/new_stats?season=5',{redirect:'manual'});assert.equal(oldStats.status,307);assert.equal(oldStats.headers.get('location'),'/stats?season=9');
    assert.equal((await fetch(base+'/api/all_players?season=5')).status,400);
    const html=await (await fetch(base+'/')).text();
    assert.ok(!/season [567]<|season [567]\s*</.test(html),'unavailable season links exposed');
    assert.ok(html.includes('100.00'),'average not formatted to two decimals');
    console.log('PASS S9-only navigation, archived link redirects and floored averages');
    const flag=await fetch(base+'/flags/jp.svg');assert.equal(flag.status,200);assert.ok((await flag.text()).includes('<svg'));
    console.log('PASS bundled flag HTTP asset');
    // Reproduce the production roster size without live data or a database.
    const large=structuredClone(fixture);
    for(let i=14;i<=1916;i++)large.players.push({...structuredClone(fixture.players.find(p=>p.user_id==='13')),user_id:String(900000000000000000n+BigInt(i)),mkc_id:null,name:`FixturePlayer-${i}`,country_code:i%2?'JP':'US'});
    await fs.writeFile(file,JSON.stringify(large));
    const largePage=await fetch(base+'/?season=9');assert.equal(largePage.status,200);
    const largeHtml=await largePage.text(),match=largeHtml.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(match,'Next page data missing');
    const next=JSON.parse(match[1]);
    assert.equal(next.props.pageProps.leaderboard.length,1916);
    assert.equal(next.props.pageProps.rows,undefined);
    const decoded=require('../lib/leaderboard-transport.cjs').unpackLeaderboard(next.props.pageProps.leaderboard);
    assert.equal(decoded.at(-1)['Player Name'],'FixturePlayer-1916');
    assert.equal(decoded.find(row=>row.player_id==='12').MMR,5900);
    const pageBytes=Buffer.byteLength(match[1]);assert.ok(pageBytes<128*1024,`Next page data was ${pageBytes} bytes`);
    console.log('PASS 1916-player page JSON:',pageBytes,'bytes; full roster preserved');
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
