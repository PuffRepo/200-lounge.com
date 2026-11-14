// Reconstruct the public scoreboard from recorded scores, not expiring image URLs.
function matchScoreboard(table) {
  const teams = new Map();
  for (const row of table.rows) {
    if (!teams.has(row.team)) teams.set(row.team, {id:row.team, place:row.place, total:0, players:[]});
    const team = teams.get(row.team);
    team.total += row.score;
    team.players.push({id:row.user_id, name:row.played_as, currentName:row.name, score:row.score});
  }
  return {
    id:table.id,
    format:table.format_size === 1 ? 'FFA' : `${table.format_size}v${table.format_size}`,
    teamSize:table.format_size,
    total:table.rows.reduce((sum,row)=>sum+row.score,0),
    teams:[...teams.values()].sort((a,b)=>a.place-b.place || a.id-b.id).map(team=>({
      ...team, players:[...team.players].sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id)),
    })),
  };
}

module.exports = {matchScoreboard};
