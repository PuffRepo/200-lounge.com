const test=require('node:test');
const assert=require('node:assert/strict');
const {matchScoreboard}=require('../lib/match-scoreboard.cjs');
const s9=require('../lib/s9-data.cjs');
const fixture=require('./fixtures/s9.json');

test('all supported formats retain 12 players and all 984 recorded points',()=>{
  for (const size of [1,2,3,4]) {
    const table=structuredClone(fixture.tables[0]);
    table.format_size=size;
    table.rows.forEach((row,i)=>{row.team=Math.floor(i/size);row.place=Math.floor(i/size)+1;});
    const result=matchScoreboard(table);
    assert.equal(result.format,size===1?'FFA':`${size}v${size}`);
    assert.equal(result.total,984);
    assert.equal(result.teams.length,12/size);
    assert.ok(result.teams.every(team=>team.players.length===size));
    assert.equal(result.teams.reduce((sum,team)=>sum+team.total,0),984);
    assert.equal(new Set(result.teams.flatMap(team=>team.players.map(player=>player.id))).size,12);
  }
});

test('team totals, recorded ties and finishing places survive shuffled source rows',()=>{
  const table=structuredClone(fixture.tables[0]);
  table.rows.filter(row=>row.team===1).forEach(row=>row.place=1);
  table.rows.reverse();
  const result=matchScoreboard(table);
  assert.deepEqual(result.teams.map(team=>team.id),[0,1,2,3,4,5]);
  assert.deepEqual(result.teams.slice(0,2).map(team=>team.place),[1,1]);
  assert.equal(result.teams[0].total,200);
  assert.equal(result.teams[1].total,180);
});

test('uses historical played-as name for scores and current name for profile lookup',()=>{
  const table=structuredClone(fixture.tables[0]);
  table.rows[0].played_as='国際 ★ / # & ?';
  table.rows[0].name='Renamed player';
  const result=matchScoreboard(table);
  const player=result.teams.flatMap(team=>team.players).find(player=>player.id==='123456789123456789');
  assert.equal(player.name,'国際 ★ / # & ?');
  assert.equal(player.currentName,'Renamed player');
});

test('scoreboard does not expose balance changes, audit fields or mutate source data',()=>{
  const table=structuredClone(fixture.tables[0]);
  table.secret='private';table.rows[0].reason='private';
  const before=JSON.stringify(table);
  const result=matchScoreboard(table);
  assert.equal(JSON.stringify(table),before);
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.ok(!JSON.stringify(result).includes('refund'));
});

test('S9 match page receives a scoreboard even when no image URL exists',()=>{
  const raw=structuredClone(fixture);raw.generated_at=new Date().toISOString();
  const data=s9.validateSnapshot(raw);
  const props=s9.mogiProps(data,'1').props;
  assert.equal(props.results[0].table_url,null);
  assert.equal(props.scoreboard.total,984);
  assert.equal(props.scoreboard.teams[0].players.length,2);
  assert.equal(props.pm.length,12);
  assert.equal(s9.mogiProps(data,'999').notFound,true);
});
