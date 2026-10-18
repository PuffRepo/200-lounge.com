const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const s9=require('../lib/s9-data.cjs');
const ranks=require('../lib/rank-colors.cjs');
const original=require('./fixtures/s9.json');
const fixture=()=>({...structuredClone(original),generated_at:new Date().toISOString()});

test('Only S9 is available; old page links redirect and archive APIs reject explicitly',()=>{
  assert.equal(s9.season(),9);assert.equal(s9.season({season:'9'}),9);
  for(const season of ['5','6','7'])assert.equal(s9.archiveRedirect({season}).redirect.destination,'/?season=9');
  for(const season of ['5','6','7','8','10','7 OR 1=1',['9','7'],9])assert.throws(()=>s9.season({season}));
});
test('Python-exported contract preserves names, exact Discord IDs and credited MMR',()=>{
  const data=s9.validateSnapshot(fixture());
  assert.equal(data.players[0].user_id,'123456789123456789');
  assert.equal(data.players[0].name,'国際 ★');
  const reduced=data.players.find(p=>p.user_id==='12');
  assert.equal(reduced.mmr,5900);assert.equal(reduced.summary.refunds,100);
  assert.equal(reduced.summary.net_table_delta,-100);
  assert.equal(reduced.history[0].after,5800);assert.equal(reduced.history[0].delta,-100);
});
test('privacy allowlist strips arbitrary extra fields and ignores supplied aggregates',()=>{
  const raw=fixture();raw.token='PRIVATE';raw.players[0].source_json='PRIVATE';raw.tables[0].actor_id=999;
  raw.players[0].summary={net_table_delta:999999};raw.players[0].history[0].reason='PRIVATE';
  const data=s9.validateSnapshot(raw);assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  assert.equal(data.players[0].summary.net_table_delta,200);
  assert.equal(data.tables[0].actor_id,undefined);
});
test('stale, future, wrong-season, invalid-loss and numeric Discord IDs fail closed',()=>{
  const now=Date.now();
  for(const mutate of [r=>r.season='S7',r=>r.generated_at=new Date(now-901000).toISOString(),r=>r.generated_at=new Date(now+301000).toISOString(),r=>r.players[0].user_id=123456789123456789,r=>r.players[11].history[0].delta=-999,r=>r.tables[0].rows.pop(),r=>r.players[0].mkc_id={private:'secret'},r=>r.players[0].rank={private:'secret'},r=>r.players[0].history[0].team={private:'secret'}]){
    const raw=fixture();mutate(raw);assert.throws(()=>s9.validateSnapshot(raw,now));
  }
});
test('unplayed players remain unplaced with no invented zero percent win rate',()=>{
  const data=s9.validateSnapshot(fixture()),p=data.players.find(p=>p.user_id==='13');
  const row=s9.apiPlayer(p);assert.equal(row.mmr,null);assert.equal(row.win_rate,null);assert.equal(row.events_played,0);
  const props=s9.playerProps(data,p.name).props;assert.deepEqual(props.rows,[]);assert.deepEqual(props.lg,[]);
});
test('API lookups filter IDs as strings and never substitute historical records',()=>{
  const data=s9.validateSnapshot(fixture());
  assert.equal(s9.apiPayload(data,'all_players',{player_id:'123456789123456789'})[0].player_name,'国際 ★');
  assert.equal(s9.apiPayload(data,'discord',{id:'123456789123456789'})[0].mmr,6200);
  assert.equal(s9.apiPayload(data,'player',{name:'国際 ★'})[0].player_id,'123456789123456789');
  assert.deepEqual(s9.apiPayload(data,'player',{name:'Not found'}),[]);
  assert.deepEqual(s9.apiPayload(data,'friendcode',{friendcode:'0000-0000-0000'}),[]);
});
test('player and match adapters preserve historical after-balances and expose the refund',()=>{
  const data=s9.validateSnapshot(fixture()),props=s9.playerProps(data,'P12').props;
  assert.equal(props.results[0].mmr,5900);assert.equal(props.rows[0].new_mmr,5800);assert.equal(props.rows[0].refund,100);
  assert.equal(props.rows[0].original_mmr_change,-200);assert.equal(props.rows[0].mmr_change,-200);assert.equal(props.rows[0].effective_mmr_change,-100);
  const reduced=s9.mogiProps(data,data.tables[0].id).props.pm.find(r=>r.player_id==='12');assert.equal(reduced.prev_mmr+reduced.mmr_change,reduced.new_mmr);
  assert.equal(s9.mogiProps(data,data.tables[0].id).props.pm.length,12);
  assert.equal(s9.mogiProps(data,999).notFound,true);
  const records=s9.records(data);assert.equal(records.all2[0].score,200);
});
test('season aggregates count distinct tables and represent all ten S9 ranks',()=>{
  const data=s9.validateSnapshot(fixture()),stats=s9.seasonStats(data);
  assert.equal(stats.total_registered_players[0].count,13);assert.equal(stats.total_mogis_played[0].count,1);
  assert.equal(stats.rank_count_by_player.length,10);
  assert.equal(stats.mogi_format_count.find(r=>r.mogi_format===2).mogi_count,1);
});
test('S9 rank colors follow approved thresholds without changing archive colors',()=>{
  for(const [mmr,name] of [[7500,'Emerald'],[9000,'Ruby'],[10500,'Diamond'],[12000,'Master'],[13500,'Grandmaster']])assert.equal(ranks.rankClass(mmr,9),ranks.colors[name]);
  assert.equal(ranks.rankClass(9000,7),ranks.colors.Master);assert.equal(ranks.rankClass(null),ranks.colors.Placement);
});
function response(){return {headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};}
test('unconfigured S9 API returns 503; archived API never falls through to a legacy database',async t=>{
  const saved={...process.env};delete process.env.S9_PUBLIC_DATA_FILE;delete process.env.S9_PUBLIC_DATA_URL;
  t.after(()=>{process.env=saved;});
  const res=response();assert.equal(await s9.handleApi({query:{}},res,'all_players'),true);
  assert.equal(res.code,503);assert.equal(res.headers['Cache-Control'],'no-store');
  const archived=response();assert.equal(await s9.handleApi({query:{season:'7'}},archived,'all_players'),true);assert.equal(archived.code,400);
  const invalid=response();await s9.handleApi({query:{season:'8'}},invalid,'all_players');assert.equal(invalid.code,400);
});
test('configured JSON refresh is read on each request; stale data cannot stay cached',async t=>{
  const saved={...process.env},dir=await fs.mkdtemp(path.join(os.tmpdir(),'s9-web-'));
  t.after(async()=>{process.env=saved;await fs.rm(dir,{recursive:true,force:true});});
  process.env.S9_PUBLIC_DATA_FILE=path.join(dir,'public.json');
  await fs.writeFile(process.env.S9_PUBLIC_DATA_FILE,JSON.stringify(fixture()));
  const res=response();await s9.handleApi({query:{player_id:'12'}},res,'all_players');assert.equal(res.code,200);assert.equal(res.body[0].mmr,5900);
  const changed=fixture();changed.players[11].mmr=6001;
  await fs.writeFile(process.env.S9_PUBLIC_DATA_FILE,JSON.stringify(changed));
  const updated=response();await s9.handleApi({query:{player_id:'12'}},updated,'all_players');assert.equal(updated.body[0].mmr,6001);
  changed.generated_at=new Date(Date.now()-901000).toISOString();await fs.writeFile(process.env.S9_PUBLIC_DATA_FILE,JSON.stringify(changed));
  const stale=response();await s9.handleApi({query:{}},stale,'all_players');assert.equal(stale.code,503);
});


test('countries reach leaderboard, profile, API and filter; old feeds remain compatible',()=>{
  const raw=fixture();raw.players[0].country_code=' jp ';raw.players[1].country_code='US';
  const data=s9.validateSnapshot(raw),p=data.players[0];
  assert.equal(p.country_code,'JP');assert.equal(s9.leaderboard(data)[0].Country,'JP');
  assert.equal(s9.playerProps(data,p.name).props.results[0].country,'JP');
  assert.equal(s9.apiPlayer(p).country_code,'JP');
  assert.deepEqual(s9.countryList(data),[{country_code:'JP'},{country_code:'US'}]);
  for(const bad of [null,{},'ZZ','../us','<img>', 'USA'])assert.equal(s9.countryCode(bad),'');
  assert.equal(s9.validateSnapshot(fixture()).players[0].country_code,'');
});
test('every accepted country has a bundled flag; unknown codes do not create URLs',async()=>{
  const codes=require('i18n-iso-countries/codes.json');
  for(const [code] of codes)assert.ok((await fs.stat(path.join(__dirname,'../public/flags',code.toLowerCase()+'.svg'))).size>0);
  assert.equal(s9.countryCode('uk'),'');
});


test('score averages floor to exactly two decimal places, preserve zero and missing values',()=>{
  const {formatAverage}=require('../lib/format-average.cjs');
  for(const [input,expected] of [[82.99999,'82.99'],[82.1,'82.10'],[82,'82.00'],[0,'0.00'],[1.15,'1.15'],[1.005,'1.00'],[1e-7,'0.00'],[-1.231,'-1.24'],[null,'N/A'],[undefined,'N/A'],[NaN,'N/A'],[Infinity,'N/A']])assert.equal(formatAverage(input),expected);
});
