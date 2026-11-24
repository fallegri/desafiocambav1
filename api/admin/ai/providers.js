import { getSql } from '../../_lib/db.js'
import { sendJson, withApi } from '../../_lib/http.js'
import { requireStaff } from '../../_lib/session.js'
import { listAvailableProviders } from '../../_lib/ai/providers.js'
import { CONTENT_KINDS, KIND_LABELS } from '../../_lib/ai/prompts.js'

// GET /api/admin/ai/providers
// Only the configured providers are returned (a key or local base URL must
// exist). Keys themselves are never serialised.
export default withApi(async (req, res) => {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const sql = getSql()
  await requireStaff(req, sql)

  const providers = listAvailableProviders()
  sendJson(res, 200, {
    providers,
    kinds: CONTENT_KINDS.map((id) => ({ id, label: KIND_LABELS[id] })),
    configured: providers.length > 0,
  })
})
