import { badRequest } from '../errors.js'

// Registry of supported AI providers. Everything is server-side: the browser
// only ever sees `id`, `label` and the model list, never the API keys.
//
// Six of the eight providers speak the OpenAI Chat Completions dialect, so a
// single adapter covers them. Anthropic gets a dedicated adapter.
export const PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-latest',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-sonnet-4-5'],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash'],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    kind: 'openai',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_API_KEY',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    models: [
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.3-70b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct',
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral',
    kind: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-small-latest', 'mistral-large-latest'],
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  {
    id: 'local',
    label: 'Local (Ollama / LM Studio)',
    kind: 'openai',
    baseUrlEnv: 'LOCAL_AI_BASE_URL',
    modelEnv: 'LOCAL_AI_MODEL',
    defaultModel: 'llama3.1',
    models: [],
    requiresBaseUrl: true,
    local: true,
  },
  {
    id: 'custom',
    label: 'Otro (OpenAI-compatible)',
    kind: 'openai',
    baseUrlEnv: 'CUSTOM_AI_BASE_URL',
    apiKeyEnv: 'CUSTOM_AI_API_KEY',
    modelEnv: 'CUSTOM_AI_MODEL',
    defaultModel: 'gpt-4o-mini',
    models: [],
    requiresBaseUrl: true,
  },
]

function isConfigured(provider, env) {
  if (provider.requiresBaseUrl && !env[provider.baseUrlEnv]) return false
  if (provider.apiKeyEnv && !env[provider.apiKeyEnv]) return false
  return true
}

export function listAvailableProviders(env = process.env) {
  return PROVIDERS.filter((provider) => isConfigured(provider, env)).map((provider) => ({
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    models: provider.models,
    defaultModel: provider.modelEnv ? env[provider.modelEnv] || provider.defaultModel : provider.defaultModel,
    local: Boolean(provider.local),
  }))
}

export function resolveProvider(providerId, modelOverride, env = process.env) {
  const provider = PROVIDERS.find((item) => item.id === providerId)
  if (!provider) throw badRequest('Proveedor de IA desconocido')
  if (!isConfigured(provider, env)) {
    throw badRequest(`El proveedor "${provider.label}" no está configurado en este entorno`)
  }

  const baseUrl = provider.baseUrlEnv ? env[provider.baseUrlEnv] : provider.baseUrl
  const apiKey = provider.apiKeyEnv ? env[provider.apiKeyEnv] : null
  const defaultModel = provider.modelEnv ? env[provider.modelEnv] || provider.defaultModel : provider.defaultModel
  const model = (modelOverride || defaultModel || '').trim()

  if (!model) throw badRequest('Falta el modelo a usar')
  if (model.length > 120) throw badRequest('Nombre de modelo inválido')

  return {
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    model,
  }
}
