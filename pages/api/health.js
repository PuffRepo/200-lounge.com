import s9 from '../../lib/s9-data.cjs'
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store')
  if(!['GET','HEAD'].includes(req.method)) {
    res.setHeader('Allow','GET, HEAD')
    return res.status(405).json({ready:false})
  }
  try {
    const data=await s9.loadSnapshot()
    return res.status(200).json({ready:true,season:'S9',generated_at:data.generated_at})
  } catch {
    return res.status(503).json({ready:false,reason:'S9 public feed unavailable'})
  }
}
