# SPEC — Frogger: integración core del juego

> **Estado:** aprobado
> **Depende de:** 04-juego-asteroides (contrato de engine/wrapper), 05-leaderboard-y-tabla-juegos (leaderboard genérico)
> **Fecha:** 2026-08-07 (corregido tras revisión de arquitectura)
> **Objetivo:** Completar el placeholder `ranaria` del catálogo con un motor real de Frogger (canvas puro, construido desde cero), siguiendo el mismo contrato de engine/wrapper ya validado por Asteroides/Tetris/Arkanoid, e integrarlo en la ruta genérica `app/juegos/[id]/jugar/page.tsx`.

---

## Nota de corrección

La primera versión de este spec asumía una arquitectura que no existe en este repo: tabla `games` poblada solo por este spec, ruta dedicada `app/games/frogger/play`, columnas `player_name`/`user_id` en `scores`, clave `localStorage` propia `av_player_name`, color `lime` fuera del enum `GameColor`, e `id` de catálogo nuevo (`frogger`). Ninguna de esas piezas existe o encaja con el repo real. Esta versión corrige la capa de integración; **la mecánica de juego (carreteras, río, tortugas, bocas, vidas, puntuación, temporizador) se mantiene intacta** — es la parte que sí estaba bien diseñada.

**Decisión de `id`:** se reusa el placeholder `ranaria` ya existente en `GAMES` (`lib/games-data.ts`) y en la tabla `games` de Supabase, en vez de crear un `id` `frogger` nuevo. Mismo precedente que `caida`→Tetris y `bloque-buster`→Arkanoid: el placeholder ya describe exactamente esta mecánica (`short`: "Cruza la autopista de pixeles.", `long`: "Salta entre carriles de coches... troncos... río... nenúfares..."), su `cover-rana` ya está definido en `app/globals.css`, y no hace falta romper la tarjeta existente de Biblioteca.

---

## Scope

**In:**

- Ningún cambio de datos necesario en `lib/games-data.ts` ni en la tabla `games` de Supabase: la entrada `ranaria` (`title`, `short`, `long`, `cat: "ARCADE"`, `cover: "cover-rana"`, `color: "green"`) ya describe con precisión el juego portado y ya existe en ambos lados (fila real confirmada en Supabase, FK de `scores.game_id` ya satisfecha). Opcionalmente se pueden ajustar `best`/`plays` si se quiere un valor más realista, sin obligación.
- Motor puro en `components/games/engine/frogger-engine.ts`: clase `FroggerEngine` siguiendo el contrato validado en `pattern.md` — constructor `(canvas, callbacks)`, métodos públicos `start()/pause()/resume()/reset()/forceGameOver()/destroy()`, loop de `requestAnimationFrame` que **nunca se cancela**, `pause()` congela solo `update()` (`draw()` sigue corriendo), `destroy()` idempotente que remueve listeners y cancela el frame pendiente, flag interno `destroyed` que corta callbacks tardíos.
- Cuadrícula de 16 columnas × 14 filas de 40 × 40 px (canvas interno 640×560, escalado fluido vía CSS dentro de `.crt-screen`, igual que los demás juegos). Zonas: fila de metas (fila 0), río (filas 1–6), zona segura media (fila 7), carretera (filas 8–12), fila de inicio (fila 13).
- Entidades de carretera: coches y camiones (1–3 celdas), velocidades y direcciones por carril, loop horizontal continuo, colisión letal.
- Entidades de río: troncos (2–4 celdas) y grupos de tortugas (2–3) por carril, loop horizontal; la rana sobrevive en el río solo sobre tronco o tortugas visibles; las tortugas se sumergen periódicamente (visible → bajo el agua → visible) y no dan soporte mientras están sumergidas.
- Movimiento de la rana: saltos discretos de 1 celda (40 px) en 4 direcciones, animación de salto de 120 ms por pulsación; no puede salir por los bordes laterales.
- Condición de meta: llegar a una de las 5 bocas destino de la fila superior (cada una ocupa 2 columnas); una boca ocupada no puede reusarse en la misma ronda; al llenar las 5 se completa la ronda y arranca la siguiente.
- Condiciones de muerte: colisión con vehículo, caída al agua, tortuga que sumerge bajo la rana, salida por los bordes del río, agotar el temporizador de ronda (15 s iniciales, reducidos en niveles altos).
- Sistema de vidas: arranca en 3. Cada muerte resta 1 vida y dispara `onLivesChange(lives)`. Al llegar a 0, `onLivesChange(0)` y luego `onGameOver(score)`.
- Puntuación: +10 pts por celda avanzada por primera vez en la ronda, +50 pts al ocupar una boca, +200 pts al completar la ronda, +bonus de tiempo (`tiempo_restante × 10`) al ocupar una boca. `onScoreChange(score)` en cada cambio.
- Temporizador de ronda: 15 s por defecto, decrece en niveles altos; se expone vía callback (ver HUD abajo), no dibujado en canvas.
- Prop/callback `onLevelChange(level)` al iniciar cada ronda nueva; velocidad de entidades y reducción del temporizador escalan con el nivel (+15 % por nivel).
- **HUD siempre vía callback, nunca dibujado en el canvas** (mismo patrón que todo el catálogo — spec 04/pattern.md): se elimina cualquier HUD interno (score/vidas/nivel/barra de tiempo dibujados en canvas). El temporizador de ronda se expone como un callback adicional propio del juego, `onTimeChange(secondsLeft: number)`, siguiendo el mismo precedente que `onLinesChange` de Tetris (contador propio del juego, no universal).
- Wrapper React `components/games/FroggerGame.tsx`: `"use client"`, `forwardRef<FroggerGameHandle, FroggerGameProps>`, monta `<canvas width={640} height={560} style={{ width: "100%", height: "100%" }} />`, instancia `FroggerEngine` en `useEffect` (`start()` al montar, `destroy()` al desmontar), expone `pause/resume/reset/forceGameOver` vía `useImperativeHandle`.
- Integración en `app/juegos/[id]/jugar/page.tsx`: rama condicional `id === "ranaria"` (junto a `isAsteroids`/`isTetris`/`isBloqueBuster`) que renderiza `<FroggerGame ref={...} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onTimeChange={setTimeLeft} onGameOver={handleGameOver} />` dentro de `.crt-screen` en vez del `game-arena` placeholder. Se agrega `isFrogger` a las dependencias del `useEffect` de score simulado para desactivarlo. PAUSA/REANUDAR/FIN/"JUGAR DE NUEVO" se conectan igual que los otros tres juegos vía el ref.
- HUD del sitio: agregar un stat custom "Tiempo" en `player-hud` cuando `isFrogger`, mismo patrón que el stat "Líneas" de Tetris.
- Guardado de puntuación: reutiliza el modal y flujo ya existentes en la play page (`saveScore(game.id, name, score)`, `getTopScores`) sin ningún cambio — no se crean columnas ni claves de `localStorage` nuevas.
- Listeners de teclado (`keydown`) agregados en `start()` del engine y removidos en `destroy()`, no en un `useEffect` de React aparte (mismo patrón que los otros engines).

**Fuera de alcance:**

- Sprites bitmap externos — todo se dibuja con primitivas canvas.
- Controles táctiles/móviles (se audita después, automáticamente, vía `mobile-porter`).
- Skins visuales (`clasico`/`retro`/`neon`) — se aplican automáticamente después de este spec vía el subagente `skin-designer`; el engine no necesita construir la paleta por su cuenta en este spec.
- Animaciones de muerte elaboradas (explosiones, partículas).
- Power-ups especiales (mosca en la boca destino, cocodrilo disfrazado de tronco).
- Supabase Auth y RLS — sin cambios sobre lo ya asentado en spec 05.
- Realtime en el leaderboard.
- Componente genérico `CanvasGame` (YAGNI).
- Cualquier migración de esquema en Supabase — la fila `ranaria` y la tabla `scores` ya sirven tal cual.

---

## Data model

No se agregan tablas, columnas ni tipos nuevos. Se reutiliza `ScoreRow` de `lib/scores.ts` y la entrada `ranaria` ya existente en `GAMES`/`games` (ver Scope).

### Props/handle del componente `FroggerGame`

```ts
interface FroggerGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onTimeChange: (secondsLeft: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface FroggerGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}
```

El estado interno del engine arranca con `lives = 3`, `score = 0`, `level = 1`, `timeLeft = 15`.
`onLivesChange(n)` se dispara en cada muerte. `onLivesChange(0)` se dispara justo antes de `onGameOver(score)`.

---

## Implementation plan

1. **Confirmar que no hace falta ninguna migración.** Verificar en Supabase (`mcp__supabase__execute_sql` o Table Editor) que la fila `ranaria` ya existe en `games` — ya confirmado en la revisión de este spec. No ejecutar ningún `INSERT`.

2. **Definir constantes y tipos** dentro de `frogger-engine.ts`:

   ```ts
   const COLS = 16;
   const ROWS = 14;
   const CELL = 40; // px
   const CANVAS_W = COLS * CELL; // 640
   const CANVAS_H = ROWS * CELL; // 560
   const ROW_GOALS = 0;
   const ROW_RIVER_TOP = 1;
   const ROW_RIVER_BOT = 6;
   const ROW_SAFE_MID = 7;
   const ROW_ROAD_TOP = 8;
   const ROW_ROAD_BOT = 12;
   const ROW_START = 13;
   ```

   Tipos locales (no exportados): `Direction`, `Lane`, `Entity`, `Frog` — mismo contenido que la versión original de este spec.

3. **Construir el mapa de carriles** — `buildLanes(level: number): Lane[]`, carriles de carretera (filas 8–12) y de río (filas 1–6) con huecos atravesables, velocidades escaladas por nivel (+15 % por nivel), ciclo de inmersión de tortugas (3 s visible / 1.5 s sumergida).

4. **Clase `FroggerEngine`** con el contrato de `pattern.md`:
   - Constructor `(canvas, callbacks)`, obtiene `ctx`.
   - `start()`: agrega el listener `keydown` sobre `document`, arranca el loop `requestAnimationFrame`.
   - `update(dt)`: mueve entidades, resuelve input pendiente de la rana (animación de salto de 120 ms), resuelve colisiones/soporte/meta al completar el salto, decrementa el temporizador de ronda y llama `onTimeChange` cuando cambia, dispara callbacks cuando cambian score/vidas/nivel.
   - `draw()`: fondos por zona, entidades (coches/camiones/troncos/tortugas), rana, bocas destino — **sin HUD dibujado** (ni score, ni vidas, ni barra de tiempo en canvas).
   - `pause()/resume()`: congelan/reanudan solo `update()`; `draw()` sigue corriendo siempre.
   - `reset()`: reinicia score/vidas/nivel/entidades/temporizador sin recrear el engine.
   - `forceGameOver()`: dispara `onGameOver(score)` inmediatamente.
   - `destroy()`: remueve el listener, cancela el frame pendiente, idempotente; flag `destroyed` corta callbacks posteriores.

5. **Detección de colisiones y soporte**: `checkRoadCollision`, `getSupport` (`null` si la tortuga está sumergida), `checkGoal` — misma lógica que la versión original de este spec, como métodos/funciones internas del engine.

6. **Gestión de ronda completada y muerte**: `completeRound()` (reset de posición, vacía bocas, incrementa nivel, reconstruye carriles, resetea temporizador) y `killFrog()` (decrementa vidas, dispara callbacks, resetea posición o dispara game over) como métodos de instancia.

7. **Wrapper `components/games/FroggerGame.tsx`**: client component, `forwardRef<FroggerGameHandle, FroggerGameProps>`, `<canvas width={640} height={560} style={{ width: "100%", height: "100%" }} />`, instancia el engine en `useEffect` (`start()` al montar, `destroy()` al desmontar), expone el handle vía `useImperativeHandle`.

8. **Integración en `app/juegos/[id]/jugar/page.tsx`**:
   - Importar `FroggerGame` y agregar `froggerRef`, `isFrogger = id === "ranaria"`.
   - Agregar `isFrogger` a `hasRealEngine` y a las dependencias del `useEffect` de score simulado (para desactivarlo).
   - Agregar rama `isFrogger ? <FroggerGame ref={froggerRef} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onTimeChange={setTimeLeft} onGameOver={handleGameOver} /> : ...` en la cadena ternaria existente.
   - Conectar `togglePause`/`endGame`/`restart` al `froggerRef` igual que los otros tres juegos.
   - Agregar estado `timeLeft` y un stat "Tiempo" en `player-hud` visible solo cuando `isFrogger` (mismo patrón que el stat "Líneas" de Tetris).
   - No tocar el modal de fin de partida ni `saveScore` — ya son genéricos.

9. **Verificación final**: `npm run build` sin errores de TypeScript, `npm run lint` sin errores. QA manual: partida completa, muerte por cada causa, ronda completa, game over a las 3 vidas, guardado de score real, `/juegos/ranaria` y `/salon` reflejan el score guardado.

---

## Acceptance criteria

- [ ] No se ejecuta ninguna migración: la fila `ranaria` en `games` y la tarjeta en `lib/games-data.ts` quedan sin cambios de identidad (`id`, `cover`, `color`).
- [ ] `/juegos/ranaria` sigue cargando sin errores, mostrando el mismo `cover-rana` y textos ya existentes.
- [ ] `/juegos/ranaria/jugar` renderiza el canvas real (640×560) dentro de `.crt-screen`, reemplazando el placeholder animado.
- [ ] El canvas muestra las cuatro zonas visualmente diferenciadas (carretera, río, zonas seguras, bocas destino), sin ningún texto de HUD dibujado dentro.
- [ ] La rana aparece centrada en la fila de inicio al cargar la partida.
- [ ] La rana salta exactamente una celda (40 px) por pulsación de tecla de dirección con animación de 120 ms, y no sale por los bordes laterales.
- [ ] Coches/camiones y troncos/tortugas se mueven horizontalmente en loop, reintroduciéndose por el lado opuesto.
- [ ] Las tortugas alternan visible/sumergida con el ciclo definido; sin soporte mientras están sumergidas.
- [ ] La rana muere por: colisión con vehículo, caída al agua, tortuga que se sumerge bajo ella, salida por bordes del río, o agotar el temporizador de ronda.
- [ ] Al morir, `onLivesChange(lives)` se dispara y la rana vuelve a la fila de inicio (o `onGameOver` si era la última vida).
- [ ] Al llegar a una boca libre, se marca y suma el bonus de puntuación; llegar a una boca ya ocupada mata a la rana.
- [ ] Al completar las 5 bocas, la ronda termina, `level` se incrementa y `onLevelChange(level)` se dispara.
- [ ] La velocidad de entidades y la reducción del temporizador escalan con cada nivel.
- [ ] `onScoreChange(score)`, `onTimeChange(secondsLeft)` se disparan en cada cambio de su valor respectivo.
- [ ] El HUD de la plataforma (Puntuación/Vidas/Nivel/Tiempo) refleja en vivo el estado real; ningún dato se dibuja duplicado en el canvas.
- [ ] PAUSA congela `update()` (el render sigue visible con overlay "EN PAUSA" del sitio); REANUDAR continúa exactamente donde quedó.
- [ ] FIN dispara `forceGameOver()` inmediatamente.
- [ ] Al llegar a `lives = 0`, se abre el modal de fin de partida genérico de la plataforma con la puntuación final.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `scores` (`game_id: "ranaria"`) vía `saveScore`, sin doble inserción tras el primer envío.
- [ ] "JUGAR DE NUEVO" reinicia la partida desde cero (`reset()` del engine, mismo flujo que los demás juegos).
- [ ] El score guardado aparece en `/juegos/ranaria` y en `/salon` al recargar.
- [ ] Ninguna tecla de juego provoca scroll de página mientras el juego está montado.
- [ ] `npm run build` y `npm run lint` completan sin errores.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: reusar el `id: "ranaria"` existente** en vez de crear `frogger` nuevo. Mismo precedente que `caida`/`bloque-buster`: el placeholder ya describe exactamente esta mecánica y ya tiene `cover-rana` construido; no se justifica una tarjeta duplicada. _(Decisión corregida — la versión original de este spec proponía un `id` nuevo sin verificar el catálogo existente.)_
- **Sí: clase `FroggerEngine` + wrapper `forwardRef`**, siguiendo el contrato de `pattern.md` (idéntico a Asteroides/Tetris/Arkanoid) en vez del componente monolítico con prop `paused: boolean` de la versión original. Razón: consistencia con el resto del catálogo, permite pausa que congela solo `update()`, `destroy()` idempotente compatible con React Strict Mode, y evita reinventar un contrato ya validado tres veces. _(Decisión corregida.)_
- **Sí: integración en la ruta genérica `app/juegos/[id]/jugar/page.tsx`**, no una play-page dedicada `app/games/frogger/play/page.tsx`. Razón: esa ruta dedicada no existe en ningún juego del catálogo — todos comparten la ruta `[id]/jugar` con ramas condicionales por `id`. _(Decisión corregida.)_
- **Sí: leaderboard 100% genérico**, sin columnas `player_name`/`user_id` ni clave `localStorage` propia. Se reutiliza `saveScore(gameId, name, score)`/`getTopScores(gameId, limit)` y el modal ya existente en la play page, exactamente como Arkanoid (spec 07). Razón: esas piezas ya funcionan para cualquier `gameId` sin modificación; duplicarlas introduce inconsistencia con el resto del catálogo. _(Decisión corregida.)_
- **Sí: HUD 100% vía callbacks**, incluyendo el temporizador de ronda como callback propio del juego (`onTimeChange`, mismo patrón que `onLinesChange` de Tetris), en vez de un HUD dibujado en canvas. Razón: regla ya asentada del catálogo ("HUD siempre vía callback, nunca dibujado"). _(Decisión corregida — la versión original pedía doble HUD con barra de tiempo dibujada en canvas.)_
- **Sí: Primitivas canvas sin sprites bitmap** — coches, camiones, troncos, tortugas y rana se dibujan con formas geométricas y colores temáticos. Razón: no existen assets de Frogger en el repositorio.
- **Sí: Cuadrícula discreta de 40 px con animación de salto de 120 ms** — movimiento celda a celda, no continuo. Razón: mecánica canónica de Frogger; simplifica la detección de colisiones y soporte en el río.
- **Sí: 3 vidas**, fiel a la mecánica clásica, coherente con Arkanoid y Asteroides.
- **Sí: Tortugas con ciclo de inmersión** — mecánica diferenciadora de Frogger frente a un río de solo troncos.
- **Sí: Temporizador de ronda** (15 s iniciales, decrece en niveles altos) — mecánica original que añade urgencia.
- **Sí: 5 bocas destino** — estructura de objetivo claro por ronda.
- **Sí: Canvas 640×560 px (16×14 celdas de 40 px)** — proporción vertical fiel al original.
- **No: Movimiento continuo (interpolado)** — la interpolación aumentaría la complejidad de colisiones sin añadir diversión.
- **No: Cocodrilo disfrazado de tronco ni mosca bonus en bocas** — se cubren en un spec secundario de power-ups.
- **No: Componente genérico `CanvasGame`** — YAGNI, cada juego tiene su propio wrapper.
- **No: RLS nuevo ni cambios de esquema en Supabase** — se reutiliza tal cual lo asentado en spec 05.
- **No: Realtime en leaderboards** — los scores se ven al recargar.
- **No: Skins en este spec** — se aplican automáticamente después vía `skin-designer`, siguiendo el flujo de `/spec-impl-game`.
