import '../styles/globals.css'
import * as React from 'react';
import Navbar from '../components/Navbar'
import SeasonPicker2 from '../components/SeasonPicker2';
import TileGrid from '../components/TileGrid'
import { useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

export default function App({ Component, pageProps }) {
  // Light / Dark mode for tables?
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = useMemo(() => createTheme({
    palette: {
      mode: prefersDarkMode ? 'dark' : 'light',
    },
  }), [prefersDarkMode])


  const [currentSeason, setCurrentSeason] = useState(9)

  return (<>
    <ThemeProvider theme={theme}>
      <div className="sticky top-0 z-20">
        <Navbar currentSeason={currentSeason}/>
        <SeasonPicker2 currentSeason={currentSeason} setCurrentSeason={setCurrentSeason} />
      </div>
      {pageProps.s9GeneratedAt ? <p className="text-center text-xs py-2">S9 · Updated {new Date(pageProps.s9GeneratedAt).toISOString().replace('T',' ').slice(0,19)} UTC · Win rate counts MMR gains; placements excluded.</p> : null}
      <Component {...pageProps} />
      <TileGrid />
    </ThemeProvider>
  </>)
}

