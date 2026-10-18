const colors={Placement:'text-gray-400',Iron:'text-stone-500',Bronze:'text-orange-400',Silver:'text-gray-400',Gold:'text-yellow-500',Platinum:'dark:text-cyan-600 text-cyan-900',Emerald:'text-emerald-500',Ruby:'text-rose-500',Diamond:'dark:text-cyan-200 text-cyan-500',Master:'dark:text-violet-500 text-zinc-900',Grandmaster:'text-red-800'};
function rankClass(mmr,season=9) {
  if(mmr===null||mmr===undefined)return colors.Placement;
  const ranks=Number(season)===9?[[13500,'Grandmaster'],[12000,'Master'],[10500,'Diamond'],[9000,'Ruby'],[7500,'Emerald'],[6000,'Platinum'],[4500,'Gold'],[3000,'Silver'],[1500,'Bronze']]:[[11000,'Grandmaster'],[9000,'Master'],[7500,'Diamond'],[6000,'Platinum'],[4500,'Gold'],[3000,'Silver'],[1500,'Bronze']];
  return colors[ranks.find(([minimum])=>mmr>=minimum)?.[1]||'Iron'];
}
module.exports={rankClass,colors};
