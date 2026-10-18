const test=require('node:test');
const assert=require('node:assert/strict');
const s9=require('../lib/s9-data.cjs');
const {COLUMNS,packLeaderboard,unpackLeaderboard}=require('../lib/leaderboard-transport.cjs');
const fixture=()=>({...structuredClone(require('./fixtures/s9.json')),generated_at:new Date().toISOString()});

test('compact leaderboard preserves exact names, IDs, all scores and default column order',()=>{
  const data=s9.validateSnapshot(fixture()),rows=s9.leaderboard(data);
  rows[0].Country='JP';rows[0]['Player Name']='国際 ★ <Player>';
  const before=structuredClone(rows),packed=packLeaderboard(rows);
  assert.deepEqual(unpackLeaderboard(packed),before);
  assert.deepEqual(rows,before);
  assert.deepEqual(Object.keys(unpackLeaderboard(packed)[0]),COLUMNS);
  assert.equal(unpackLeaderboard(packed)[0].player_id,'123456789123456789');
  assert.equal(unpackLeaderboard(packed)[0]['Player Name'],'国際 ★ <Player>');
  assert.equal(unpackLeaderboard(packed).find(p=>p.player_id==='13').MMR,null);
  assert.deepEqual(packLeaderboard([]),[]);assert.deepEqual(unpackLeaderboard([]),[]);
});

test('unplayed players omit only defaults; null statistics stay distinct from real zero scores',()=>{
  const rows=s9.leaderboard(s9.validateSnapshot(fixture())),unplayed=rows.find(p=>p.player_id==='13');
  const played={...rows[0],'Partner AVG':0,'AVG Score':0,'Win Rate':0};
  const packed=packLeaderboard([unplayed,played]);
  assert.equal(packed[0].length,4);
  assert.deepEqual(unpackLeaderboard(packed),[unplayed,played]);
});

test('1916-player page stays below Next 128 KiB warning threshold without dropping players',()=>{
  const data=s9.validateSnapshot(fixture()),base=s9.leaderboard(data);
  const rows=Array.from({length:1916},(_,i)=>({...base[i%base.length],player_id:String(388071499770230000n+BigInt(i)),Country:i%2?'JP':'US','Player Name':i%13===0?'国際 ★ '+i:'Player '+i}));
  const oldBytes=Buffer.byteLength(JSON.stringify({rows,current_season:9,countries:s9.countryList(data),s9GeneratedAt:data.generated_at}));
  const packed=packLeaderboard(rows);
  const newBytes=Buffer.byteLength(JSON.stringify({leaderboard:packed,current_season:9,countries:s9.countryList(data),s9GeneratedAt:data.generated_at}));
  assert.ok(oldBytes>400000);assert.ok(newBytes<128*1024,`compact page was ${newBytes} bytes`);
  assert.deepEqual(unpackLeaderboard(packed),rows);
  assert.ok(newBytes<oldBytes*.4);
});
