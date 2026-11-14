import {useState} from 'react'

export default function PublishedResultImage({tableId, fallback}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div className="w-full max-w-4xl my-6">
      {!failed && <img
        src={`/api/results/${tableId}`}
        alt={`Published results for table #${tableId}`}
        width={860} height={520}
        style={{display:loaded?'block':'none',width:'100%',height:'auto'}}
        onLoad={()=>setLoaded(true)}
        onError={()=>{setFailed(true);setLoaded(false)}}
      />}
      {!loaded && fallback}
    </div>
  )
}
