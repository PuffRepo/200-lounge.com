import {sortLeaderboard, filterLeaderboard} from '../lib/leaderboard-sort.cjs'
import {formatAverage} from '../lib/format-average.cjs'
import rankColors from '../lib/rank-colors.cjs'
import SeasonPreservingLink from './SeasonPreservingLink'
import styles from '../styles/Table.module.css'
import React, { useRef, useState, useEffect } from 'react'

// not sure? makes it work
import PropTypes from 'prop-types'


// Table stuff
import { styled } from '@mui/material/styles'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow, { tableRowClasses } from '@mui/material/TableRow'
import TableFooter from '@mui/material/TableFooter'
import TablePagination from '@mui/material/TablePagination'
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box'

// Icons & stuff
import IconButton from '@mui/material/IconButton'
import FirstPageIcon from '@mui/icons-material/FirstPage'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import LastPageIcon from '@mui/icons-material/LastPage'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid'
import ReactCountryFlag from "./CountryFlag"

// theme is required? i guess
import { useTheme } from '@mui/material/styles'

// Country code to country names
import countries from 'i18n-iso-countries';
import { getName, registerLocale } from 'i18n-iso-countries';
countries.registerLocale(require("i18n-iso-countries/langs/en.json")); // for English



export default function Leaderboard(props) {
    const rows = props.rows
    const current_season = props.season
    const isMobile = props.isMobile
    const countries = props.countries
    const theme = useTheme();

    function getCountryName(country_code) {
        return getName(country_code, 'en'); // 'en' for English
    }


    const StyledTableCell = styled(TableCell)(({ theme }) => ({
        [`&.${tableCellClasses.head}`]: {
            backgroundColor: '#1d185f',
            fontSize: 16,
            // padding: 10,
        },
        [`&.${tableCellClasses.body}`]: {
            fontSize: 16,
            padding: 0,
            fontWeight: 500,
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


    const tableHeader = useRef(null)
    const executeScroll = () => tableHeader.current.scrollIntoView()

    function TablePaginationActions(props) {
        const { count, page, rowsPerPage, onPageChange } = props;

        const handleFirstPageButtonClick = (event) => {
            onPageChange(event, 0);
            executeScroll()
        };

        const handleBackButtonClick = (event) => {
            onPageChange(event, page - 1);
            executeScroll()
        };

        const handleNextButtonClick = (event) => {
            onPageChange(event, page + 1);
            executeScroll()
        };

        const handleLastPageButtonClick = (event) => {
            onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
            executeScroll()
        };

        return (
            <Box sx={{ flexShrink: 0, ml: 2.5, /*backgroundColor: '#ff0000'*/ }}>
                <IconButton
                    onClick={handleFirstPageButtonClick}
                    disabled={page === 0}
                    aria-label="first page"
                >
                    {theme.direction === 'rtl' ? <LastPageIcon style={{ fill: '#ffffff' }} /> : <FirstPageIcon style={{ fill: '#ffffff' }} />}
                </IconButton>
                <IconButton
                    onClick={handleBackButtonClick}
                    disabled={page === 0}
                    aria-label="previous page"
                >
                    {theme.direction === 'rtl' ? <KeyboardArrowRight style={{ fill: '#ffffff' }} /> : <KeyboardArrowLeft style={{ fill: '#ffffff' }} />}
                </IconButton>
                <IconButton
                    onClick={handleNextButtonClick}
                    disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                    aria-label="next page"
                >
                    {theme.direction === 'rtl' ? <KeyboardArrowLeft style={{ fill: '#ffffff' }} /> : <KeyboardArrowRight style={{ fill: '#ffffff' }} />}
                </IconButton>
                <IconButton
                    onClick={handleLastPageButtonClick}
                    disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                    aria-label="last page"
                >
                    {theme.direction === 'rtl' ? <FirstPageIcon style={{ fill: '#ffffff' }} /> : <LastPageIcon style={{ fill: '#ffffff' }} />}
                </IconButton>
            </Box>
        );
    }

    TablePaginationActions.propTypes = {
        count: PropTypes.number.isRequired,
        onPageChange: PropTypes.func.isRequired,
        page: PropTypes.number.isRequired,
        rowsPerPage: PropTypes.number.isRequired,
    };


    //--------------------------------------------------------------------------- 
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const columns = Object.keys(rows[0] || {player_id:null,Rank:null,Country:'','Player Name':'',MMR:null,'Peak MMR':null,'Win Rate':null,'Events Played':0,'Partner AVG':null,'AVG Score':null,'Largest Gain':0,'Largest Loss':0});
    const [sortedBy, setSortedBy] = useState({
        column: 'Rank',
        asc: true,
    });
    // Search bar state
    const [query, setQuery] = useState("")
    // Events played filter state
    const [minEventsPlayedFilter, setMinEventsPlayedFilter] = useState('')
    const [maxEventsPlayedFilter, setMaxEventsPlayedFilter] = useState('')
    // Countries filter state
    const [selectedCountry, setSelectedCountry] = useState("")
    // MMR filters
    const [minMMRFilter, setMinMMRFilter] = useState('')
    const [maxMMRFilter, setMaxMMRFilter] = useState('')







    const filteredRows = filterLeaderboard(rows, {
        query, country: selectedCountry, minMMR: minMMRFilter, maxMMR: maxMMRFilter,
        minEvents: minEventsPlayedFilter, maxEvents: maxEventsPlayedFilter,
    });
    const sortedRows = sortLeaderboard(filteredRows, sortedBy.column, sortedBy.asc);
    const lastPage = rowsPerPage > 0 ? Math.max(0, Math.ceil(sortedRows.length / rowsPerPage) - 1) : 0;
    const visiblePage = Math.min(page, lastPage);
    const visibleRows = rowsPerPage > 0
        ? sortedRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)
        : sortedRows;
    const emptyRows = visiblePage > 0 && rowsPerPage > 0 ? rowsPerPage - visibleRows.length : 0;
    useEffect(() => {
        setPage(0);
    }, [query, selectedCountry, minMMRFilter, maxMMRFilter,
        minEventsPlayedFilter, maxEventsPlayedFilter, sortedBy]);

    // Turn countries into a workable list
    const availableCountries = countries.map(row => ({
        country_code: row.country_code
    }))

    // Get country flags
    function getFlagEmoji(countryCode) {
        const offset = 127397
        return [...countryCode].map(char => String.fromCodePoint(char.charCodeAt(0) + offset)).join('')
    }



    return (<>

        <div className='flex flex-row flex-wrap justify-center'>
            {/* player search */}
            <div className="pb-3 gap-2 z-10 text-xl pl-1 pr-1">
                <input
                    className="border border-gray-400 text-black bg-zinc-300 dark:text-amber-50 dark:bg-zinc-800 p-2 w-64"
                    type="text"
                    placeholder="player"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)} />
            </div>

            {/* country filter */}
            <div className="pb-3 gap-2 z-10 text-xl pl-1 pr-1 box-content">
                <select
                    id="country"
                    name="country"
                    value={selectedCountry}
                    className='border border-gray-400 text-black bg-zinc-300 dark:text-zinc-400 dark:bg-zinc-800 p-2 w-64'
                    onChange={(e) => setSelectedCountry(e.target.value)}
                >
                    <option value="">all countries</option>
                    {availableCountries.map((country, index) => (
                        <option key={index} value={country.country_code}>
                            {getFlagEmoji(country.country_code)} {getCountryName(country.country_code)}
                        </option>
                    ))}
                </select>
            </div>
        </div>


        <div className='flex flex-row flex-wrap justify-center'>
            <div className='flex flex-row flex-wrap justify-center'>
                {/* # of events filters */}
                <div className="pb-3 gap-2 z-10 text-xl pl-1 pr-1">
                    <input
                        className="border border-gray-400 text-black bg-zinc-300 dark:text-amber-50 dark:bg-zinc-800 placeholder:text-gray p-2 w-32"
                        type="number"
                        placeholder="min events"
                        value={minEventsPlayedFilter}
                        onChange={(e) => setMinEventsPlayedFilter(e.target.value)} />
                </div>
                <div className="pb-3 gap-2 z-10 text-xl pl-1 pr-1">
                    <input
                        className="border border-gray-400 text-black bg-zinc-300 dark:text-amber-50 dark:bg-zinc-800 placeholder:text-gray p-2 w-32"
                        type="number"
                        placeholder="max events"
                        value={maxEventsPlayedFilter}
                        onChange={(e) => setMaxEventsPlayedFilter(e.target.value)} />
                </div>
            </div>


            <div className='flex flex-row flex-wrap justify-center'>
                {/* MMR filters */}
                <div className="pb-3 gap-2 z-10 text-xl pl-1 pr-1">
                    <input
                        className="border border-gray-400 text-black bg-zinc-300 dark:text-amber-50 dark:bg-zinc-800 placeholder:text-gray p-2 w-32"
                        type="number"
                        placeholder="min mmr"
                        value={minMMRFilter}
                        onChange={(e) => setMinMMRFilter(e.target.value)} />
                </div>
                <div className="pb-3 gap-2 z-10 text-xl pl-1 pr-1">
                    <input
                        className="border border-gray-400 text-black bg-zinc-300 dark:text-amber-50 dark:bg-zinc-800 placeholder:text-gray p-2 w-32"
                        type="number"
                        placeholder="max mmr"
                        value={maxMMRFilter}
                        onChange={(e) => setMaxMMRFilter(e.target.value)} />
                </div>
            </div>
        </div>

        {/* leaderboard, table */}
        <div className={styles.leaderboard_style}>
            <TableContainer component={Paper} >
                <Table stickyHeader aria-label="customized table" ref={tableHeader}>
                    {/* header */}
                    <TableHead>
                        <TableRow>
                            {/* React.Fragment used instead of <> so that each column gets a key. No more error :3 */}
                            {
                                columns.map((column, idx) => (column === "player_id" ? <React.Fragment key={column}></React.Fragment>:
                                    <StyledTableCell key={column} align="center" sortDirection={sortedBy.column === column ? (sortedBy.asc ? 'asc' : 'desc') : false}>
                                        <button type="button"
                                            className={styles.table_header_text}
                                            aria-label={`Sort by ${column}`}
                                            onClick={() => setSortedBy(prev => ({ column, asc: prev.column === column ? !prev.asc : true }))}>
                                            <div>{column}</div>
                                            <div>{sortedBy.column === column &&
                                                (sortedBy.asc
                                                    ? <ChevronUpIcon className="w-5 h-5" />
                                                    : <ChevronDownIcon className="w-5 h-5" />
                                                )}
                                            </div>
                                        </button>
                                    </StyledTableCell>
                                ))
                            }
                        </TableRow>
                    </TableHead>
                    {/* data */}
                    <TableBody>

                        {/* each record gets these divs */}
                        {visibleRows.map((row) => (

                                    <StyledTableRow key={row.player_id}>
                                        <StyledTableCell align="center">
                                            <div className={rankColors.rankClass(row.MMR,current_season)}>
                                                <div className='cursor-pointer hover:underline'>
                                                <SeasonPreservingLink to={`/player/` + encodeURIComponent(row['Player Name'])}>
                                                        {row.Rank == null ? '—' : row.Rank}
                                                    </SeasonPreservingLink>
                                                </div>
                                            </div>
                                        </StyledTableCell>

                                        <StyledTableCell align="center">
                                            <ReactCountryFlag countryCode={row.Country} style={{ width: '2rem', height: '2rem' }} svg />
                                        </StyledTableCell>

                                        <StyledTableCell align="center">
                                            <div className={rankColors.rankClass(row.MMR,current_season)}>
                                                <div className='cursor-pointer hover:underline'>
                                                <SeasonPreservingLink to={`/player/` + encodeURIComponent(row['Player Name'])}>
                                                        {row['Player Name']}
                                                    </SeasonPreservingLink>
                                                </div>
                                            </div>
                                        </StyledTableCell>

                                        <StyledTableCell align="center">
                                            <div className={rankColors.rankClass(row.MMR,current_season)}>
                                                {row.MMR === null ? 'Unplaced' : row.MMR}
                                            </div>
                                        </StyledTableCell>


                                        <StyledTableCell align="center">
                                            <div className={rankColors.rankClass(row['Peak MMR'],current_season)}>
                                                {row['Peak MMR'] === null ? '—' : row['Peak MMR']}
                                            </div>
                                        </StyledTableCell>
                                        <StyledTableCell align="center">{row['Win Rate'] === null ? '—' : (row['Win Rate'] * 100).toFixed(2) + '%'}</StyledTableCell>
                                        {/* 
                          <StyledTableCell align="center">{row['Win/Loss (Last 10)']}</StyledTableCell>
                        
                          <StyledTableCell align="center">
                            <div className={row['Gain/Loss (Last 10)'] > 0 ? 'text-green-500': 'text-red-500'}>
                              {row['Gain/Loss (Last 10)']}
                            </div>
                          </StyledTableCell> */}

                                        <StyledTableCell align="center">
                                            {row['Events Played']}
                                        </StyledTableCell>

                                        <StyledTableCell align="center">
                                            {formatAverage(row['Partner AVG'])}
                                        </StyledTableCell>

                                        <StyledTableCell align="center">
                                            {formatAverage(row['AVG Score'])}
                                        </StyledTableCell>





                                        <StyledTableCell align="center">
                                            <div className={row['Largest Gain'] > 0 ? 'text-green-500' : 'text-red-500'}>
                                                {row['Largest Gain']}
                                            </div>
                                        </StyledTableCell>

                                        <StyledTableCell align="center">
                                            <div className={row['Largest Loss'] > 0 ? 'text-green-500' : 'text-red-500'}>
                                                {row['Largest Loss']}
                                            </div>
                                        </StyledTableCell>
                                    </StyledTableRow>
                            ))}
                        {emptyRows > 0 && (
                            <TableRow style={{ height: 53 * emptyRows }}>
                                <StyledTableCell colSpan={6} />
                            </TableRow>
                        )}
                    </TableBody>
                    {/* footer */}
                    <TableFooter>
                        <StyledTableRow>
                            <TablePagination
                                rowsPerPageOptions={[10, 25, 50, { label: 'All', value: -1, bgcolor: '#000000' }]}
                                colSpan={columns.length}
                                count={filteredRows.length}
                                rowsPerPage={rowsPerPage}
                                page={visiblePage}
                                sx={{ bgcolor: '#1d185f', color: '#ffffff' }}
                                SelectProps={{
                                    inputProps: {
                                        'aria-label': 'rows',
                                    },
                                    native: true
                                }}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                ActionsComponent={TablePaginationActions}
                            />
                        </StyledTableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
        </div>
    </>
    )
}
