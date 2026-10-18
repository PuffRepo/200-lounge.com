import ReactCountryFlag from 'react-country-flag';
import { countryCode as normalize } from '../lib/country-code.cjs';

export default function CountryFlag({countryCode, style}) {
  const code=normalize(countryCode);
  return code ? <ReactCountryFlag countryCode={code} cdnUrl="/flags/" cdnSuffix="svg" svg style={style} title={code} alt={code} /> : null;
}
