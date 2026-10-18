const codes=new Set(require('i18n-iso-countries/codes.json').map(row=>row[0]));
const countryCode=value=>typeof value==='string' && codes.has(value.trim().toUpperCase()) ? value.trim().toUpperCase() : '';
module.exports={countryCode};
