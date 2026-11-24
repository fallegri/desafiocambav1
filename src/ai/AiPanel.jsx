import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { KIND_LABELS } from './kinds'
import './ai.css'

const STATUS_TABS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'rechazado', label: 'Rechazados' },
]

function ItemPreview({ item }) {
  const payload = item.payload ?? {}
  if (item.kind === 'trivia') {
    return (
      <div className="ai-item__body">
        <p className="ai-item__title">{payload.pregunta}</p>
        <ol className="ai-item__options">
          {(payload.opciones ?? []).map((option, index) => (
            <li key={index} className={index === payload.correctaIndex ? 'is-correct' : ''}>
              {option}
              {index === payload.correctaIndex && <span className="ai-item__check"> ✓</span>}
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (item.kind === 'no_se_dice') {
    return (
      <div className="ai-item__body">
        <p className="ai-item__title">{payload.frase}</p>
        <p className="ai-item__answer">→ {payload.respuesta}</p>
      </div>
    )
  }
  return (
    <div className="ai-item__body">
      <p className="ai-item__title">
        {payload.nombre} <span className="ai-item__muted">— {payload.artista}</span>
      </p>
      {payload.anio && <p className="ai-item__muted">{payload.anio}</p>}
      {payload.nota && <p className="ai-item__note">{payload.nota}</p>}
    </div>
  )
}

export default function AiPanel({ onClose }) {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('pendiente')
  const [content, setContent] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const [providerId, setProviderId] = useState('')
  const [model, setModel] = useState('')
  const [kind, setKind] = useState('trivia')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)

  useEffect(() => {
    let cancelled = false
    api
      .aiProviders()
      .then((data) => {
        if (cancelled) return
        setConfig(data)
        const first = data.providers?.[0]
        if (first) {
          setProviderId(first.id)
          setModel(first.defaultModel)
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(apiError.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadContent = useCallback(async () => {
    try {
      const data = await api.aiContent({ status })
      setContent(data)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [status])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const providers = config?.providers ?? []
  const kinds = config?.kinds ?? Object.entries(KIND_LABELS).map(([id, label]) => ({ id, label }))
  const selectedProvider = providers.find((provider) => provider.id === providerId)

  function selectProvider(id) {
    setProviderId(id)
    const provider = providers.find((item) => item.id === id)
    setModel(provider?.defaultModel ?? '')
  }

  async function handleGenerate(event) {
    event.preventDefault()
    setGenerating(true)
    setError(null)
    setNotice(null)
    setResult(null)
    try {
      const data = await api.aiGenerate({
        provider: providerId,
        model,
        kind,
        topic: topic.trim() || null,
        count: Number(count),
      })
      setResult(data)
      setNotice(
        `El proveedor propuso ${data.created.length + data.rejected.length} ítems: ${data.created.length} quedaron pendientes de revisión y ${data.rejected.length} se descartaron.`,
      )
      setStatus('pendiente')
      await loadContent()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setGenerating(false)
    }
  }

  async function review(id, action) {
    setBusyId(id)
    setError(null)
    setNotice(null)
    try {
      await api.aiReview(id, { action })
      setNotice(action === 'approve' ? 'Contenido aprobado' : 'Contenido rechazado')
      await loadContent()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Asistente IA">
      <div className="auth-panel auth-panel--wide">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <h2 className="auth-title">Asistente IA</h2>
        <p className="auth-hint">
          Generá preguntas de trivia, pares de jerga y sugerencias de canciones. Nada entra al juego hasta que lo apruebes.
        </p>

        {config && !config.configured && (
          <p className="auth-message auth-message--error">
            No hay proveedores configurados. Cargá al menos una API key (o `LOCAL_AI_BASE_URL`) en las variables de entorno.
          </p>
        )}

        {notice && <p className="auth-message auth-message--ok">{notice}</p>}
        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}

        <form className="ai-form" onSubmit={handleGenerate}>
          <div className="ai-form__row">
            <label className="auth-field">
              <span>Proveedor</span>
              <select
                value={providerId}
                onChange={(event) => selectProvider(event.target.value)}
                disabled={providers.length === 0 || generating}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                    {provider.local ? ' (local)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Modelo</span>
              <input
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                list="ai-models"
                disabled={providers.length === 0 || generating}
              />
              <datalist id="ai-models">
                {(selectedProvider?.models ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="ai-form__row">
            <label className="auth-field">
              <span>Tipo de contenido</span>
              <select value={kind} onChange={(event) => setKind(event.target.value)} disabled={generating}>
                {kinds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                max="10"
                value={count}
                onChange={(event) => setCount(event.target.value)}
                disabled={generating}
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Tema (opcional)</span>
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ej.: comidas típicas, historia cruceña, ríos…"
              disabled={generating}
            />
          </label>

          <button
            className="auth-submit"
            type="submit"
            disabled={generating || providers.length === 0 || !providerId}
          >
            {generating ? 'Generando…' : 'Generar propuestas'}
          </button>
        </form>

        {result && result.rejected.length > 0 && (
          <details className="ai-rejected">
            <summary>{result.rejected.length} propuesta(s) descartada(s) por validación</summary>
            <ul>
              {result.rejected.map((item, index) => (
                <li key={index}>{item.reason}</li>
              ))}
            </ul>
          </details>
        )}

        <section className="ai-review">
          <div className="ai-review__head">
            <h3>Contenido</h3>
            <div className="auth-tabs admin-filters">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={status === tab.value}
                  className={`auth-tab ${status === tab.value ? 'is-active' : ''}`}
                  onClick={() => setStatus(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {!content && !error && <p className="auth-hint">Cargando contenido…</p>}
          {content && content.items.length === 0 && <p className="auth-hint">No hay contenido en esta bandeja.</p>}

          {content && content.items.length > 0 && (
            <ul className="ai-list">
              {content.items.map((item) => (
                <li key={item.id} className="ai-item">
                  <div className="ai-item__meta">
                    <span className={`ai-kind ai-kind--${item.kind}`}>{KIND_LABELS[item.kind] ?? item.kind}</span>
                    <span className="ai-item__muted">
                      {item.provider}
                      {item.model ? ` · ${item.model}` : ''}
                      {item.created_by_name ? ` · ${item.created_by_name}` : ''}
                    </span>
                  </div>

                  <ItemPreview item={item} />

                  {status === 'pendiente' && (
                    <div className="ai-item__actions">
                      <button
                        type="button"
                        className="auth-submit auth-submit--small"
                        disabled={busyId === item.id}
                        onClick={() => review(item.id, 'approve')}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="auth-submit auth-submit--small auth-submit--danger"
                        disabled={busyId === item.id}
                        onClick={() => review(item.id, 'reject')}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <button className="auth-submit auth-submit--ghost" type="button" onClick={onClose}>
          Volver a mi cuenta
        </button>
      </div>
    </div>
  )
}
