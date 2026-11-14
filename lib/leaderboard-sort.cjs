const TEXT_COLUMNS = new Set(['Player Name', 'Country', 'player_id']);
const names = new Intl.Collator('en', {sensitivity: 'base', numeric: false});

function sortValue(value, column) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (TEXT_COLUMNS.has(column)) return String(value);
  // Accept the displayed percentage representation as well as numeric API data.
  const number = Number(String(value).trim().replace(/%$/, '').trim());
  return Number.isFinite(number) ? number : null;
}

function sortLeaderboard(rows, column = 'Rank', ascending = true) {
  return [...rows].sort((a, b) => {
    const x = sortValue(a[column], column), y = sortValue(b[column], column);
    // Missing statistics and unplaced ratings stay last in either direction.
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    const comparison = x === null ? 0 : TEXT_COLUMNS.has(column)
      ? names.compare(x, y) : x - y;
    if (comparison) return ascending ? comparison : -comparison;
    // Deterministic ties across pages, without converting Discord IDs to numbers.
    return names.compare(String(a['Player Name'] ?? ''), String(b['Player Name'] ?? ''))
      || String(a.player_id ?? '').localeCompare(String(b.player_id ?? ''));
  });
}

function filterLeaderboard(rows, filters = {}) {
  const {query = '', country = '', minMMR = '', maxMMR = '', minEvents = '', maxEvents = ''} = filters;
  const within = (value, minimum, maximum) => {
    const min = sortValue(minimum, 'MMR'), max = sortValue(maximum, 'MMR');
    if (min === null && max === null) return true;
    const numeric = sortValue(value, 'MMR');
    return numeric !== null && (min === null || numeric >= min) && (max === null || numeric <= max);
  };
  const search = String(query).toLocaleLowerCase('en');
  return rows.filter(row => (!search || Object.values(row).some(value =>
    value !== null && value !== undefined && String(value).toLocaleLowerCase('en').includes(search)))
    && (!country || row.Country === country)
    && within(row.MMR, minMMR, maxMMR)
    && within(row['Events Played'], minEvents, maxEvents));
}

module.exports = {sortLeaderboard, filterLeaderboard, sortValue};
