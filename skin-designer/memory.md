# skin-designer — memoria interna

Memoria persistente del subagente `skin-designer` (`.claude/agents/skin-designer.md`).
Se reescribe entera en cada corrida. Versión curada para consulta rápida en
`references/games-with-skin.md`.

## Estado de skins por juego

| id | Motor real | `clasico` | `retro` | `neon` | Estado | Última corrida |
|---|---|---|---|---|---|---|
| `asteroides` | Sí | Sí | Sí | Sí | Completo | #1 (2026-08-04) |
| `bloque-buster` | Sí | Sí | Sí | Sí | Completo | #2 (2026-08-04) |
| `caida` | Sí | Sí | Sí | Sí | Completo | #3 (2026-08-04) |
| `ranaria` | Sí | Sí | Sí | Sí | Completo | #4 (2026-08-07) |
| `serpentina` | No | — | — | — | Bloqueado: sin motor real | — |
| `gloton` | No | — | — | — | Bloqueado: sin motor real | — |
| `invasores` | No | — | — | — | Bloqueado: sin motor real | — |
| `rocas` | No | — | — | — | Bloqueado: sin motor real | — |
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

### #2 — 2026-08-04 — `bloque-buster`

- **Juego objetivo:** `bloque-buster` (BLOQUE BUSTER / Arkanoid). Determinado
  directamente por la invocación ("usa skin-designer para bloque-buster") —
  no hizo falta preguntar.
- **Estado previo:** Sin implementar. `lib/skins.ts` ya existía (de la
  corrida #1) con los 3 roles genéricos, y el selector de skin en
  `app/juegos/[id]/jugar/page.tsx` ya era visible para este juego (misma
  condición `hasRealEngine`), pero `BloqueBusterEngine` no leía la paleta
  activa: dibujaba paddle/pelota/bloques/explosiones vía blits de un
  spritesheet PNG (`bloque-buster-sprites.ts`) con colores fijos por bloque
  (`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`/`gray`, definidos en
  `lib/bloque-buster-levels.ts`), y el fondo era `"#000"` hardcodeado.
- **Decisión de diseño clave:** el motor original no tenía ningún
  `fillStyle`/`strokeStyle` para paddle/pelota/bloques (eran imágenes
  `drawImage` de un spritesheet), a diferencia de `asteroids-engine.ts` que
  ya dibujaba vectorialmente. Mantener el spritesheet tal cual habría dejado
  el `clasico` (definido como monocromático, sin glow) mostrando igual el
  arcoíris de colores del spritesheet en los 7 tipos de bloque — contradice
  la definición del skin. Se decidió **reemplazar el dibujo de
  paddle/pelota/bloques/explosiones por formas vectoriales** (`fillRect`/
  `arc`) coloreadas por rol de paleta, igual que en `asteroides`, en vez de
  tintar o mantener el sprite. El archivo `bloque-buster-sprites.ts` no se
  tocó ni se borró (sigue siendo un archivo válido y exportando sus
  utilidades), simplemente el engine dejó de importarlo salvo por la
  constante `EXPLOSION_DURATION` (que no es un color, sigue siendo válida
  para el timing del flash de explosión). El asset PNG del spritesheet y los
  2 sonidos (`ball-bounce.mp3`/`break-sound.mp3`) no se tocaron; los sonidos
  siguen sonando igual, ajenos al sistema de skins.
- **Qué se implementó:**
  - `lib/skins.ts`: sin cambios — los roles genéricos ya definidos
    (`background`/`primary`/`secondary`/`accent`/`glow`) alcanzaron para
    mapear paddle+pelota (`primary`, entidad controlada por el jugador),
    bloques (`secondary`), flash de explosión (`accent`) y fondo del canvas
    (`background`). No hizo falta agregar un rol nuevo.
  - `components/games/engine/bloque-buster-engine.ts`:
    - Constructor con tercer parámetro opcional `initialSkin?: SkinId`
      (default `DEFAULT_SKIN`) y campo privado `palette: SkinPalette`.
    - Método público `setSkin(skin: SkinId)` que reemplaza `this.palette` en
      caliente sin tocar el resto del estado (score, vidas, nivel, bloques
      vivos, posición de la pelota).
    - `draw()` reescrito: fondo con `ctx.fillStyle = palette.background`
      (antes `"#000"` fijo); bloques vivos dibujados como `fillRect` con
      `palette.secondary` (con 1px de margen para conservar la grilla
      visual); explosiones como flash de `fillRect` con `palette.accent` y
      `globalAlpha` decreciente según `elapsed`/`EXPLOSION_DURATION`; paddle
      como `fillRect` y pelota como `arc` relleno, ambos con `palette.primary`.
      `ctx.shadowBlur` se resetea a `0` al inicio de `draw()` y solo se activa
      por grupo de entidad cuando `palette.glow` es `true` (8px bloques,
      14px explosión, 10px paddle/pelota).
    - `start()` dejó de ser `async` y ya no llama `await loadSpritesheet()`
      (ya no hace falta cargar la imagen para dibujar); arranca el loop de
      inmediato. Se eliminaron del import los símbolos `drawFrame`,
      `drawSprite`, `EXPLOSION_FRAMES` y `loadSpritesheet` de
      `bloque-buster-sprites.ts` (ya no se usan), conservando solo
      `EXPLOSION_DURATION`.
    - Los campos `Block.color`/`Explosion.color` (nombres de color del
      spritesheet, p. ej. `"hotpink"`) se mantienen en las interfaces y se
      siguen poblando desde `lib/bloque-buster-levels.ts` sin cambios (no se
      tocó ese archivo, fuera del alcance permitido), aunque ya no se leen
      para pintar — quedan como dato de nivel intacto por si una corrida
      futura los reutiliza.
  - `components/games/BloqueBusterGame.tsx`: prop opcional `skin?: SkinId`
    (default `DEFAULT_SKIN`), pasado como `initialSkin` al engine en el
    efecto de montaje (deps `[]`, sin tocar ese efecto más de lo necesario) y
    un segundo `useEffect` separado con deps `[skin]` que llama
    `engineRef.current?.setSkin(skin)` — mismo patrón exacto que
    `AsteroidsGame.tsx`.
  - `app/juegos/[id]/jugar/page.tsx`: el selector de skin y el estado global
    (`useSyncExternalStore` sobre `localStorage["av_skin"]`) ya existían
    íntegros de la corrida #1 — no se recrearon. Único cambio: se agregó
    `skin={skin}` a la instancia de `<BloqueBusterGame>` (antes no recibía el
    prop). La condición `hasRealEngine`/`isBloqueBuster` que decide mostrar
    el selector y montar el wrapper no cambió.
- **Archivos tocados:**
  - `components/games/engine/bloque-buster-engine.ts` (constructor +
    `setSkin` + `draw()` reescrito a formas vectoriales por paleta + `start()`
    ya no async/ya no depende del spritesheet)
  - `components/games/BloqueBusterGame.tsx` (prop `skin` + segundo efecto)
  - `app/juegos/[id]/jugar/page.tsx` (una línea: `skin={skin}` en
    `<BloqueBusterGame>`)
  - `lib/skins.ts`: leído, no modificado (los roles existentes alcanzaron).
  - `components/games/engine/bloque-buster-sprites.ts`: leído, no
    modificado — dejó de ser importado por el engine salvo
    `EXPLOSION_DURATION`, pero el archivo en sí sigue intacto y exportando
    sus utilidades por si se necesita en el futuro.
- **Resultado del lint:** `npm run lint` pasó limpio a la primera. También se
  verificó `npx tsc --noEmit` sin errores.

### #3 — 2026-08-04 — `caida`

- **Juego objetivo:** `caida` (CAÍDA / Tetris). Determinado directamente por
  la invocación explícita del contexto de la corrida ("el juego objetivo ya
  está determinado: `caida`") — no hizo falta preguntar.
- **Estado previo:** Sin implementar. `lib/skins.ts` y el selector de skin en
  `app/juegos/[id]/jugar/page.tsx` ya existían íntegros de las corridas #1 y
  #2 (los roles genéricos ya definidos alcanzaron, y el selector ya era
  visible para `caida` vía la misma condición `hasRealEngine`), pero
  `TetrisEngine` no leía ninguna paleta: cada uno de los 8 tipos de pieza
  (I/O/T/S/Z/J/L y una 8ª pieza no estándar "N"/tuerca) tenía su propio color
  hex fijo en un array `COLORS`, y tanto las piezas asentadas en el tablero
  como la pieza activa, el ghost (previsualización de aterrizaje) y el
  preview de la próxima pieza reusaban ese mismo color por tipo. La grilla de
  fondo leía el color directamente de la variable CSS `--line` vía
  `getComputedStyle`, y el canvas se limpiaba con `clearRect` (transparente,
  dejando ver el fondo `#000` fijo de `.crt-screen` en vez de un color de
  paleta).
- **Decisión de diseño clave — mapeo semántico:** el array `COLORS` (color
  fijo por tipo de pieza) se eliminó por completo. `clasico` está definido
  como monocromático (1-2 colores sin glow), y mantener 7-8 colores distintos
  por tipo de pieza habría sido indistinguible de "sin skin". Se decidió
  aplicar el rol de paleta según el **estado** del bloque, no según el tipo
  de pieza (igual criterio que llevó a `bloque-buster` a abandonar el color
  por tipo de bloque en la corrida #2):
  - **Pieza activa** (la que cae, controlada por el jugador) y **preview de
    la próxima pieza** (next-canvas) → rol `primary` — ambas representan la
    "entidad bajo control del jugador", la próxima apenas un paso antes.
  - **Piezas ya asentadas en el tablero** y **líneas de la grilla de fondo**
    → rol `secondary`, tal como sugería el prompt de esta corrida
    ("piezas ya asentadas/grid → secondary"). La grilla se dibuja con
    `globalAlpha` reducido (0.15 sin glow / 0.28 con glow) para no competir
    visualmente con los bloques asentados, que usan el mismo color a alpha
    completo.
  - **Ghost / previsualización de aterrizaje** → rol `accent`. El motor
    original no tiene ningún efecto de "línea completa" ni "flash" (las
    líneas se eliminan de inmediato en `clearLines()`, sin animación), así
    que no había ningún elemento existente equivalente a "línea completa" que
    mapear a `accent` tal como sugería el prompt como ejemplo — se optó por
    no inventar una animación de flash nueva (fuera del alcance de "aplicar
    skins", habría significado agregar una feature de gameplay/visual que no
    existía). En su lugar, se identificó el ghost piece (que ya se dibujaba
    con alpha reducido reusando el color de la pieza) como el "resalte
    puntual" más natural del motor y se le asignó `accent` — es la pieza de
    "highlight informativo" más parecida en espíritu a un power-up/flash.
    Esto se documenta explícitamente porque es una decisión de diseño, no
    una lectura mecánica del prompt.
  - **Fondo del canvas** (tanto tablero como next-canvas) → rol `background`,
    reemplazando `clearRect` por `fillRect` con `palette.background`.
  - La franja de highlight blanco translúcido en el borde superior de cada
    bloque (`rgba(255,255,255,0.12)`, un detalle de bisel/relieve, no un
    color de identidad) se dejó igual en los 3 skins — es un efecto de luz
    sutil, no compite con la definición de "clasico monocromático".
- **Qué se implementó:**
  - `lib/skins.ts`: sin cambios — los roles genéricos ya definidos
    (`background`/`primary`/`secondary`/`accent`/`glow`) alcanzaron para
    todo el mapeo de Tetris. No hizo falta agregar un rol nuevo.
  - `components/games/engine/tetris-engine.ts`:
    - Se eliminó el array `COLORS` (color hardcodeado por tipo de pieza,
      1 a 8) por completo.
    - Constructor con cuarto parámetro opcional `initialSkin: SkinId =
      DEFAULT_SKIN` (cuarto y no tercero porque Tetris ya recibe 3 parámetros
      obligatorios: `boardCanvas`, `nextCanvas`, `callbacks` — el patrón
      genérico es "parámetro final opcional para skin", no literalmente
      "tercero") y campo privado `palette: SkinPalette`.
    - Método público `setSkin(skin: SkinId)` que reemplaza `this.palette` en
      caliente sin tocar el resto del estado (score, líneas, nivel, tablero,
      pieza activa/siguiente).
    - `drawBlock()` ahora recibe un parámetro `color: string` explícito en
      vez de resolver el color desde `COLORS[colorIndex]`; `colorIndex` solo
      se usa para el chequeo "hay bloque acá" (`if (!colorIndex) return`).
      Aplica `shadowBlur`/`shadowColor` por bloque cuando `palette.glow` es
      `true`, y lo resetea a `0` antes de dibujar la franja de highlight
      blanco (para que el bisel no herede el glow).
    - `drawGrid()` reescrito: en vez de leer `--line` de CSS vía
      `getComputedStyle`, usa `this.palette.secondary` con `globalAlpha`
      reducido (0.15/0.28 según `glow`); se agregó `ctx.save()`/`restore()`
      para no filtrar el `globalAlpha` de la grilla a los dibujos
      siguientes.
    - `draw()` reescrito: `ctx.shadowBlur = 0` al inicio (evita heredar blur
      de un draw previo); fondo pintado con `fillRect` + `palette.background`
      (reemplaza `clearRect`); orden de capas sin cambios (grid → tablero
      asentado → ghost → pieza activa), cada capa con su color de rol
      correspondiente.
    - `drawNext()` reescrito con el mismo patrón: `fillRect` con
      `palette.background` en vez de `clearRect`, bloques de la preview con
      `palette.primary`.
  - `components/games/TetrisGame.tsx`: prop opcional `skin?: SkinId`
    (default `DEFAULT_SKIN`), pasado como 4º argumento (`initialSkin`) al
    construir `TetrisEngine` en el efecto de montaje (deps `[]`, sin tocar
    ese efecto más de lo necesario), y un segundo `useEffect` separado con
    deps `[skin]` que llama `engineRef.current?.setSkin(skin)` — mismo
    patrón exacto que `AsteroidsGame.tsx`/`BloqueBusterGame.tsx`.
  - `app/juegos/[id]/jugar/page.tsx`: el selector de skin y el estado global
    (`useSyncExternalStore` sobre `localStorage["av_skin"]`) ya existían
    íntegros de las corridas #1/#2 — no se recrearon. Único cambio: se
    agregó `skin={skin}` a la instancia de `<TetrisGame>` (antes no recibía
    el prop). La condición `hasRealEngine`/`isTetris` que decide mostrar el
    selector y montar el wrapper no cambió.
- **Archivos tocados:**
  - `components/games/engine/tetris-engine.ts` (eliminación de `COLORS`,
    constructor + `setSkin` + `drawBlock`/`drawGrid`/`draw`/`drawNext`
    reescritos por rol de paleta)
  - `components/games/TetrisGame.tsx` (prop `skin` + segundo efecto)
  - `app/juegos/[id]/jugar/page.tsx` (una línea: `skin={skin}` en
    `<TetrisGame>`)
  - `lib/skins.ts`: leído, no modificado (los roles existentes alcanzaron).
- **Resultado del lint:** `npm run lint` pasó limpio a la primera. También se
  verificó `npx tsc --noEmit` sin errores.

### #4 — 2026-08-07 — `ranaria`

- **Juego objetivo:** `ranaria` (RANARIA / Frogger). Determinado
  directamente por la invocación explícita ("Usá skin-designer para el juego
  `ranaria` ... motor recién portado — Frogger") — no hizo falta preguntar.
  La memoria previa (corridas #1-#3) todavía listaba `ranaria` como
  "Bloqueado: sin motor real"; se confirmó contra el estado real del árbol
  de trabajo que ya existían `components/games/engine/frogger-engine.ts` y
  `components/games/FroggerGame.tsx` (archivos sin trackear en git, recién
  portados, no reflejados aún en `CLAUDE.md`/`implemented-games.md`), y que
  `app/juegos/[id]/jugar/page.tsx` ya tenía `isFrogger` incluido en
  `hasRealEngine` (por lo que el selector de skin ya era visible para este
  juego) pero `<FroggerGame>` no recibía el prop `skin` y `FroggerEngine` no
  leía ninguna paleta — confirmando que el motor real sí existe hoy, aunque
  la documentación del proyecto (fuera del alcance permitido de este
  subagente) todavía no lo refleja.
- **Estado previo:** Sin implementar (motor recién portado, sin skins).
  `lib/skins.ts` y el selector de skin en `app/juegos/[id]/jugar/page.tsx`
  ya existían íntegros de las corridas #1-#3 (los 3 roles genéricos ya
  definidos alcanzaron, sin necesidad de agregar un rol nuevo), pero
  `FroggerEngine` dibujaba con más de 20 colores hex fijos: 4 zonas de
  terreno (`#0a3d1a` seguro, `#0a2e40` río, `#111111` carretera, `#8fe37a`
  bocas de meta), coches con 3 colores rotando (`#ff3b3b`/`#ffd23b`/
  `#3ba7ff`), camión gris (`#8a8a8a`/`#555555`), troncos marrones
  (`#7a4a25`/`#5c3416`), tortugas verdes (`#2fbf5a`/`#0e6b2c`,
  `rgba(60,180,100,0.35)` sumergidas), rana verde (`#39ff6a`), y bocas de
  meta con borde dorado (`#d4af37`) y frog-icon de meta completada
  (`#39ff6a`).
- **Decisión de diseño clave — mapeo semántico:** a diferencia de
  `asteroides`/`bloque-buster`/`caida` (entidades sobre un fondo neutro
  único), Frogger tiene 4 zonas de terreno con significado funcional
  (segura/río/carretera/meta) que el jugador necesita distinguir de un
  vistazo. Aplanar todo a un solo `palette.background` habría degradado la
  legibilidad del tablero. Se resolvió así, sin introducir ningún rol nuevo
  en `SkinPalette`:
  - **Rana (jugador)** y **frog-icon en boca de meta ya completada** → rol
    `primary` — ambas representan "la rana", la completada es la misma
    entidad ya a salvo.
  - **Vehículos de carretera** (coches, camiones — hostiles, matan al
    contacto) → rol `secondary`, mismo criterio que asteroides/bloque-buster
    usan `secondary` para amenazas/proyectiles.
  - **Flotadores del río** (troncos, tortugas — sostienen a la rana) y
    **borde de las bocas de meta** → rol `accent`, como "resalte puntual/
    elemento de soporte", análogo al power-up de asteroides.
  - **Zonas de terreno** (franjas seguras, río, carretera, franja de metas):
    en vez de un color fijo por zona, se pintan como un lavado sutil
    (`globalAlpha` 0.08–0.26 según `glow`) del rol semánticamente asociado
    sobre `palette.background` — zona segura y franja de metas usan
    `primary` (territorio/hogar de la rana), río usa `accent` (mismo rol que
    sus flotadores), carretera usa `secondary` (mismo rol que sus
    vehículos). Esto preserva la lectura de zonas sin inventar colores
    ajenos a la paleta activa; en `clasico` (monocromático) las zonas quedan
    diferenciadas solo por intensidad de alpha, consistente con la filosofía
    "1-2 colores, sin distinción de gradiente compleja" del skin.
  - **Interior de cada boca de meta** (el "hueco" donde encaja la rana) →
    rol `background` (mismo criterio que otros engines usan `background`
    como color de "hueco"/backdrop).
  - **Detalles puramente estructurales/neutros** (ruedas negras de
    vehículos, vetas de madera de troncos, caparazón de tortugas, ojos
    blanco/negro de la rana) se mantuvieron fijos (`rgba(0,0,0,0.35..0.55)`,
    `#ffffff`, `#111111`) en los 3 skins — mismo criterio ya sentado por el
    bisel blanco de `tetris-engine.ts` en la corrida #3: son detalles de
    relieve/biología, no colores de identidad. Se eliminó la variedad
    decorativa de 3 colores rotando por coche (`#ff3b3b`/`#ffd23b`/
    `#3ba7ff`), igual criterio que bloque-buster abandonó el color
    arbitrario por tipo de bloque en la corrida #2.
- **Qué se implementó:**
  - `lib/skins.ts`: sin cambios — los 3 roles genéricos ya definidos
    alcanzaron para todo el mapeo de Frogger. No hizo falta agregar un rol
    nuevo.
  - `components/games/engine/frogger-engine.ts`:
    - Constructor con tercer parámetro opcional `initialSkin: SkinId =
      DEFAULT_SKIN` (Frogger ya recibía 2 parámetros obligatorios: `canvas`,
      `callbacks`) y campo privado `palette: SkinPalette`.
    - Método público `setSkin(skin: SkinId)` que reemplaza `this.palette` en
      caliente sin tocar el resto del estado (score, vidas, nivel, tiempo,
      carriles, posición de la rana, metas ya completadas).
    - `draw()` reescrito: `ctx.shadowBlur = 0` al inicio; fondo base con
      `fillRect` + `palette.background` (reemplaza `clearRect`, que dejaba
      ver el fondo `#000` fijo de `.crt-screen`); 4 lavados de zona por
      `globalAlpha` + rol semántico (ver arriba); bocas de meta con interior
      `palette.background`, borde `palette.accent` (con glow opcional) y
      frog-icon de meta completada en `palette.primary`.
    - `drawEntity()` (antes sin parámetro de paleta explícito, ahora lee
      `this.palette` directo) reescrito para coches/camiones → `secondary`
      con ruedas neutras fijas; troncos/tortugas → `accent` con vetas/
      caparazón neutros fijos; tortuga sumergida → `accent` con
      `globalAlpha` reducido (mismo criterio que el círculo translúcido
      original).
    - `drawFrog()` reescrito: cuerpo y patas → `palette.primary` con glow
      opcional; ojos blanco/negro se mantienen fijos (detalle biológico).
  - `components/games/FroggerGame.tsx`: prop opcional `skin?: SkinId`
    (default `DEFAULT_SKIN`), pasado como 3er argumento (`initialSkin`) al
    construir `FroggerEngine` en el efecto de montaje (deps `[]`, sin tocar
    ese efecto más de lo necesario), y un segundo `useEffect` separado con
    deps `[skin]` que llama `engineRef.current?.setSkin(skin)` — mismo
    patrón exacto que los otros 3 wrappers.
  - `app/juegos/[id]/jugar/page.tsx`: el selector de skin y el estado global
    (`useSyncExternalStore` sobre `localStorage["av_skin"]`) ya existían
    íntegros de las corridas #1-#3, y `isFrogger`/`hasRealEngine` ya
    mostraba el selector para este juego — no se recrearon. Único cambio: se
    agregó `skin={skin}` a la instancia de `<FroggerGame>` (antes no recibía
    el prop).
- **Archivos tocados:**
  - `components/games/engine/frogger-engine.ts` (import de `lib/skins`,
    constructor + `setSkin` + `draw`/`drawEntity`/`drawFrog` reescritos por
    rol de paleta)
  - `components/games/FroggerGame.tsx` (prop `skin` + segundo efecto)
  - `app/juegos/[id]/jugar/page.tsx` (una línea: `skin={skin}` en
    `<FroggerGame>`)
  - `lib/skins.ts`: leído, no modificado (los roles existentes alcanzaron).
- **Resultado del lint:** `npm run lint` pasó limpio a la primera. También se
  verificó `npx tsc --noEmit` sin errores.
- **Nota de contexto:** `CLAUDE.md`/`AGENTS.md`/`implemented-games/
  implemented-games.md` todavía describen el catálogo como "solo 3 juegos
  con motor real" y listan `ranaria` entre los placeholders — quedaron
  desactualizados por el port reciente de Frogger. Actualizarlos está fuera
  del alcance permitido de `skin-designer` (esos archivos no están en la
  lista de archivos que puede tocar); se señala aquí para que se actualicen
  en otra corrida/PR.
