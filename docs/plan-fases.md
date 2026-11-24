# Plan de fases — Cuentas, logros y asistente IA

Documento de diseño para la evolución de Desafío Camba. Las **fases 1, 2 y 3 ya están implementadas**; la fase 4 queda especificada para ejecutarse después.

---

## Fase 1 — Cuentas, roles y logros (implementada)

### Modelo de datos

| Tabla | Propósito |
|---|---|
| `users` | Cuenta, rol (`superadmin` / `operador` / `participante`), estado (`pendiente` / `activo` / `rechazado` / `bloqueado`) y trazabilidad de aprobación. |
| `game_results` | Una fila por ronda terminada (categoría, puntaje, máximo, detalle JSON). |
| `achievements` | Logros desbloqueados por usuario, únicos por `(user_id, code)`. |
| `audit_log` | Registro de acciones privilegiadas (login, aprobaciones, cambios de rol). |
| `ai_content` | Reservada para la Fase 2 (contenido generado por IA pendiente de revisión). |

### Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | público | Crea una cuenta `pendiente` (rol participante). |
| `POST` | `/api/auth/login` | público | Valida credenciales y emite cookie de sesión. Falla si la cuenta no está activa. |
| `POST` | `/api/auth/logout` | sesión | Limpia la cookie. |
| `GET` | `/api/auth/me` | público | Devuelve `{ user }` o `{ user: null }`. |
| `GET` | `/api/admin/users` | staff | Lista con filtro por estado y búsqueda. |
| `PATCH` | `/api/admin/users/:id` | staff | `approve`, `reject`, `block`, `set_role`. |
| `GET` | `/api/achievements` | sesión activa | Logros + estadísticas. |
| `POST` | `/api/achievements` | sesión activa | Registra una partida y devuelve logros nuevos. |
| `GET` | `/api/health` | público | Verifica función + Neon. |

### Reglas de autorización (implementadas en `api/_lib/users.js`)

1. Aprobar/rechazar/bloquear **participantes**: operador o super admin.
2. Asignar rol **operador** o **super admin**: solo super admin.
3. Un operador no puede modificar a otro miembro del staff.
4. Nadie puede cambiarse el rol a sí mismo (salvo el super admin, con el límite del punto 5).
5. No se puede degradar al **último super admin activo**.

### Seguridad

- Contraseñas con bcrypt (10 rondas) y política mínima (8 caracteres, letra + número).
- Sesión en cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción, TTL 7 días.
- JWT HS256 con `iss`/`aud` verificados.
- El estado de la cuenta se revalida contra la base en cada request protegido: bloquear a alguien surte efecto inmediato.
- Validación de entrada en servidor y mensajes de error sin filtrar internals.
- Chequeo de `Origin` en métodos mutantes y límite de intentos por IP (mejor esfuerzo por instancia).
- Login con tiempo constante para emails inexistentes (evita enumeración de cuentas).

### Pendiente conocido

- El rate limit en memoria no es global entre instancias serverless.

---

## Fase 2 — Asistente IA multi-proveedor (implementada)

### Proveedores

| Proveedor | Variable | Endpoint base | Formato |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1` | OpenAI Chat Completions |
| Anthropic | `ANTHROPIC_API_KEY` | `https://api.anthropic.com/v1` | Mensajes propio (adaptador) |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | `https://generativelanguage.googleapis.com/v1beta/openai/` | OpenAI-compatible |
| NVIDIA NIM | `NVIDIA_API_KEY` | `https://integrate.api.nvidia.com/v1` | OpenAI-compatible |
| Mistral | `MISTRAL_API_KEY` | `https://api.mistral.ai/v1` | OpenAI-compatible |
| Groq | `GROQ_API_KEY` | `https://api.groq.com/openai/v1` | OpenAI-compatible |
| Ollama (local) | `LOCAL_AI_BASE_URL` | `http://127.0.0.1:11434/v1` | OpenAI-compatible |
| LM Studio (local) | `LOCAL_AI_BASE_URL` | `http://127.0.0.1:1234/v1` | OpenAI-compatible |

La mayoría comparte el contrato OpenAI, así que un único cliente (`fetch` a `chat/completions`) cubre 6 de 8. Anthropic y el modo local requieren adaptadores finos.

### Arquitectura implementada

```
api/_lib/ai/
  providers.js      # Registro + resolución (solo proveedores configurados)
  client.js         # Adaptadores OpenAI-compatible / Anthropic, timeout, 1 reintento, extractor de JSON
  prompts.js        # Plantillas por tipo + lista de existentes para evitar duplicados
  validate.js       # Saneamiento y validación estricta de cada ítem
  content.js        # Generación, cuota diaria, bandeja y revisión

api/admin/ai/
  providers.js          # GET  /api/admin/ai/providers
  generate.js           # POST /api/admin/ai/generate
  content/index.js      # GET  /api/admin/ai/content
  content/[id].js       # PATCH /api/admin/ai/content/:id

api/content/index.js    # GET /api/content?kind=... (público, solo aprobado)
```

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/ai/providers` | staff | Proveedores habilitados + tipos. Nunca devuelve claves. |
| `POST` | `/api/admin/ai/generate` | staff | Genera y guarda propuestas pendientes. |
| `GET` | `/api/admin/ai/content` | staff | Bandeja por estado y tipo. |
| `PATCH` | `/api/admin/ai/content/:id` | staff | `approve`, `reject` o `edit`. |
| `GET` | `/api/content?kind=` | público | Contenido aprobado, cacheado 60 s en el edge. |

En el front, `src/lib/contentCache.js` precarga el contenido aprobado al iniciar la app y `Trivia` / `NoSeDiceGame` lo mezclan con los JSON locales; si el backend no responde, el juego sigue funcionando con el banco empaquetado.

- El navegador **nunca** ve claves: todo sale de funciones de Vercel.
- `providers.js` arma la lista disponible según qué variables de entorno existen; la UI muestra solo las configuradas.
- Modo local: si `LOCAL_AI_BASE_URL` está definido, aparece "Local" aunque no haya claves comerciales. En Vercel el local no es alcanzable; queda para desarrollo.

### Límites y salvaguardas

- Máximo 10 ítems por pedido y 200 por usuario cada 24 h.
- Timeout de 30 s, un reintento automático solo para 429/5xx.
- El contenido duplicado se descarta contra el banco local y contra todo lo pendiente/aprobado.
- Cada acción de generación, aprobación y rechazo queda en `audit_log`.

### Contrato de generación

Se pide JSON estricto y se valida en servidor:

```json
{
  "items": [
    {
      "pregunta": "¿...?",
      "opciones": ["A", "B", "C", "D"],
      "correctaIndex": 2
    }
  ]
}
```

Para canciones:

```json
{
  "items": [
    { "nombre": "Título", "artista": "Intérprete", "anio": 1998, "nota": "por qué encaja" }
  ]
}
```

Para jerga:

```json
{
  "items": [
    { "frase": "No se dice estás sucio, se dice…", "respuesta": "estás cuchuquí" }
  ]
}
```

Validaciones: exactamente 4 opciones, `correctaIndex` en rango, sin duplicados contra el banco actual, longitud de campos, sin HTML. Si el modelo devuelve texto alrededor del JSON, se extrae el primer bloque `{...}` balanceado.

### Flujo de aprobación

1. Operador abre "Asistente IA", elige proveedor, tipo de contenido, tema y cantidad.
2. `POST /api/admin/ai/generate` valida, guarda las propuestas en `ai_content` con `status = 'pendiente'` y devuelve cuántas entraron y cuántas se descartaron.
3. El staff revisa la bandeja y aprueba o rechaza cada ítem por separado.
4. Al aprobar, el ítem pasa a `status = 'aprobado'` y `GET /api/content?kind=…` lo publica; la próxima ronda lo mezcla con el banco local.
5. Nada generado por IA entra al juego sin aprobación humana explícita.

---

## Fase 3 — Puntajes reales, modo 1 vs 1 y modismos (implementada)

### Puntajes reales

Cada minijuego reporta `score`/`maxScore` en una escala común de **0–100** (`src/lib/scoring.js`), así los puntos de distintas categorías se suman y el logro `cien_puntos` funciona. La pantalla de fin de ronda muestra `X / 100 puntos`.

### Modo 1 vs 1

- Selector `Jugar solo` / `Jugar 1 vs 1` en la intro/instrucciones (`src/components/ModePicker.jsx`), disponible en **Trivia** y **No se dice**.
- **Trivia**: 10 preguntas (5 por jugador) en turnos alternados; el marcador (`src/components/VersusScoreboard.jsx`) resalta a quién le toca.
- **No se dice**: una tarjeta por jugador, 10 s cada uno, con botón de cambio de turno.
- Al terminar, `winnerOf` (`src/lib/scoring.js`) decide ganador o empate; los puntajes por jugador se listan en `RoundEndScreen`.
- Contrato de resultado:

  ```json
  {
    "score": 50,
    "maxScore": 100,
    "detail": {
      "hits": 5,
      "total": 10,
      "mode": "vs",
      "players": [
        { "name": "Jugador 1", "hits": 5, "total": 5, "score": 100 },
        { "name": "Jugador 2", "hits": 0, "total": 5, "score": 0 }
      ]
    }
  }
  ```

- Es **pass-and-play** en una sola pantalla: no hay red ni cuentas separadas por jugador.

### Banco de modismos

- `src/data/modismos.json`: **135 entradas** con `palabra`, `significado` y `origen` (`cruceño`, `beniano`, `camba`), cubriendo alimentos, fauna, flora, oficios y expresiones.
- `src/lib/modismos.js` genera las preguntas de opción múltiple bajo demanda (`buildModismoQuestion`, `buildModismoQuestions`), con 3 distractores aleatorios del mismo banco, en vez de duplicar 135 preguntas.
- Trivia mezcla el banco general (15 preguntas), las preguntas de modismos y el contenido IA aprobado; cada pregunta de modismo lleva su etiqueta de origen.
- Al ser un pool grande, la mayoría de las preguntas de una ronda suelen ser de modismos; para balancear basta con ajustar la selección en `src/screens/categories/Trivia/index.jsx`.

---

## Fase 4 — Panel de contenido y métricas (próxima)

- [ ] CRUD de trivia/canciones/palabras desde el panel, con historial de versiones.
- [ ] Edición inline del contenido aprobado y purge de la caché.
- [ ] Ranking y logros sociales.
- [ ] Métricas: partidas por categoría, tasa de acierto, uso de proveedores IA.

---

## Criterios de aceptación de la Fase 1

- [x] Un invitado puede jugar las 6 categorías sin registrarse.
- [x] El registro crea cuentas pendientes y no permite iniciar sesión hasta la aprobación.
- [x] Un operador aprueba/rechaza y bloquea participantes; no puede asignar roles de staff.
- [x] Un super admin asigna roles y no puede eliminar al último super admin.
- [x] Los logros se guardan solo con sesión activa.
- [x] El backend rechaza sesiones de cuentas bloqueadas aunque el JWT siga vigente.
- [x] La suite de tests cubre validaciones, permisos, tokens, logros y UI de auth.

## Criterios de aceptación de la Fase 2

- [x] El panel lista solo proveedores con credenciales y nunca expone claves.
- [x] Se generan propuestas de trivia, "No se dice" y canciones desde OpenAI, Anthropic, Gemini, NVIDIA NIM, Mistral, Groq, local y endpoints compatibles.
- [x] Cada ítem se valida (4 opciones, índice, longitudes, duplicados) antes de guardarse.
- [x] Nada se publica sin aprobación humana; aprobar/rechazar queda auditado.
- [x] El contenido aprobado se mezcla con el banco local en la siguiente ronda; el juego sigue funcionando si la API no responde.
- [x] Hay cuota diaria y límite por pedido.
- [x] La suite cubre proveedores, cliente HTTP, validación, generación/revisión y el panel.

## Criterios de aceptación de la Fase 3

- [x] Las 6 categorías reportan `score`/`maxScore` en escala 0–100 y el fin de ronda lo muestra.
- [x] Trivia y No se dice ofrecen "Jugar solo" y "Jugar 1 vs 1" desde su pantalla de instrucciones.
- [x] En 1 vs 1 se muestra de quién es el turno, el marcador de ambos y el ganador (o empate) al final.
- [x] El resultado de una ronda 1 vs 1 incluye `detail.mode = 'vs'` y `detail.players`.
- [x] El banco de modismos tiene al menos 100 palabras cruceñas, benianas y cambas y genera preguntas válidas de 4 opciones.
- [x] La suite cubre solo/VS, empates, ganadores, timeouts, el banco y la generación de preguntas.
