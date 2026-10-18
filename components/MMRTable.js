import rankColors from '../lib/rank-colors.cjs'
import SeasonPreservingLink from './SeasonPreservingLink';
import styles from '../styles/Table.module.css'

// B) style..cool...
import { styled } from '@mui/material/styles';

// Table stuff
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow, { tableRowClasses } from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
      backgroundColor: '#1d185f',
      fontSize: 20,
      // padding: 10,
  },
  [`&.${tableCellClasses.body}`]: {
      fontSize: 16,
      padding: 3,
      color: theme.palette.text.primary,
      // color: '#e8e6fc',
      // padding: "20px 0px 20px 0px"
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.action.hover,
    // backgroundColor: '#16151a',
  },
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.disabledBackground,
    // backgroundColor: '#050505',
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  [`&.${tableRowClasses.footer}`]: {
    fontSize: 13,
    fontWeight: 750,
    color: theme.palette.text.primary,
    // color: '#e8e6fc',
  },
}));


export default function MMRTable(props) {
  const pm = props.rows

  return (<div className='pb-10'>
    <TableContainer component={Paper} className={styles.leaderboard_style}>
      <Table stickyHeader aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>
              <div className={styles.table_header_text}>
                Player
              </div>
            </StyledTableCell>
            <StyledTableCell>
              <div className={styles.table_header_text}>
                Prev MMR
              </div>
            </StyledTableCell>
            <StyledTableCell>
              <div className={styles.table_header_text}>
                +/-
              </div>
            </StyledTableCell>
            <StyledTableCell>
              <div className={styles.table_header_text}>
                MMR
              </div>
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pm.map((p) => (
            <StyledTableRow key={p.player_id}>

              <StyledTableCell align="center">
                <div className={rankColors.rankClass(p.prev_mmr,props.season ?? 9)}>
                  <div className='cursor-pointer hover:underline'>
                    <SeasonPreservingLink to={`/player/` + encodeURIComponent(p.player_name)}>
                      {p.player_name}
                    </SeasonPreservingLink>
                  </div>
                </div>
              </StyledTableCell>

              <StyledTableCell align="center">
                <div className={rankColors.rankClass(p.prev_mmr,props.season ?? 9)}>
                  {p.prev_mmr}
                </div>
              </StyledTableCell>

              <StyledTableCell align="center">
                <div className='font-bold'>
                <div className={p.mmr_change > 0 ? 'text-green-500' : 'text-red-500'}>
                  {p.mmr_change === null ? 'Placement' : p.mmr_change}
                  {p.refund > 0 ? <div className="text-xs">+{p.refund} refunded · effective {p.effective_mmr_change}</div> : null}
                </div>
                </div>
              </StyledTableCell>

              <StyledTableCell align="center">
                <div className='font-bold'>
                <div className={rankColors.rankClass(p.new_mmr,props.season ?? 9)}>
                  {p.new_mmr}
                </div>
                </div>
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

  </div>

  )
}
