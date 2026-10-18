// Shared column order avoids repeating property names for every player in page JSON.
const COLUMNS=['player_id','Rank','Country','Player Name','MMR','Peak MMR','Win Rate','Events Played','Partner AVG','AVG Score','Largest Gain','Largest Loss'];
const DEFAULTS=[null,null,'','',null,null,null,0,null,null,0,0];
function packLeaderboard(rows) {
  return rows.map(row=>{
    const values=COLUMNS.map(key=>row[key]);
    while(values.length>4 && values.at(-1)===DEFAULTS[values.length-1])values.pop();
    return values;
  });
}
function unpackLeaderboard(packed) {
  return packed.map(values=>Object.fromEntries(COLUMNS.map((key,index)=>[key,index<values.length?values[index]:DEFAULTS[index]])));
}
module.exports={COLUMNS,packLeaderboard,unpackLeaderboard};
