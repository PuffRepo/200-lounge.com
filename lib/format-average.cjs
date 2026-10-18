// Floor the decimal representation to hundredths without binary * 100 errors.
function formatAverage(value) {
  if(typeof value!=='number' || !Number.isFinite(value))return 'N/A';
  const [mantissa,exponent='0']=Math.abs(value).toString().split('e');
  const [whole,fraction='']=mantissa.split('.');
  const digits=BigInt(whole+fraction),scale=2+Number(exponent)-fraction.length;
  const divisor=scale<0?10n**BigInt(-scale):1n;
  let cents=scale>=0?digits*10n**BigInt(scale):digits/divisor;
  if(value<0 && digits%divisor)cents+=1n;
  return `${value<0 && cents>0n?'-':''}${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
}
module.exports={formatAverage};
