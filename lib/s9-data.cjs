// Server-side adapter for the explicitly public V2 snapshot, never SQLite or R2 backups.
const fs = require('node:fs/promises');
const CURRENT_SEASON = 9;
const {countryCode}=require('./country-code.cjs');
function season(query = {}) {
  const value = query.season === undefined ? '9' : query.season;
  if (typeof value !== 'string' || !['5','6','7','9'].includes(value)) {
    const error = new Error('Unsupported season'); error.status = 400; throw error;
  }
  return Number(value);
}
const allowed = (object, keys) => Object.fromEntries(keys.map(key => [key, object[key]]));
function validateSnapshot(raw, now = Date.now(), maxAge = 900) {
  if (!raw || raw.schema_version !== 1 || raw.season !== 'S9' || !Array.isArray(raw.players) || !Array.isArray(raw.tables) || !Array.isArray(raw.rank_policy)) throw new Error('Invalid S9 snapshot');
  const stamp = Date.parse(raw.generated_at);
  if (!Number.isFinite(stamp) || stamp > now + 300000 || now - stamp > maxAge * 1000) throw new Error('S9 snapshot is stale or has an invalid timestamp');
  const rowKeys = ['user_id','name','played_as','score','team','place','before','after','kind','original_delta','delta','refund'];
  const historyKeys = [...rowKeys,'table_id','sequence','tier','format_size','applied_at','partner_scores'];
  const expectedRanks=[['Iron',0],['Bronze',1500],['Silver',3000],['Gold',4500],['Platinum',6000],['Emerald',7500],['Ruby',9000],['Diamond',10500],['Master',12000],['Grandmaster',13500]];
  if(JSON.stringify(raw.rank_policy.map(r=>[r.name,r.minimum]))!==JSON.stringify(expectedRanks))throw new Error('Invalid S9 rank policy');
  const ids = new Set();
  const integer = value => Number.isSafeInteger(value);
  const rating = value => value === null || (integer(value) && value >= 1);
  const id = value => typeof value === 'string' && /^[1-9][0-9]{0,19}$/.test(value);
  const checkRow = row => {
    if (!id(row.user_id) || typeof row.name !== 'string' || typeof row.played_as !== 'string' || !integer(row.team) || row.team < 0 || row.team > 11 || !integer(row.place) || row.place < 1 || row.place > 12 || !integer(row.score) || row.score < 0 || row.score > 180 || !rating(row.before) || !integer(row.after) || row.after < 1 || !integer(row.refund) || row.refund < 0 || !['placement','table'].includes(row.kind)) throw new Error('Invalid S9 result');
    if(row.refund>0 && (row.original_delta>=0 || row.delta>0))throw new Error('Invalid S9 refund');
    if (row.kind === 'placement' ? row.delta !== null || row.original_delta !== null || row.before !== null || row.refund !== 0 : !integer(row.delta) || !integer(row.original_delta) || row.before === null || row.delta !== row.original_delta + row.refund || row.after - row.before !== row.original_delta) throw new Error('Invalid S9 result accounting');
  };
  const players = raw.players.map(p => {
    if (!id(p.user_id) || ids.has(p.user_id) || typeof p.name !== 'string' || !p.name.length || p.name.length>128 || (p.mkc_id!==null && (!integer(p.mkc_id)||p.mkc_id<1)) || (p.position!==null && (!integer(p.position)||p.position<1)) || typeof p.rank!=='string' || !['Placement',...expectedRanks.map(r=>r[0])].includes(p.rank) || !rating(p.mmr) || !rating(p.peak_mmr) || !Array.isArray(p.history)) throw new Error('Invalid S9 player');
    ids.add(p.user_id);
    const player = allowed(p,['user_id','name','mkc_id','mmr','rank','position','peak_mmr']);
    player.country_code = countryCode(p.country_code);
    player.history = p.history.map(h => { checkRow(h); if (h.user_id !== p.user_id || !Array.isArray(h.partner_scores) || !h.partner_scores.every(s => integer(s) && s >= 0 && s <= 180) || typeof h.applied_at !== 'string' || !Number.isFinite(Date.parse(h.applied_at+'Z')) || !integer(h.table_id) || h.table_id<1 || !integer(h.sequence) || h.sequence<1 || !['tier-all','tier-a','tier-b','tier-c'].includes(h.tier) || ![1,2,3,4].includes(h.format_size)) throw new Error('Invalid S9 history'); return allowed(h,historyKeys); });
    player.summary = summary(player.history);
    return player;
  });
  const tableIds = new Set();
  const tables = raw.tables.map(t => {
    if (typeof t.applied_at!=='string' || !Number.isFinite(Date.parse(t.applied_at+'Z')) || !integer(t.id) || t.id < 1 || tableIds.has(t.id) || !integer(t.sequence) || ![1,2,3,4].includes(t.format_size) || !['tier-all','tier-a','tier-b','tier-c'].includes(t.tier) || !Array.isArray(t.rows) || t.rows.length !== 12 || new Set(t.rows.map(r=>r.user_id)).size !== 12 || t.rows.reduce((sum,r)=>sum+r.score,0)!==984) throw new Error('Invalid S9 table');
    tableIds.add(t.id);
    return {...allowed(t,['id','sequence','tier','format_size','applied_at']),rows:t.rows.map(r=>{checkRow(r);if(!ids.has(r.user_id))throw new Error('Unknown S9 player');return allowed(r,rowKeys);})};
  });
  if (raw.rank_policy.length !== 10 || raw.rank_policy.some((r,i) => typeof r.name !== 'string' || !integer(r.minimum) || (i && r.minimum <= raw.rank_policy[i-1].minimum))) throw new Error('Invalid S9 ranks');
  return {schema_version:1,season:'S9',generated_at:raw.generated_at,rank_policy:raw.rank_policy.map(r=>allowed(r,['name','minimum'])),players,tables};
}
function summary(history) {
  const deltas = history.map(h=>h.delta).filter(d=>d!==null);
  const avg = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const recent = history.slice(0,10).map(h=>h.delta).filter(d=>d!==null);
  return {tables:history.length,rated_tables:deltas.length,placements:history.length-deltas.length,
    gains:deltas.filter(d=>d>0).length,losses:deltas.filter(d=>d<0).length,ties:deltas.filter(d=>d===0).length,
    gain_rate:deltas.length ? 100*deltas.filter(d=>d>0).length/deltas.length : null,
    refunds:history.reduce((s,h)=>s+h.refund,0),net_table_delta:deltas.reduce((a,b)=>a+b,0),
    average_score:avg(history.map(h=>h.score)),top_score:history.length?Math.max(...history.map(h=>h.score)):null,
    partner_average:avg(history.flatMap(h=>h.partner_scores)),largest_gain:Math.max(0,...deltas),largest_loss:Math.min(0,...deltas),
    last_ten:{gains:recent.filter(d=>d>0).length,losses:recent.filter(d=>d<0).length,ties:recent.filter(d=>d===0).length,delta:recent.reduce((a,b)=>a+b,0)}};
}
async function loadSnapshot() {
  const maxAge = Number(process.env.S9_MAX_AGE_SECONDS || 900);
  if (!Number.isInteger(maxAge) || maxAge < 60 || maxAge > 86400) throw new Error('Invalid S9 freshness setting');
  let text;
  if (process.env.S9_PUBLIC_DATA_FILE) text = await fs.readFile(process.env.S9_PUBLIC_DATA_FILE,'utf8');
  else if (process.env.S9_PUBLIC_DATA_URL) {
    const url = new URL(process.env.S9_PUBLIC_DATA_URL);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS public JSON source');
    const response = await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('S9 public source unavailable');
    text = await response.text();
  } else throw new Error('S9 public source is not configured');
  if (Buffer.byteLength(text) > 50*1024*1024) throw new Error('S9 snapshot too large');
  return validateSnapshot(JSON.parse(text),Date.now(),maxAge);
}
function apiPlayer(p) {
  const s=p.summary;
  return {player_id:p.user_id,player_name:p.name,country_code:p.country_code || '',mmr:p.mmr,peak_mmr:p.peak_mmr,
    win_rate:s.gain_rate===null?null:s.gain_rate.toFixed(2),last_ten:`${s.last_ten.gains}-${s.last_ten.losses}-${s.last_ten.ties}`,
    'gain/loss (last 10)':s.last_ten.delta,events_played:s.tables,largest_gain:s.largest_gain,largest_loss:s.largest_loss,
    rank_name:p.rank,refunds:s.refunds};
}
function leaderboard(data) {
  return data.players.map(p=>({player_id:p.user_id,Rank:p.position,Country:p.country_code || '','Player Name':p.name,MMR:p.mmr,'Peak MMR':p.peak_mmr,
    'Win Rate':p.summary.gain_rate===null?null:p.summary.gain_rate/100,'Events Played':p.summary.tables,'Partner AVG':p.summary.partner_average,
    'AVG Score':p.summary.average_score,'Largest Gain':p.summary.largest_gain,'Largest Loss':p.summary.largest_loss}));
}
function historyRow(h) {return {mogi_id:h.table_id,mmr_change:h.original_delta,effective_mmr_change:h.delta,new_mmr:h.after,original_mmr_change:h.original_delta,refund:h.refund,title:`${h.tier} ${h.format_size===1?'FFA':`${h.format_size}v${h.format_size}`}`,create_date:Date.parse(h.applied_at+'Z')/1000,score:h.score};}
function playerProps(data,name) {
  const p=data.players.find(p=>p.name===name);if(!p)return {notFound:true};
  const s=p.summary,a=apiPlayer(p);
  const result={...a,country:p.country_code || '','player name':p.name,'peak mmr':p.peak_mmr,'win rate':a.win_rate,'win/loss (last 10)':a.last_ten,'events played':s.tables,'largest gain':s.largest_gain,'largest loss':s.largest_loss};
  return {props:{results:[result],rows:p.history.map(historyRow),
    lg:p.history.filter(h=>h.delta===s.largest_gain).map(h=>({mogi_id:h.table_id})),ll:p.history.filter(h=>h.delta===s.largest_loss).map(h=>({mogi_id:h.table_id})),
    pa:[{pa:s.partner_average}],rank:[{rank:p.position}],score_stuff:[{'top score':s.top_score,'avg score':s.average_score}],
    partner_score_history:p.history.flatMap(h=>h.partner_scores.map(score=>({mogi_id:h.table_id,score,create_date:Date.parse(h.applied_at+'Z')/1000}))),s9GeneratedAt:data.generated_at,season:9,grid_color:'a'}};
}
function mogiProps(data,id) {
  const t=data.tables.find(t=>String(t.id)===String(id));if(!t)return {notFound:true};
  const rated=t.rows.map(r=>r.before).filter(r=>r!==null);
  return {props:{season:9,s9GeneratedAt:data.generated_at,results:[{mogi_id:t.id,table_url:null,tier_name:t.tier.slice(5)}],
    pm:t.rows.map(r=>({player_id:r.user_id,player_name:r.name,prev_mmr:r.before,mmr_change:r.original_delta,effective_mmr_change:r.delta,new_mmr:r.after,place:r.place,refund:r.refund})),
    avg_room_mmr:rated.length?Math.round(rated.reduce((a,b)=>a+b,0)/rated.length):null}};
}
function records(data) {
  const out={};for(const tier of ['all','a','b','c','sq'])for(const size of [1,2,3,4,6])out[tier+size]=[];
  for(const t of data.tables) {
    const groups=new Map();for(const row of t.rows){if(!groups.has(row.team))groups.set(row.team,[]);groups.get(row.team).push(row);}
    for(const rows of groups.values())out[t.tier.slice(5)+t.format_size].push({tier_format:t.tier.slice(5)+t.format_size,mogi_id:t.id,score:rows.reduce((s,r)=>s+r.score,0),players:rows.map(r=>r.name).join(', ')});
  }
  for(const key of Object.keys(out))out[key]=out[key].sort((a,b)=>b.score-a.score||b.mogi_id-a.mogi_id).slice(0,5);
  return out;
}
function countryList(data) {return [...new Set(data.players.map(p=>p.country_code).filter(Boolean))].sort().map(country_code=>({country_code}));}
module.exports={countryCode,countryList,CURRENT_SEASON,season,validateSnapshot,loadSnapshot,summary,apiPlayer,leaderboard,playerProps,mogiProps,records,historyRow};
function seasonStats(data,now=new Date()) {
  const day=t=>t.applied_at.slice(0,10), today=now.toISOString().slice(0,10);
  const top=tables=>tables.flatMap(t=>t.rows.map(r=>({player_name:r.name,mogi_id:t.id,score:r.score,create_date:t.applied_at}))).sort((a,b)=>b.score-a.score||b.mogi_id-a.mogi_id).slice(0,1);
  const mmrs=data.players.map(p=>p.mmr).filter(v=>v!==null).sort((a,b)=>a-b);
  const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  const days=[...new Set(data.tables.map(day))].sort();
  const rankOf=mmr=>mmr===null?'Placement':[...data.rank_policy].reverse().find(r=>mmr>=r.minimum).name;
  const frequencies=new Map();
  for(const t of data.tables){const dt=new Date(t.applied_at+'Z'),key=`${(dt.getUTCDay()+6)%7}:${dt.getUTCHours()}`;frequencies.set(key,(frequencies.get(key)||0)+1);}
  return {today_top_score:top(data.tables.filter(t=>day(t)===today)),today_mogi_count:[{count:data.tables.filter(t=>day(t)===today).length}],
    rank_count_by_player:data.rank_policy.map(r=>({rank_name:r.name,player_count:data.players.filter(p=>p.rank===r.name).length})),
    total_registered_players:[{count:data.players.length}],total_ranked_players:[{count:mmrs.length}],total_mogis_played:[{count:data.tables.length}],
    average_mmr:[{average:avg(mmrs)}],median_mmr:[{median:mmrs.length?(mmrs[Math.floor((mmrs.length-1)/2)]+mmrs[Math.floor(mmrs.length/2)])/2:null}],
    mogi_format_count:[1,2,3,4].map(n=>({mogi_format:n,mogi_count:data.tables.filter(t=>t.format_size===n).length,format_name:n===1?'FFA':`${n}v${n}`})),
    mogi_day_of_week_data:[...frequencies].map(([key,mogi_count])=>{const [day_of_week,hour_of_day]=key.split(':').map(Number);return {day_of_week,hour_of_day,mogi_count};}),
    mogi_count_by_tier:['all','c','b','a'].map(t=>({tier_name:t,mogi_count:data.tables.filter(r=>r.tier==='tier-'+t).length})),
    mogis_per_rank:data.rank_policy.map(r=>({rank_name:r.name,mogis_played:data.tables.filter(t=>t.rows.some(row=>rankOf(row.before)===r.name)).length})),
    all_time_top_score:top(data.tables),avg_mogis_per_day:[{avg_mogis_per_day:days.length?data.tables.length/days.length:0}],
    season_length_in_days:[{season_length_in_days:days.length?Math.floor((Date.parse(days.at(-1))-Date.parse(days[0]))/86400000)+1:0}]};
}
function apiPayload(data,kind,query={}) {
  if(kind==='all_players') {
    const ids=[].concat(query.player_id||[]);
    return data.players.filter(p=>!ids.length||ids.includes(p.user_id)).map(p=>({player_id:p.user_id,player_name:p.name,mmr:p.mmr}));
  }
  if(kind==='player')return data.players.filter(p=>p.name===query.name).map(apiPlayer);
  if(kind==='discord')return data.players.filter(p=>p.user_id===query.id).map(apiPlayer);
  if(kind==='mkc')return data.players.filter(p=>p.mkc_id!==null&&String(p.mkc_id)===query.id).map(p=>({mkc_id:p.mkc_id,player_id:p.user_id,player_name:p.name,country_code:p.country_code || ''}));
  if(kind==='friendcode')return []; // V2 does not collect friend codes.
  if(kind==='mogi')return mogiProps(data,query.id).props?.pm || [];
  const stats=seasonStats(data);
  if(kind==='stats')return stats;
  const fields={getCountOfAllRegisteredPlayers:'total_registered_players',getCountOfAllRankedPlayers:'total_ranked_players',getCountOfAllMogis:'total_mogis_played',getAverageMMR:'average_mmr',getMedianMMR:'median_mmr',getCountOfPlayersInEachRank:'rank_count_by_player',getCountOfMogisByFormat:'mogi_format_count',getTodaysTopScore:'today_top_score',getSeasonTopScore:'all_time_top_score',getTodaysMogiCount:'today_mogi_count',getMogiFrequencyData:'mogi_day_of_week_data',getCountOfMogisByTier:'mogi_count_by_tier',getCountOfMogisByRank:'mogis_per_rank'};
  const field=fields[kind];if(!field)throw new Error('Unknown S9 API');
  if(kind==='getTodaysMogiCount')return stats[field][0];
  if(['getSeasonTopScore','getMogiFrequencyData','getCountOfMogisByTier','getCountOfMogisByRank'].includes(kind))return {data:stats[field]};
  if(kind==='getTodaysTopScore')return {[field]:stats[field][0]||null};
  return {[field]:stats[field]};
}
async function handleApi(req,res,kind) {
  let selected;
  try {selected=season(req.query);}catch(error){res.status(400).json({error:'Unsupported season'});return true;}
  if(selected!==9)return false;
  res.setHeader('Cache-Control','no-store');
  try{
    const data=await loadSnapshot();res.setHeader('X-S9-Generated-At',data.generated_at);
    res.status(200).json(apiPayload(data,kind,req.query));
  }catch(error){res.status(503).json({error:'S9 data is temporarily unavailable; no historical ratings were substituted.'});}
  return true;
}
module.exports={...module.exports,seasonStats,apiPayload,handleApi};
