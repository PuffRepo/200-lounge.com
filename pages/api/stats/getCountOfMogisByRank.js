import s9 from '../../../lib/s9-data.cjs'
import mysql from 'mysql2';

export const config = {
  api: {
    responseLimit: '512kb',
  },
}
export default async function handler(req, res) {
  if(await s9.handleApi(req,res,'getCountOfMogisByRank'))return
  const season = s9.season(req.query)
  const db_choice = `s${season}200lounge`
  const connection = mysql.createConnection({
    host: process.env.db_host,
    user: process.env.db_username,
    password: process.env.db_password,
    database: db_choice,
    insecureAuth: true,
    supportBigNumbers: true,
  });

  try {
    connection.connect();

    // mogis per rank
    let stuff = await new Promise((resolve, reject) => {
      connection.query("SELECT r.rank_name, COUNT(DISTINCT pm.mogi_id) as mogis_played FROM player_mogi pm INNER JOIN ranks r ON pm.prev_mmr BETWEEN r.mmr_min AND r.mmr_max GROUP BY r.rank_name ORDER BY mogis_played DESC;", [], (error, stuff) => {
        if (error) reject(error)
        else resolve(stuff)
      })
    })
    const data = JSON.parse(JSON.stringify(stuff))

    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    console.log('API Success | getCountOfMogisByRank')
    connection.end();
  }
}

