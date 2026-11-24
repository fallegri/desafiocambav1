# ¡Desafío Camba!

Party game web con temática cruceña (Santa Cruz de la Sierra, Bolivia). Creado y pensado para estudiantes donde giran una ruleta que los manda a uno de 6 minijuegos con humor y jerga local ("cunumi", "opa", "facilingo", "chicote", "cambanga"). Pensada para jugarse en grupo desde una sola pantalla compartida (laptop/tablet/TV).

Se puede jugar **sin cuenta**: el modo invitado es el camino por defecto. Si alguien quiere que sus logros queden guardados, se registra y un operador aprueba la cuenta.

Implementación fiel a un prototipo de Figma, construida sin librerías de UI: todo el look "papel rasgado" (torn paper), las máscaras de chiquitano, las animaciones y el audio están hechos a mano con CSS/SVG/Web Audio API.

## Cómo jugar

1. Pantalla de portada → tocar para continuar (arranca la música de fondo).
2. Girar la ruleta → cae en una de 6 categorías.
3. Pantalla de explicación/instrucciones de la categoría → elegir **Jugar solo** o **Jugar 1 vs 1** (en las categorías que lo soportan).
4. Se juega la ronda (con temporizador cuando aplica).
5. Si se acaba el tiempo, aparece el overlay "¡Se acabó el Tiempo!" con el chicote.
6. Pantalla de resultado/revelación con el puntaje (y el ganador en 1 vs 1) → "Ir a la ruleta" para volver al ciclo.

### Las 6 categorías

| Categoría | De qué se trata |
|---|---|
| **No se dice** | Adivinar la palabra/frase "cruceña" equivalente a una estándar, contrarreloj (10s). |
| **Escucha la canción** | Se reproducen 3s de una canción cruceña real; hay que reconocerla antes de que se acabe el tiempo. |
| **Adivina la leyenda** | Un jugador ve una ilustración de una leyenda cruceña (Guajojo, El Carretón de la Otra Vida, El Mojón con Cara, La Curiosa) y la actúa en mímica; el otro adivina (35s). |
| **Trivia** | Opción múltiple sobre cultura general y **modismos cruceños, benianos y cambas**, 15s por pregunta. |
| **Enchoque** | Reto físico con el juego tradicional boliviano de la pelota y el tazo — la app solo corre un cronómetro de 3 minutos, el juego pasa fuera de pantalla. |
| **Menciona 3 lugares** | Decir 3 lugares que empiecen con una letra al azar, contrarreloj (15s). |

### Modo 1 vs 1

**No se dice** y **Trivia** se pueden jugar de a dos en la misma pantalla (pass-and-play). El selector `Jugar solo` / `Jugar 1 vs 1` aparece en la pantalla de instrucciones (`src/components/ModePicker.jsx`).

- **Trivia 1 vs 1**: 10 preguntas, 5 por jugador, turnos alternados (`Pregunta 1 de 10 · Turno de Jugador 1`). Cada jugador ve su propio marcador (`VersusScoreboard`); al final gana quien tenga más aciertos o se declara empate.
- **No se dice 1 vs 1**: una tarjeta por jugador, 10 s cada uno, con un botón para pasar el turno. Al final se comparan los aciertos.
- El resultado de la ronda viaja con `detail.mode = 'vs'` y `detail.players` (`name`, `hits`, `total`, `score`), así que queda registrado en `game_results` cuando hay sesión iniciada.
- No hay multijugador en red: es una sola pantalla compartida y no crea cuentas separadas por jugador.

### Banco de modismos

`src/data/modismos.json` reúne **135 palabras** cruceñas, benianas y cambas (alimentos, fauna, flora, oficios y expresiones) con `palabra`, `significado` y `origen`. No se guardan 135 preguntas duplicadas: `src/lib/modismos.js` arma preguntas de opción múltiple al vuelo con distractores aleatorios del mismo banco, y Trivia las mezcla con las 15 preguntas generales de `src/data/trivia.json` y con el contenido IA aprobado. Para ampliar el juego solo se agregan entradas al JSON.

## Cuentas, roles y logros

| Rol | Puede |
|---|---|
| **Participante** | Jugar y acumular logros si su cuenta fue aprobada. También puede jugar sin cuenta (los logros no se guardan). |
| **Operador** | Todo lo del participante + aprobar o rechazar registros de participantes + bloquear cuentas. **No** puede asignar roles de staff. |
| **Super admin** | Todo lo anterior + asignar cualquier rol (incluido operador/super admin) y modificar a otros miembros del staff. |

Flujo de registro:

1. El jugador completa "Crear cuenta" (nombre, email, contraseña). La cuenta queda **pendiente**.
2. Un operador o super admin la **aprueba** desde "Administrar usuarios"; recién ahí puede iniciar sesión.
3. Solo el super admin puede convertir a alguien en **operador** o **super admin**.
4. Reglas de seguridad: nadie puede quitarse el rol a sí mismo, un operador no puede tocar a otro miembro del staff y no se puede degradar al **último super admin** activo.

Al terminar una ronda, si hay sesión iniciada, el front registra la partida y desbloquea logros (`primera_partida`, `todoterreno`, `cinco_rondas`, `cien_puntos`).

Cada minijuego reporta `score`/`maxScore` en una escala común de 0–100 (`src/lib/scoring.js`): trivia reparte los 100 entre sus 5 preguntas y el resto de las categorías valen 100 si el grupo lo logró antes de que se acabe el tiempo, 0 si no. La pantalla de fin de ronda muestra el puntaje obtenido.

## Asistente IA (staff)

Los operadores y el super admin tienen un panel **Asistente IA** para generar contenido:

| Tipo | Qué genera | Cómo llega al juego |
|---|---|---|
| **Trivia** | Preguntas de opción múltiple (4 opciones) | Tras aprobarlas, se mezclan con `src/data/trivia.json` en la próxima ronda. |
| **No se dice** | Pares de jerga cruceña (`frase` → `respuesta`) | Tras aprobarlos, se mezclan con `src/data/noSeDice.json`. |
| **Canción** | Sugerencias reales (título, artista, año, nota) | Quedan en la bandeja de aprobados como lista para conseguir el audio; no se inyectan solas porque necesitan un clip. |

Proveedores soportados (se habilita solo el que tenga credenciales):

- OpenAI (`OPENAI_API_KEY`)
- Anthropic / Claude (`ANTHROPIC_API_KEY`)
- Google Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`)
- NVIDIA NIM (`NVIDIA_API_KEY`)
- Mistral (`MISTRAL_API_KEY`)
- Groq (`GROQ_API_KEY`)
- Local: Ollama / LM Studio (`LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`)
- Cualquier otro endpoint OpenAI-compatible (`CUSTOM_AI_BASE_URL`, `CUSTOM_AI_API_KEY`, `CUSTOM_AI_MODEL`)

Garantías del flujo:

1. Las claves viven solo en el servidor; el navegador recibe únicamente id, etiqueta y modelos.
2. Todo lo generado nace como **pendiente** en `ai_content`; **nada entra al juego sin aprobación humana**.
3. Se valida en servidor: 4 opciones distintas, índice correcto, longitudes, sin HTML y sin duplicados contra el banco local y lo ya generado.
4. Límite de 200 ítems generados por usuario cada 24 h y máximo 10 por pedido.
5. Cada aprobación o rechazo queda en `audit_log`.

## Stack técnico

- **React 19 + Vite 8** — SPA, sin router: cada pantalla es una máquina de estados con `useState` (`App.jsx` para el flujo global, un `STEPS` local por categoría).
- **Vercel Functions** (`api/`) — backend serverless en Node: registro, login, panel de usuarios y logros.
- **Neon Postgres** — usuarios, sesiones auditadas, resultados de partidas, logros y (a futuro) contenido generado por IA.
- **Autenticación**: email + contraseña (bcrypt) y sesión en cookie `HttpOnly` + `SameSite=Lax` firmada con JWT (HS256, `jose`). Las nuevas cuentas nacen en estado `pendiente`.
- **CSS plano**, sin frameworks de UI — recrea la identidad visual del Figma: tarjetas "papel rasgado" (`clip-path` con dientes finos + `drop-shadow`), degradados verdes, tipografía local.
- **Web Audio API** para la música de fondo — loop realmente sin corte (`decodeAudioData` + `AudioBufferSourceNode.loop`).
- **Canvas de escenario fijo** de 1440×1024 (`.stage`), escalado a cualquier viewport vía `useStageScale` con `transform: scale()`.
- **Vitest + @testing-library/react** para las pruebas de componentes y `node` para la lógica del backend (validaciones, permisos, tokens, logros).

## Estructura del proyecto

```
api/                          # Funciones serverless (Vercel) — nunca se empaquetan al front
  _lib/                        # Código compartido (no son rutas: el prefijo _ las excluye)
    db.js                       # Cliente Neon
    schema.sql                  # DDL idempotente
    users.js                    # Repositorio + reglas de roles
    achievements.js             # Catálogo y desbloqueo de logros
    session.js / token.js       # Cookie de sesión + JWT
    password.js                 # bcrypt
    validation.js               # Validación de email/contraseña/nombre
    http.js / errors.js         # Respuestas, errores y chequeo de Origin
    rateLimit.js                # Límite simple por IP
    audit.js                    # Trazabilidad de acciones privilegiadas
  auth/                         # register, login, logout, me
  admin/users/                  # Router catch-all: listado (GET) y acciones (PATCH)
  admin/ai/                     # Router catch-all: proveedores, generación y revisión IA
  content/                      # Contenido aprobado, público y cacheable
  achievements/                 # GET logros / POST resultado
  health.js                     # Smoke test Vercel + Neon

scripts/
  env.mjs                       # Carga .env sin dependencias
  migrate.mjs                   # Aplica api/_lib/schema.sql
  seed-superadmin.mjs           # Crea/promueve el primer super admin

src/
  App.jsx                       # Máquina de estados: splash → ruleta → categoría
  CategoryRouter.jsx            # Enruta el categoryId a su carpeta en screens/categories
  main.jsx                      # Bootstrap de React + AuthProvider + audio

  auth/
    AuthContext.jsx             # Sesión (user, login, register, logout, refresh)
    AuthModal.jsx               # Ingreso / registro / perfil con logros
    AdminUsersPanel.jsx         # Aprobaciones y asignación de roles
    roles.js                    # Etiquetas y helpers de rol
    auth.css

  ai/
    AiPanel.jsx                 # Asistente IA: generar, revisar y aprobar contenido
    kinds.js
    ai.css

  screens/
    SplashScreen.jsx/.css       # Portada con logo, mascota y tap-to-continue
    WheelScreen.jsx/.css        # Ruleta con efecto "tragamonedas"
    categories/                 # 6 minijuegos (Intro → Game → RoundEnd)

  components/
    AccountDock.jsx/.css        # Botón flotante "Mi cuenta"
    ModePicker.jsx/.css         # Selector "Jugar solo" / "Jugar 1 vs 1"
    VersusScoreboard.jsx/.css   # Marcador compartido del modo 1 vs 1
    TornCard, PillButton, ProgressTimerBar, TimeUpOverlay, RoundEndScreen, MusicToggle

  hooks/                        # useCountdown, useStageScale
  lib/                          # backgroundMusic, random, sfx, api.js, scoring, modismos, contentCache
  data/                         # Contenido del juego (JSON editable) — incluye modismos.json
  styles/                       # tokens.css + global.css

public/
  audio/                        # Clips de 3s + versiones completas
  fonts/                        # Tipografías del diseño
```

## Desarrollo local

Requiere Node.js 20+.

```bash
npm install
cp .env.example .env            # completar DATABASE_URL y JWT_SECRET
npm run db:migrate              # crea las tablas en Neon
npm run db:seed                 # crea el primer super admin (SUPERADMIN_*)
npx vercel dev                  # levanta el front + las funciones /api
```

> `npm run dev` sigue sirviendo solo el front (sin `/api`). Para probar login y logros hay que usar `vercel dev`, que levanta Vite y las funciones en el mismo puerto.

Scripts útiles:

```bash
npm run test        # Vitest (front + backend)
npm run lint        # oxlint
npm run build       # build de producción a dist/
npm run db:migrate  # aplicar/actualizar esquema
npm run db:seed     # crear o promover el super admin
npm run db:seed:reset  # además restablece su contraseña
```

### Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Connection string **pooled** de Neon. |
| `JWT_SECRET` | Firma de sesiones (mínimo 32 caracteres). |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` / `SUPERADMIN_NAME` | Solo para `db:seed`. |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `NVIDIA_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY` | Asistente IA. Solo se habilitan los proveedores con clave. Se leen en el servidor, nunca en el navegador. |
| `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL` | Ollama / LM Studio en desarrollo. |
| `CUSTOM_AI_BASE_URL`, `CUSTOM_AI_API_KEY`, `CUSTOM_AI_MODEL` | Cualquier otro endpoint OpenAI-compatible. |

## Deploy en Vercel + Neon

1. Crear el proyecto en Neon y copiar la connection string pooled.
2. Importar el repo en Vercel (`vercel.json` ya define framework, build y headers).
3. Cargar `DATABASE_URL` y `JWT_SECRET` en Environment Variables.
4. Correr `npm run db:migrate` y `npm run db:seed` apuntando a la base de producción (localmente con el `.env` de producción, o desde un job).
5. Deploy. Verificar `GET /api/health`.

> **Plan Hobby de Vercel:** el límite es de 12 Serverless Functions por deploy. Por eso las rutas de administración viven en dos routers catch-all (`api/admin/users/[...path].js` y `api/admin/ai/[...path].js`) en vez de un archivo por endpoint: hoy el proyecto usa 9 funciones. Si agregás rutas nuevas, agrupalas igual o pasate a Pro.

## Roadmap

- **Fase 1 (hecha)**: backend + login + roles + aprobación + logros.
- **Fase 2 (hecha)**: asistente IA multi-proveedor que propone trivia, pares de "No se dice" y canciones; revisión y aprobación humana antes de publicar.
- **Fase 3 (hecha)**: puntajes reales en escala 0–100, modo **1 vs 1** en Trivia y No se dice, y banco de **135 modismos** cruceños, benianos y cambas. Detalle en `docs/plan-fases.md`.
- **Fase 4 (próxima)**: edición inline de contenido, métricas de uso de IA, ranking e historial de versiones.

## Notas de implementación

- **Modo invitado primero**: sin sesión, la partida funciona igual que antes; solo se omite el guardado de resultados.
- **Contenido editable sin tocar código**: agregar/quitar preguntas, frases, canciones, leyendas o modismos es cuestión de editar los JSON en `src/data/`; las preguntas de modismos se generan solas a partir del banco.
- **Modo 1 vs 1 local**: pensado para jugar de a dos en la misma pantalla; no requiere backend ni cuentas separadas.
- **Sin secretos en el cliente**: las claves de IA y la connection string viven solo en las funciones de Vercel.
- **Assets reales**: todas las imágenes e ilustraciones y los clips de audio son los provistos para el proyecto, no placeholders.
- **Fidelidad al Figma**: el copy (incluyendo jerga y frases coloquiales) se mantiene tal cual aparece en el diseño original; la spec completa está en `docs/specs/`.

## Licencia

MIT — ver [LICENSE](LICENSE). Podés usar, copiar, modificar y distribuir el proyecto citando el aviso de copyright.

---
