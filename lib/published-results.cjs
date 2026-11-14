const MAX_BYTES = 4 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);

async function servePublishedResult(req, res, dependencies = {}) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (!['GET','HEAD'].includes(req.method)) {
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).end();
  }
  const id=req.query.id;
  if (typeof id !== 'string' || !/^[1-9][0-9]{0,17}$/.test(id)) return res.status(404).end();
  try {
    const load=dependencies.loadSnapshot || require('./s9-data.cjs').loadSnapshot;
    const data=await load();
    if (!data.tables.some(table=>String(table.id)===id)) return res.status(404).end();
    const source=new URL(dependencies.source || process.env.S9_PUBLIC_DATA_URL);
    if (source.protocol !== 'https:' || source.username || source.password) throw new Error('Invalid public source');
    // The destination is derived from the configured public feed, never from user input.
    const url=new URL(`/public/results/${id}.png`,source.origin);
    const response=await (dependencies.fetch || fetch)(url,{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),
    });
    if (!response.ok) return res.status(response.status===404?404:503).end();
    if (response.headers.get('content-type')?.split(';')[0] !== 'image/png') throw new Error('Expected PNG');
    if (Number(response.headers.get('content-length'))>MAX_BYTES) throw new Error('Image too large');
    const reader=response.body.getReader();
    const chunks=[];let size=0;
    try {
      while (true) {
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;
        if(size>MAX_BYTES)throw new Error('Image too large');
        chunks.push(Buffer.from(value));
      }
    } finally {await reader.cancel();}
    const body=Buffer.concat(chunks);
    if (!body.subarray(0,8).equals(PNG_SIGNATURE)) throw new Error('Invalid PNG');
    res.setHeader('Content-Type','image/png');
    res.setHeader('Content-Length',String(body.length));
    return res.status(200).end(req.method==='HEAD'?undefined:body);
  } catch {
    // No URLs, credentials, message metadata or internal errors in public responses.
    return res.status(503).end();
  }
}

module.exports={servePublishedResult};
