# SPEC 06 — Juego Tetris jugable (CAÍDA)

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-08-03
> **Objective:** Portar el motor real de Tetris (`references/started-games/03-tetris/game.js`) al juego "CAÍDA" ya existente en el catálogo, reemplazando el Reproductor simulado únicamente para `id === "caida"`.

## Scope

**In:**

- Motor de juego portado 1:1 desde `references/started-games/03-tetris/game.js`, como clase standalone `TetrisEngine` (`components/games/engine/tetris-engine.ts`), con las constantes `COLS`/`ROWS`/`BLOCK`/`COLORS`/`PIECES`/`LINE_SCORES` inline en el archivo del engine.
- Componente wrapper React `TetrisGame` (`components/games/TetrisGame.tsx`), `forwardRef`/`useImperativeHandle`, que renderiza **2 canvases**: tablero (300×600) y preview de siguiente pieza (120×120); ambos refs se pasan al constructor de `TetrisEngine`.
- Rama condicional en `app/juegos/[id]/jugar/page.tsx`: si `id === "caida"` renderiza `<TetrisGame />` dentro de `.crt-screen`, reemplazando el `<div className="game-arena">` placeholder. El `useEffect` de score simulado se desactiva agregando esta condición a sus dependencias (mismo patrón que `isAsteroids`).
- HUD del sitio como única fuente visible de datos: `onScoreChange`, `onGameOver` (universales), `onLevelChange`, `onLinesChange` (nuevo quinto slot "Líneas" en `player-hud`, visible solo cuando `id === "caida"`) y `onLivesChange` (`1` al iniciar/reset, `0` justo antes de `onGameOver`, ya que el original no tiene vidas reales). Se elimina `updateHUD()` (actualización DOM vía `textContent`) del original.
- Pausa adaptada a la convención ya asentada: `pause()`/`resume()` solo detienen `update()` (avance de piezas); `draw()` y el loop de `requestAnimationFrame` nunca se cancelan. Se descarta el `togglePause()` original que cancelaba/relanzaba el RAF completo.
- Botón **FIN** del sitio llama `forceGameOver()`.
- Se elimina el atajo de teclado `KeyP` del original (pausa nativa) — la pausa solo se controla vía el botón PAUSA/REANUDAR del sitio.
- Controles de teclado portados: `←`/`→` mueven la pieza, `↓` soft drop, `↑` o `X` rotan (con wall kicks `tryRotate()`), `Espacio` hard drop; `preventDefault` en esas teclas mientras el juego está montado.
- Layout de los 2 canvases dentro de `.crt-screen`: el tablero se centra y escala a la altura de `.crt-screen` (con letterboxing horizontal si sobra ancho); el preview de siguiente pieza se posiciona `absolute` superpuesto en una esquina del tablero, sin reservar franja lateral propia.
- Modal de fin de partida y guardado de puntuación reutilizados sin cambios (ya genéricos vía `saveScore(gameId, name, score)` de spec 05, funciona para `gameId: "caida"` sin modificaciones).
- "JUGAR DE NUEVO" llama `reset()` (reinicia tablero, score, líneas, nivel, pieza actual/siguiente).
- "SALIR" navega a `/juegos/caida` y destruye el engine.

**Out of scope (for future specs):**

- Reusar la entrada `caida` existente en `GAMES` tal cual (título, descripción, color, `best`, `plays`, `cover: cover-tetro`) — no se crea entrada nueva ni se edita ninguno de esos campos.
- Ninguna migración ni CSS nuevo: `.cover-tetro` ya existe en `app/globals.css` y la fila `games` para `id: "caida"` ya existe en Supabase (sembrada en spec 05) — verificado, `select id from games where id = 'caida'` devuelve una fila.
- Controles táctiles/móviles.
- Sonido/audio (el original tampoco lo tiene).
- El theme toggle propio (claro/oscuro) del `index.html` de referencia — el sitio ya tiene su propio sistema de tema; no se porta.
- Cualquier cambio a otros juegos placeholder del catálogo (`rocas`, `bloque-buster`, etc.) o a `asteroides`.
- Un mecanismo genérico de "juego real conectable" más allá de esta rama condicional puntual para `caida`.

## Data model

No se agrega ninguna entrada nueva a `GAMES` (`lib/games-data.ts`) — se reusa `id: "caida"` tal cual, con todos sus campos existentes (`title`, `short`, `long`, `cat: "PUZZLE"`, `cover: "cover-tetro"`, `color: "magenta"`, `best: 184220`, `plays: "31.8K"`).

### Interfaz del componente del motor (`components/games/TetrisGame.tsx`)

```ts
interface TetrisGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onLinesChange: (lines: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface TetrisGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}
```

`TetrisGame` es un `forwardRef` que expone `TetrisGameHandle` vía `useImperativeHandle`. Internamente renderiza dos `<canvas>`: uno para el tablero (`width={300} height={600}`) y uno para el preview de la siguiente pieza (`width={120} height={120}`); ambas refs se pasan al constructor de `TetrisEngine`.

`onLivesChange` reporta `1` al iniciar/`reset()`, y `0` justo antes de disparar `onGameOver` (el original no tiene vidas reales — game over ocurre al chocar la pieza nueva en el spawn).

### Estado nuevo en `app/juegos/[id]/jugar/page.tsx`

```ts
const [lines, setLines] = useState(0);
const isTetris = id === "caida";
```

Un quinto `hud-stat` ("Líneas") se renderiza condicionalmente en `player-hud` solo cuando `isTetris` es `true`, entre "Nivel" y los botones de acción. Para los otros 8 juegos, `player-hud` no cambia.

### Persistencia reutilizada

No se crea ningún esquema ni migración nuevos. `getTopScores("caida", 10)` y `saveScore("caida", name, score)` de spec 05 ya funcionan sin cambios — la fila `games` para `id: "caida"` ya existe en Supabase.

## Implementation plan

1. **Motor del juego como clase standalone.** Crear `components/games/engine/tetris-engine.ts`, portando 1:1 las funciones de `references/started-games/03-tetris/game.js` (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `drawBlock`, `drawGrid`, `draw`, `drawNext`) dentro de una clase `TetrisEngine` cuyo constructor recibe `(boardCanvas: HTMLCanvasElement, nextCanvas: HTMLCanvasElement, callbacks: TetrisEngineCallbacks)`. Sin integración con React todavía; no se importa en ninguna pantalla.

2. **Loop, input y callbacks.** Implementar `start()`/`pause()`/`resume()`/`reset()`/`forceGameOver()`/`destroy()` en `TetrisEngine`. `start()` agrega el listener `keydown` (sin `keyup`, igual que el original — cada tecla dispara una acción discreta) con `preventDefault` en flechas y espacio, y arranca el `requestAnimationFrame`; se omite el atajo `KeyP` del original. `pause()`/`resume()` detienen/reanudan solo el avance automático de la pieza (`dropAccum`/auto-drop dentro de `update()`); `draw()` y el RAF siguen corriendo siempre. Se elimina `updateHUD()` (DOM); en su lugar, cada cambio de score/líneas/nivel dispara el callback correspondiente, `onLivesChange(1)` se dispara en `start()`/`reset()`, y `endGame()` dispara `onLivesChange(0)` seguido de `onGameOver(score)`.

3. **Componente React `TetrisGame`.** Crear `components/games/TetrisGame.tsx`: client component con `forwardRef<TetrisGameHandle, TetrisGameProps>` que renderiza los dos `<canvas>` (tablero centrado y escalado a la altura de `.crt-screen`, preview superpuesto `absolute` en una esquina), instancia `TetrisEngine` en un `useEffect` (llamando `start()` al montar y `destroy()` al desmontar), y expone `pause`/`resume`/`reset`/`forceGameOver` vía `useImperativeHandle`.

4. **Integración en el Reproductor.** En `app/juegos/[id]/jugar/page.tsx`: agregar `isTetris = id === "caida"` a las dependencias del `useEffect` de score simulado (para desactivarlo); agregar estado `lines`; renderizar `<TetrisGame ref={...} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onLinesChange={setLines} onGameOver={handleGameOver} />` dentro de `.crt-screen` cuando `isTetris`; agregar el quinto `hud-stat` "Líneas" a `player-hud`, visible solo si `isTetris`; conectar PAUSA/REANUDAR/FIN/JUGAR DE NUEVO a los métodos del ref, igual que el patrón ya usado para `asteroidsRef`. Verificar `player-hud` en viewport angosto con los 5 slots visibles.

5. **QA manual y build.** Jugar una partida completa (limpiar líneas simples y múltiples, subir de nivel y notar el aumento de velocidad, usar hard drop y soft drop, ver la pieza fantasma, forzar game over chocando en el spawn), confirmar que PAUSA congela el tablero visualmente sin detener el render, guardar puntuación real y verla en Detalle (`/juegos/caida`) y Salón de la Fama, confirmar cero errores en consola, y correr `npm run build` y `npm run lint`.

Nota: a diferencia del esqueleto por defecto de `pattern.md`, este plan **no incluye** pasos de catálogo/CSS/migración Supabase — se reusa `caida` y `.cover-tetro` tal cual, y la fila `games` ya existe.

## Acceptance criteria

- [x] `npm run build` y `npm run lint` pasan sin errores.
- [x] La tarjeta "CAÍDA" en Biblioteca y su Detalle (`/juegos/caida`) no cambian visualmente (título, descripción, portada `.cover-tetro`, filtro "PUZZLE") respecto al estado actual.
- [x] `/juegos/caida/jugar` renderiza los dos canvases del juego real (tablero + preview de siguiente pieza) dentro del marco `.crt-screen`; los otros 8 juegos (incluido `asteroides`) siguen mostrando su Reproductor sin cambios.
- [x] La barra HUD del sitio (Jugador/Puntuación/Vidas/Nivel + el quinto slot "Líneas" visible solo en este juego) refleja en vivo el estado real: puntuación sube al limpiar líneas y con soft/hard drop, "Líneas" sube al completar filas, "Nivel" sube cada 10 líneas, "Vidas" pasa de 1 a 0 al terminar la partida.
- [x] Los controles `←` `→` mueven la pieza, `↓` hace soft drop, `↑`/`X` rotan (con wall kicks), `Espacio` hace hard drop; ninguna de esas teclas hace scroll de la página mientras el juego está montado.
- [x] Completar una fila la limpia y desplaza el tablero hacia abajo; completar varias filas a la vez otorga el puntaje combinado (`LINE_SCORES` × nivel).
- [x] La pieza fantasma (ghost) se dibuja semitransparente en la posición de aterrizaje proyectada.
- [x] La velocidad de caída aumenta con cada nivel (`dropInterval` decrece).
- [x] Al chocar la pieza nueva en el punto de spawn se abre el modal de fin de partida con la puntuación final; "GUARDAR PUNTUACIÓN" inserta una fila real en Supabase (`scores` con `game_id: "caida"`) y muestra el toast "PUNTUACIÓN GUARDADA_"; la puntuación aparece luego en el Detalle y en el Salón de la Fama para `caida`.
- [x] El botón PAUSA congela el tablero (ninguna pieza avanza) sin ocultar el canvas — se ve el juego congelado detrás del overlay "EN PAUSA"; REANUDAR continúa exactamente donde quedó.
- [x] El botón FIN abre el modal de fin de partida inmediatamente con el score actual, sin esperar a que la pieza choque en el spawn.
- [x] "JUGAR DE NUEVO" reinicia tablero, score, líneas y nivel sin recargar la página.
- [x] "SALIR" navega a `/juegos/caida` y detiene el loop del juego (verificable en que no sigue corriendo en segundo plano ni genera errores al volver a entrar).
- [x] "VOLVER AL VAULT" desde el modal de game over navega a `/biblioteca`.

## Decisiones

- **Sí:** reusar el `id: "caida"` existente en `GAMES` en vez de crear un `id` nuevo (p. ej. `"tetris"`). Decisión explícita del usuario, distinta del precedente de spec 04 (asteroides vs. rocas) — ahí se mantuvieron separados porque el usuario los consideró conceptualmente distintos; acá "caida" ya fue redactado desde el inicio como un Tetris temático, sin una versión "simulada" que deba coexistir.

- **Sí:** no se crea CSS nuevo ni migración de Supabase — se reusan `.cover-tetro` y la fila `games` para `"caida"`, ambas ya existentes. Evita duplicar trabajo ya hecho en specs anteriores para un juego que ya estaba en el catálogo.

- **Sí:** se agrega `onLivesChange` pese a que Tetris no tiene vidas reales, reportando `1` al iniciar/reset y `0` justo antes de `onGameOver`. Decisión explícita del usuario, contra la recomendación de `pattern.md` (no copiar los 4 callbacks de Asteroides por inercia) — mantiene el slot "Vidas" del HUD con un valor consistente en vez de dejarlo vacío o eliminarlo solo para este juego.

- **Sí:** se agrega `onLinesChange` y un quinto slot "Líneas" en `player-hud`, visible únicamente cuando `id === "caida"`. Decisión explícita del usuario sobre cómo exponer un contador que ningún otro juego portado tiene, evitando mostrar un slot vacío/irrelevante en los otros 8 juegos.

- **Sí:** la pausa converge a la convención ya asentada por Asteroides (`pause()`/`resume()` solo detienen el avance de la pieza; `draw()` y el RAF nunca se cancelan), descartando el `togglePause()` original que cancelaba/relanzaba el `requestAnimationFrame` completo. Mantiene consistencia de comportamiento entre todos los juegos portados y permite que el overlay "EN PAUSA" del sitio muestre el tablero congelado detrás.

- **No:** conservar el atajo de teclado `KeyP` para pausa nativa del original. Solo el botón PAUSA/REANUDAR del sitio controla la pausa, evitando un segundo mecanismo de control paralelo a la UI (mismo criterio que Asteroides, que tampoco expone atajos de teclado para pausa).

- **No:** portar el theme toggle (claro/oscuro) del `index.html` de referencia. El sitio ya tiene su propio sistema de tema; es ruido de la demo standalone, no parte del juego en sí.

- **Sí:** el motor se refactoriza como clase (`TetrisEngine`) en vez de mantener el estilo de variables globales module-scope del `game.js` original, por la misma razón que `AsteroidsEngine` en spec 04 — los globals no son seguros en React (Strict Mode, necesidad de limpiar al desmontar).

- **Sí:** el tablero se centra y escala a la altura de `.crt-screen` (con letterboxing horizontal si sobra ancho); el preview de siguiente pieza se posiciona `absolute` superpuesto en una esquina del tablero, en vez de reservar una franja lateral fija. Prioriza mantener el marco `.crt-screen` sin modificar su `aspect-ratio` compartido por los otros 8 juegos.

- **Sí:** dependencia declarada de SPEC 04 (patrón de engine/wrapper ya validado) y SPEC 05 (leaderboard genérico ya funcional para cualquier `gameId`). No se depende de SPEC 01/02/03 más allá de lo que SPEC 04/05 ya heredan.

## Riesgos

| Riesgo                                                                                                                                                                                                   | Mitigación                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El tablero (300×600, aspecto 1:2) no coincide con el aspect-ratio 4/3 de `.crt-screen` (pensado para el canvas único 800×600 de Asteroides), pudiendo verse desproporcionado o cortado.                  | El tablero se renderiza con `height: 100%` y `width: auto` (o equivalente) dentro de un contenedor flex centrado en `.crt-screen`, dejando franjas vacías a los costados en vez de deformar el canvas; el preview se posiciona `absolute` superpuesto en una esquina, sin reservar espacio propio en el layout. |
| React monta los efectos dos veces en desarrollo (Strict Mode), pudiendo instanciar `TetrisEngine` dos veces y duplicar el listener de teclado o el loop de `requestAnimationFrame`.                      | El `useEffect` de `TetrisGame` siempre limpia con `destroy()` antes de un nuevo `start()`; `destroy()` es idempotente, igual que en `AsteroidsEngine`.                                                                                                                                                          |
| Un callback (`onScoreChange`, `onLinesChange`, `onGameOver`, etc.) podría dispararse desde un frame en vuelo justo cuando el componente ya se desmontó.                                                  | `destroy()` cancela el `requestAnimationFrame` pendiente y marca un flag interno (`destroyed`) que corta cualquier callback posterior, igual que en `AsteroidsEngine`.                                                                                                                                          |
| El quinto slot "Líneas" en `player-hud`, renderizado condicionalmente solo para `caida`, podría romper el `flexWrap` responsivo del HUD en pantallas angostas si no se prueba junto a los otros 4 slots. | QA manual incluye verificar `player-hud` en viewport angosto con los 5 slots visibles antes de dar el paso 4 del plan por cerrado.                                                                                                                                                                              |

## Lo que **no** está en este spec

- Entrada nueva en `GAMES` o CSS nuevo — se reusan `caida` y `.cover-tetro` tal cual.
- Migración de Supabase — la fila `games` para `caida` ya existe.
- Controles táctiles/móviles para este juego.
- Sonido/audio.
- El theme toggle claro/oscuro propio de la demo original.
- Cualquier cambio a otros juegos del catálogo (`rocas`, `bloque-buster`, `asteroides`, etc.).
- Un mecanismo genérico de "juego real conectable" para futuros juegos.

Cada uno de estos, si se implementa, va en su propio spec.
