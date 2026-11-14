import SeasonPreservingLink from './SeasonPreservingLink'
import styles from '../styles/MatchScoreboard.module.css'

export default function MatchScoreboard({scoreboard}) {
  const teamFormat = scoreboard.teamSize > 1
  return (
    <section className={styles.container} aria-label="Race results">
      <table className={styles.table}>
        <caption className={styles.caption}>
          Race results · {scoreboard.format} · 12 races
        </caption>
        <thead>
          <tr>
            <th scope="col">Place</th>
            <th scope="col">Player</th>
            <th scope="col">Score</th>
            {teamFormat && <th scope="col">Team total</th>}
          </tr>
        </thead>
        {scoreboard.teams.map(team=>(
          <tbody key={team.id} className={styles.team}>
            {team.players.map((player,index)=>(
              <tr key={player.id}>
                {index === 0 && <th scope="rowgroup" rowSpan={team.players.length}>{team.place}</th>}
                <td className={styles.player}>
                  <SeasonPreservingLink to={'/player/' + encodeURIComponent(player.currentName)}>
                    {player.name}
                  </SeasonPreservingLink>
                </td>
                <td>{player.score}</td>
                {teamFormat && index === 0 && <td className={styles.total} rowSpan={team.players.length}>{team.total}</td>}
              </tr>
            ))}
          </tbody>
        ))}
        <tfoot>
          <tr><th scope="row" colSpan={2}>Total points</th><td colSpan={teamFormat ? 2 : 1}>{scoreboard.total}</td></tr>
        </tfoot>
      </table>
      <p className={styles.note}>Names and scores as recorded for this match.</p>
    </section>
  )
}
