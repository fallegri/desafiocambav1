import { getSql } from '../_lib/db.js'
import { getQuery, sendPublicJson, withApi } from '../_lib/http.js'
import { publicContent } from '../_lib/ai/content.js'

const KINDS = ['trivia', 'no_se_dice', 'cancion']

// GET /api/content?kind=trivia
// Only staff-approved content. Public and briefly cacheable at the edge.
export default withApi(async (req, res) => {
  if (req.method !== 'GET') {
    sendPublicJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const query = getQuery(req)
  const kind = KINDS.includes(query.kind) ? query.kind : null
  if (!kind) {
    sendPublicJson(res, 400, { error: 'Parámetro "kind" inválido', kinds: KINDS })
    return
  }

  const items = await publicContent(getSql(), kind)
  sendPublicJson(res, 200, { kind, items }, 60)
})
