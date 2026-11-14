import {servePublishedResult} from '../../../lib/published-results.cjs'

export default async function handler(req,res) {
  return servePublishedResult(req,res)
}
