# skin-designer — memoria interna

Memoria persistente del subagente `skin-designer` (`.claude/agents/skin-designer.md`).
Se reescribe entera en cada corrida. Versión curada para consulta rápida en
`references/games-with-skin.md`.

## Estado de skins por juego

| id | Motor real | `clasico` | `retro` | `neon` | Estado | Última corrida |
|---|---|---|---|---|---|---|
| `asteroides` | Sí | Sí | Sí | Sí | Completo | #1 (2026-08-04) |
| `caida` | Sí | No | No | No | Sin implementar | — |
| `bloque-buster` | Sí | No | No | No | Sin implementar | — |
| `serpentina` | No | — | — | — | Bloqueado: sin motor real | — |
| `gloton` | No | — | — | — | Bloqueado: sin motor real | — |
| `invasores` | No | — | — | — | Bloqueado: sin motor real | — |
| `rocas` | No | — | — | — | Bloqueado: sin motor real | — |
| `ranaria` | No | — | — | — | Bloqueado: sin motor real | — |
| `duelo-pixel` | No | — | — | — | Bloqueado: sin motor real | — |

## Historial de corridas

### #1 — 2026-08-04 — `asteroides`

- **Juego objetivo:** `asteroides` (ASTEROIDES). Determinado directamente por
  la invocación ("usa skin-designer para asteroides") — no hizo falta
  preguntar.
- **Estado previo:** Sin implementar (`lib/skins.ts` no existía todavía;
  primera corrida del subagente en el repo).
- **Qué se implementó:**
  - Se creó `lib/skins.ts` desde cero: `SkinId`, `SkinPalette`, `SKINS`
    (`clasico`/`retro`/`neon`) y `DEFAULT_SKIN = "clasico"`.
    - `clasico`: fósforo verde (`#33ff33`) + acento blanco sobre negro puro,
      sin glow.
    - `retro`: paleta plana estilo CGA (cian `#55ffff` / amarillo `#ffff55` /
      magenta `#ff55ff`) sobre negro, sin glow.
    - `neon`: reusa los tonos ya definidos en `app/globals.css`/spec 01
      (`--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`,
      `--bg #0a0a0f`), con glow activado.
  - Se refactorizó `components/games/engine/asteroids-engine.ts`:
    - Constructor con tercer parámetro opcional `initialSkin?: SkinId`
      (default `DEFAULT_SKIN`) y campo privado `palette: SkinPalette`.
    - Método público `setSkin(skin: SkinId)` que reemplaza `this.palette` en
      caliente sin tocar el resto del estado.
    - Todas las clases internas (`Bullet`, `Asteroid`, `PowerUp`, `Ship`,
      `Particle`) reciben `palette` como parámetro de su `draw(ctx, palette)`
      en vez de usar colores hardcodeados (`#fff`, `#0ff`,
      `rgba(255,130,0,0.85)`, etc.). Mapeo semántico aplicado: nave →
      `primary`; asteroides y balas → `secondary`; power-up, llama del
      propulsor y partículas de explosión → `accent`; fondo del canvas →
      `background`. `ctx.shadowBlur` se resetea a `0` en cada `draw()` del
      engine y solo se activa por entidad cuando `palette.glow` es `true`.
  - Se extendió `components/games/AsteroidsGame.tsx`: prop opcional
    `skin?: SkinId` (default `DEFAULT_SKIN`), pasado como `initialSkin` al
    engine en el efecto de montaje (deps `[]`, sin tocar ese efecto más de lo
    necesario), y un segundo `useEffect` separado con deps `[skin]` que llama
    `engineRef.current?.setSkin(skin)`.
  - Se agregó el selector de skin (infraestructura compartida, primera vez
    que se crea) en `app/juegos/[id]/jugar/page.tsx`: 3 botones reutilizando
    las clases CSS ya existentes `.chip`/`.chip.active` (sin tocar
    `app/globals.css`, fuera del alcance permitido), visible cuando
    `hasRealEngine` es `true` (misma condición `isAsteroids || isTetris ||
    isBloqueBuster` que ya decide qué wrapper montar — no se hardcodeó una
    lista de ids en paralelo). Estado persistido en `localStorage["av_skin"]`
    (clave global, un solo valor compartido entre juegos) vía un pequeño
    pub/sub con `useSyncExternalStore` (mismo patrón que
    `lib/user-context.tsx`) — se descartó `useState` + `useEffect` con
    `localStorage.getItem` porque disparaba el error de lint
    `react-hooks/set-state-in-effect` ("Calling setState synchronously
    within an effect"). Solo `AsteroidsGame` recibe el prop `skin={skin}` en
    esta corrida; `TetrisGame`/`BloqueBusterGame` no lo reciben todavía
    porque sus engines no fueron tocados (fuera del alcance de esta corrida),
    pero el selector ya queda visible también para `caida` y `bloque-buster`
    (mismo `if`/`switch`) para no tener que rehacer esta UI cuando se
    implementen sus skins.
- **Archivos tocados:**
  - `lib/skins.ts` (creado)
  - `components/games/engine/asteroids-engine.ts` (refactor de dibujo por
    paleta)
  - `components/games/AsteroidsGame.tsx` (prop `skin` + segundo efecto)
  - `app/juegos/[id]/jugar/page.tsx` (selector de skin + estado global vía
    `useSyncExternalStore`)
- **Resultado del lint:** `npm run lint` pasó limpio tras un ajuste (el
  primer intento con `useEffect` + `setState` disparó
  `react-hooks/set-state-in-effect`; se resolvió migrando a
  `useSyncExternalStore`). También se verificó `npx tsc --noEmit` sin
  errores como chequeo adicional.
