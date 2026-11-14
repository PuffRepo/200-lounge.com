const test = require('node:test');
const assert = require('node:assert/strict');
const {sortLeaderboard, filterLeaderboard} = require('../lib/leaderboard-sort.cjs');
const {COLUMNS} = require('../lib/leaderboard-transport.cjs');

const roster = [
  {player_id:'900000000000000003', 'Player Name':'未配置 ★', Country:'', Rank:null, MMR:null, 'Peak MMR':null, 'Win Rate':null, 'Events Played':0, 'Partner AVG':null, 'AVG Score':null, 'Largest Gain':0, 'Largest Loss':0},
  {player_id:'900000000000000002', 'Player Name':'Zelda', Country:'US', Rank:2, MMR:7500, 'Peak MMR':8000, 'Win Rate':0.9, 'Events Played':10, 'Partner AVG':99.25, 'AVG Score':100.25, 'Largest Gain':200, 'Largest Loss':-200},
  {player_id:'900000000000000001', 'Player Name':'alice', Country:'JP', Rank:1, MMR:9000, 'Peak MMR':9500, 'Win Rate':0.1, 'Events Played':20, 'Partner AVG':90.25, 'AVG Score':99.25, 'Largest Gain':300, 'Largest Loss':-100},
  {player_id:'900000000000000004', 'Player Name':'10stars', Country:'CA', Rank:3, MMR:0, 'Peak MMR':0, 'Win Rate':0, 'Events Played':1, 'Partner AVG':0, 'AVG Score':0, 'Largest Gain':0, 'Largest Loss':0},
];
const ids = rows => rows.map(row => row.player_id);

test('every numeric column sorts in both directions with an unfiltered mixed roster', () => {
  for (const column of COLUMNS.filter(c => !['player_id','Player Name','Country'].includes(c))) {
    for (const ascending of [true,false]) {
      const sorted = sortLeaderboard(filterLeaderboard(roster),column,ascending);
      const rated = sorted.filter(row => row[column] !== null);
      assert.equal(sorted.length, roster.length);
      for (let i=1; i<rated.length; i++) {
        assert.ok(ascending ? rated[i-1][column] <= rated[i][column] : rated[i-1][column] >= rated[i][column], column);
      }
      const missing = sorted.findIndex(row => row[column] === null);
      if (missing !== -1) assert.ok(sorted.slice(missing).every(row => row[column] === null), column);
    }
  }
});

test('player names sort alphabetically, including symbols, Unicode and numeric prefixes', () => {
  const expected = [...roster].sort((a,b) => a['Player Name'].localeCompare(b['Player Name'],'en',{sensitivity:'base'}));
  assert.deepEqual(ids(sortLeaderboard(roster,'Player Name',true)),ids(expected));
  assert.deepEqual(ids(sortLeaderboard(roster,'Player Name',false)),ids(expected.reverse()));
  assert.equal(sortLeaderboard(roster,'Player Name',true)[0]['Player Name'],'10stars');
});

test('country uses text comparisons and unknown countries stay last', () => {
  assert.deepEqual(sortLeaderboard(roster,'Country',true).map(r=>r.Country),['CA','JP','US','']);
  assert.deepEqual(sortLeaderboard(roster,'Country',false).map(r=>r.Country),['US','JP','CA','']);
});

test('win rates distinguish zero, missing, decimals and numeric strings', () => {
  const rows = [null,'100%',0,'9.25%',50,'',undefined,'N/A'].map((value,i)=>({player_id:String(i),'Win Rate':value}));
  assert.deepEqual(sortLeaderboard(rows,'Win Rate',true).slice(0,4).map(r=>r['Win Rate']),[0,'9.25%',50,'100%']);
  assert.deepEqual(sortLeaderboard(rows,'Win Rate',false).slice(0,4).map(r=>r['Win Rate']),['100%',50,'9.25%',0]);
});

test('sorting copies the source and deterministic ties preserve full Discord IDs', () => {
  const frozen = Object.freeze(roster.map(row=>Object.freeze({...row})));
  const before = ids(frozen);
  sortLeaderboard(frozen,'MMR',false);
  assert.deepEqual(ids(frozen), before);
  const tied = ['900000000000000002','900000000000000001'].map(player_id=>({player_id,'Player Name':'same',MMR:100}));
  assert.deepEqual(ids(sortLeaderboard(tied,'MMR',true)),[tied[1].player_id,tied[0].player_id]);
});

test('blank filters retain unplaced rows; explicit bounds filter only numeric ratings', () => {
  assert.deepEqual(filterLeaderboard(roster),roster);
  assert.equal(filterLeaderboard(roster,{minMMR:'0'}).length,3);
  assert.equal(filterLeaderboard(roster,{maxMMR:'0'}).length,1);
  assert.equal(filterLeaderboard(roster,{minMMR:0,maxMMR:0}).length,1);
  assert.equal(filterLeaderboard(roster,{query:'0'}).length,4);
  assert.equal(filterLeaderboard(roster,{country:'US',minEvents:'10',maxMMR:'8000'})[0]['Player Name'],'Zelda');
  assert.equal(filterLeaderboard(roster,{query:'未配置'})[0].MMR,null);
});

test('empty results and all-unplaced rosters sort in every visible column', () => {
  for (const column of COLUMNS.slice(1)) {
    assert.deepEqual(sortLeaderboard([],column,false),[]);
    const unplaced=[roster[0],{...roster[0],player_id:'5','Player Name':'another'}];
    assert.equal(sortLeaderboard(unplaced,column,false).length,2);
  }
});

test('large roster sorts fully before pagination, without dropping unplaced players', () => {
  const rows=Array.from({length:1916},(_,i)=>({...roster[i%4],player_id:String(900000000000000000n+BigInt(i)),'Player Name':`Player ${i}`}));
  for (const column of COLUMNS.slice(1)) {
    const sorted=sortLeaderboard(filterLeaderboard(rows),column,true);
    const pages=Array.from({length:Math.ceil(sorted.length/50)},(_,i)=>sorted.slice(i*50,(i+1)*50));
    assert.equal(new Set(pages.flat().map(r=>r.player_id)).size,1916);
  }
});

test('production Tailwind output includes shared Emerald and Ruby classes', async () => {
  const postcss=require('postcss');
  const tailwind=require('tailwindcss');
  const path=require('node:path');
  const root=path.resolve(__dirname,'..');
  const config=require('../tailwind.config.js');
  const css=(await postcss([tailwind({...config,content:config.content.map(glob=>path.join(root,glob))})]).process('@tailwind utilities;',{from:undefined})).css;
  const {rankClass}=require('../lib/rank-colors.cjs');
  assert.equal(rankClass(7499,9),rankClass(6000,9));
  assert.equal(rankClass(7500,9),'text-[#50C878]');
  assert.equal(rankClass(8999,9),'text-[#50C878]');
  assert.equal(rankClass(9000,9),'text-rose-500');
  assert.ok(css.includes('.text-\\[\\#50C878\\]'),'shared Emerald class missing from built CSS');
  assert.ok(css.includes('80 200 120'),'approved Emerald color missing');
  assert.ok(css.includes('.text-rose-500'),'shared Ruby class missing from built CSS');
});
