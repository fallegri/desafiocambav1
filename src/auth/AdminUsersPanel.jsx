import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { ROLE_LABELS, ROLES, STATUS_LABELS } from './roles'
import './auth.css'

const FILTERS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'bloqueado', label: 'Bloqueados' },
]

export default function AdminUsersPanel({ onClose }) {
  const { user: actor } = useAuth()
  const [filter, setFilter] = useState('pendiente')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const isSuperadmin = actor?.role === 'superadmin'

  const load = useCallback(async () => {
    setError(null)
    try {
      const result = await api.listUsers({ status: filter || undefined, search: appliedSearch || undefined })
      setData(result)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [filter, appliedSearch])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(id, payload) {
    setBusyId(id)
    setError(null)
    setNotice(null)
    try {
      const result = await api.updateUser(id, payload)
      setNotice(`${result.user.name} · ${STATUS_LABELS[result.user.status] ?? result.user.status}`)
      await load()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Administrar usuarios">
      <div className="auth-panel auth-panel--wide">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <h2 className="auth-title">Administrar usuarios</h2>
        <p className="auth-hint">
          {isSuperadmin
            ? 'Como super admin podés aprobar cuentas y asignar cualquier rol.'
            : 'Como operador podés aprobar o rechazar cuentas de participantes.'}
        </p>

        <div className="admin-toolbar">
          <div className="auth-tabs admin-filters" role="tablist">
            {FILTERS.map((item) => (
              <button
                key={item.value || 'all'}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                className={`auth-tab ${filter === item.value ? 'is-active' : ''}`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form
            className="admin-search"
            onSubmit={(event) => {
              event.preventDefault()
              setAppliedSearch(search.trim())
            }}
          >
            <input
              type="search"
              aria-label="Buscar usuarios"
              placeholder="Nombre o email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className="auth-submit auth-submit--small">
              Buscar
            </button>
          </form>
        </div>

        {notice && <p className="auth-message auth-message--ok">{notice}</p>}
        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
        {!data && !error && <p className="auth-hint">Cargando usuarios…</p>}
        {data && data.users.length === 0 && <p className="auth-hint">No hay usuarios para este filtro.</p>}

        {data && data.users.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((row) => {
                  const busy = busyId === row.id
                  const isSelf = row.id === actor?.id
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                        <small>{row.email}</small>
                      </td>
                      <td>
                        {isSuperadmin && !isSelf ? (
                          <select
                            aria-label={`Rol de ${row.name}`}
                            value={row.role}
                            disabled={busy}
                            onChange={(event) => runAction(row.id, { action: 'set_role', role: event.target.value })}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`auth-badge auth-badge--${row.role}`}>{ROLE_LABELS[row.role]}</span>
                        )}
                      </td>
                      <td>{STATUS_LABELS[row.status] ?? row.status}</td>
                      <td className="admin-actions">
                        {row.status === 'pendiente' && (
                          <>
                            <button type="button" disabled={busy} onClick={() => runAction(row.id, { action: 'approve' })}>
                              Aprobar
                            </button>
                            <button
                              type="button"
                              className="is-danger"
                              disabled={busy}
                              onClick={() => runAction(row.id, { action: 'reject' })}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {row.status !== 'pendiente' && row.status !== 'activo' && (
                          <button type="button" disabled={busy} onClick={() => runAction(row.id, { action: 'approve' })}>
                            Activar
                          </button>
                        )}
                        {row.status === 'activo' && !isSelf && row.role !== 'superadmin' && (
                          <button
                            type="button"
                            className="is-danger"
                            disabled={busy}
                            onClick={() => runAction(row.id, { action: 'block' })}
                          >
                            Bloquear
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <button className="auth-submit auth-submit--ghost" type="button" onClick={onClose}>
          Volver a mi cuenta
        </button>
      </div>
    </div>
  )
}
