# SPEC 10 — Performance de Frogger (Ranaria) en dispositivos de gama media

> **Status:** implementado
> **Depends on:** SPEC 04 (contrato engine/wrapper), SPEC 09 (motor y controles táctiles de Ranaria)
> **Date:** 2026-08-07
> **Objective:** Reducir el costo de dibujo por frame de Ranaria (Frogger) — reportado como lento en un Huawei de gama media — agrupando los cambios de `shadowBlur`/`shadowColor` por carril en vez de por entidad individual, y pausando el fondo animado global durante el gameplay de los 4 juegos, sin alterar el resultado visual en ningún skin.

## Diagnóstico

Se investigó el reporte de lag con dos exploraciones en paralelo: una centrada en `frogger-engine.ts`, otra comparando contra los 3 engines ya optimizados (`asteroids-engine.ts`, `tetris-engine.ts`, `bloque-buster-engine.ts`) y el resto de la app.

**Descartado como causa** (verificado, no era el problema):

- Loop principal: los 4 engines usan `requestAnimationFrame` correctamente, sin `setInterval` en el path de gameplay.
- Cleanup de RAF/listeners: correcto en los 4 wrappers y engines (`destroy()` cancela `rafId`, remueve listeners).
- Recreación de arrays por frame: `frogger-engine.ts` muta entidades in-place, no reasigna arrays — de hecho, más limpio en este aspecto que `asteroids-engine.ts` (que sí hace `.filter()`/`.concat()` cada frame).
- Colisión O(n²): las comprobaciones de Frogger son por carril actual (~5-8 entidades), no sobre el total.

**Causa principal identificada:**

1. **`drawEntity()` (antes de este spec) hacía un toggle individual de `ctx.shadowBlur`/`ctx.shadowColor` por cada una de las ~80-90 entidades dibujadas por frame** (autos/camiones en 5 carriles de carretera, troncos/tortugas en 6 carriles de río, más las 5 metas) — ~176 asignaciones de estado del contexto por frame, el patrón más denso de sombra-por-entidad de los 4 engines del repo (frente a asteroides/tetris/bloque-buster, que tienen bastantes menos sprites simultáneos o un tablero mayormente estático). `ctx.shadowBlur` en Canvas2D suele caer a rasterizado por software en GPUs móviles de gama media (Kirin/Mali, típicas de Huawei), por lo que esta densidad era el candidato principal para el frame drop reportado.
2. **El fondo animado global (`.av-bg`, `@keyframes gridscroll` en `app/globals.css`) vive en `RootLayout`** y corría sin pausa durante toda la partida en los 4 juegos, compitiendo por el mismo frame budget que el canvas — overhead sistémico (no específico de Frogger) que se suma sobre un frame-time ya más alto por el punto 1.

**Fuera de esta spec, documentado para spec futura:** `asteroids-engine.ts`, `tetris-engine.ts` y `bloque-buster-engine.ts` comparten el mismo patrón de toggle-por-entidad de `shadowBlur` (visible sobre todo con el skin `neon`, que tiene `glow: true`), y `tetris-engine.ts` además redibuja un tablero mayormente estático (~200 celdas) cada frame sin ninguna capa cacheada. No se tocan en esta spec.

## Scope

**In:**

- Refactor de `drawEntity()` en `FroggerEngine` (`components/games/engine/frogger-engine.ts`): split en `drawEntityGlow()`/`drawEntityDetail()`, y el bucle de carriles en `draw()` fija `shadowBlur`/`shadowColor` una vez por carril homogéneo (car/truck, log, o turtle) en vez de una vez por entidad.
- Batching del bloque de 5 metas (`draw()`) en 3 sub-pasadas: fondo (sin sombra), contorno (un shadow para las 5), ranas ya salvadas (un shadow para las logradas).
- Nuevo componente `components/BackgroundFx.tsx` que detecta la ruta de gameplay (`/juegos/[id]/jugar`) vía `usePathname()` (mismo patrón que `Nav.tsx`) y aplica una clase `is-playing` al fondo global (`.av-bg`) para pausar/atenuar su animación mientras se juega, sin desmontar el nodo.
- Cambios en `app/layout.tsx` para montar `<BackgroundFx />` en vez de los divs `av-bg`/`av-noise` directos.
- Reglas CSS nuevas en `app/globals.css` para `.av-bg.is-playing::before` (`animation-play-state: paused`, `opacity: 0.15`, transición de 250ms).
- `npm run lint` y `npm run build`.

**Fuera de alcance:**

- Los engines de Asteroides, Tetris/Caída y Bloque Buster — comparten el mismo patrón de `shadowBlur` por entidad, quedan documentados arriba para una spec futura separada.
- Cualquier refactor a capas offscreen/canvas cacheado o dirty-rects — `draw()` de Frogger sigue repintando todo el canvas cada frame, solo cambia cómo se agrupan los cambios de `shadowBlur`/`shadowColor`.
- `backdrop-filter` de `.av-nav` — señalado en el diagnóstico como parte del mismo overhead sistémico, pero se decidió acotar esta spec a pausar el fondo global, sin tocar el nav.
- Reducir o quitar el efecto glow del skin `neon` — se mantiene visualmente idéntico, solo se optimiza su costo.
- Cualquier contador de FPS o instrumentación de medición — verificación por prueba manual en el dispositivo reportado.

## Data model

Sin datos ni persistencia nueva. Cambios de forma internos (no exportados, no rompen ningún contrato):

- `FroggerEngine`: `drawEntity(e, row)` reemplazado por dos métodos privados `drawEntityGlow(e, row)` / `drawEntityDetail(e, row)`, invocados desde `draw()` agrupados por carril. Ninguna interfaz pública del engine cambia (`start`/`destroy`/`pressVirtualKey`/`setSkin`/callbacks intactos).
- `components/BackgroundFx.tsx` (nuevo, `"use client"`): sin props, sin estado — deriva `isPlaying` de `usePathname()`.

## Implementation plan

1. **Batching de `shadowBlur`/`shadowColor` en `frogger-engine.ts`.** Dividir `drawEntity` en `drawEntityGlow`/`drawEntityDetail`; reescribir el bucle de carriles en `draw()` para fijar el shadow una vez por carril (car/truck → `palette.secondary`; log/turtle → `palette.accent`; en carriles de tortuga, solo las entidades no sumergidas pasan por la fase de brillo). Sin arrays nuevos: se itera dos veces sobre `lane.entities` (fase de brillo, fase de detalle), sin reasignar memoria. — **Hecho.**
2. **Batching del bloque de metas.** Las 5 metas pasan de ~10-15 toggles de sombra a 2 (uno para los 5 contornos, uno para las ranas logradas), en 3 sub-pasadas separadas (fondo/contorno/rana), manteniendo el orden fondo→contorno→rana del original. — **Hecho.**
3. **Verificación visual manual.** Confirmado que la lógica no cambia ningún píxel: cada carril es homogéneo por tipo (`buildRoadEntities`/`buildRiverEntities` nunca mezclan tipos dentro de un carril) y los huecos mínimos entre entidades (40-120px) superan ampliamente el blur usado (6-8px), por lo que agrupar el shadow por carril no puede solaparse entre formas distintas.
4. **Pausar/atenuar el fondo CRT global.** Creado `components/BackgroundFx.tsx` (`"use client"`, `usePathname()` + `pathname.startsWith("/juegos/") && pathname.endsWith("/jugar")`); reemplazados los divs `av-bg`/`av-noise` de `app/layout.tsx` por `<BackgroundFx />`; agregada la regla `.av-bg.is-playing::before { animation-play-state: paused; opacity: 0.15; }` con `transition: opacity 250ms ease` en `app/globals.css`. El nodo `.av-bg` nunca se desmonta — solo cambia su `className` según la ruta, evitando que `@keyframes gridscroll` reinicie con un salto visible. — **Hecho.**
5. **`npm run lint` y `npm run build`.** Ambos pasan sin errores ni warnings nuevos. — **Hecho.**
6. **Verificación manual en el Huawei reportado** (pendiente de confirmación del usuario en el dispositivo real): jugar Frogger con skin `neon`, carretera + río simultáneos (peor caso de densidad de entidades), confirmar mejora de fluidez a ojo; navegar landing/biblioteca/salón/detalle de juego para confirmar que el fondo sigue animado con normalidad fuera de `/jugar`, y que entrar/salir de una partida no produce un salto visual perceptible.

## Acceptance criteria

- [x] `frogger-engine.ts` fija `shadowBlur`/`shadowColor` una vez por carril (y en 3 pasadas para el bloque de metas) en vez de una vez por entidad individual.
- [x] `npm run lint` pasa sin errores.
- [x] `npm run build` compila sin errores de TypeScript.
- [ ] El resultado visual de Frogger es idéntico al anterior en los 3 skins (`clasico`, `retro`, `neon`), verificado manualmente en carretera, río y metas.
- [x] El fondo animado global (`.av-bg`) se pausa (`animation-play-state: paused`) y se atenúa mientras la ruta activa es `/juegos/[id]/jugar`, para los 4 juegos (mecanismo derivado de la ruta, no depende del juego montado).
- [ ] Fuera de `/jugar`, el fondo se anima con normalidad en landing, biblioteca, salón y detalle de juego (verificación manual pendiente).
- [ ] No hay salto visual perceptible al entrar/salir de una partida.
- [ ] Prueba manual en el Huawei reportado confirma mejora de fluidez jugando Frogger.

## Decisiones tomadas y descartadas

- **Sí:** acotar el alcance a Frogger únicamente. Asteroides/Tetris/Bloque Buster comparten el mismo patrón de toggle-por-entidad, pero tocar 4 engines en una sola spec era más riesgo/tamaño del necesario para resolver el reporte puntual — queda documentado arriba para una spec futura que reutilice este mismo patrón de batching.
- **Sí:** quick wins (batching de `shadowBlur` por grupo) en vez de un refactor a capas offscreen/canvas cacheado o dirty-rects. El refactor mayor ataca también el redibujado completo de fondo/metas estáticas, pero es un cambio arquitectónico de mayor riesgo; se prioriza la mitigación de más impacto por menor esfuerzo primero.
- **Sí:** mantener visualmente el glow del skin `neon`, solo optimizar su costo — no se sacrifica identidad visual por performance.
- **Sí:** pausar el fondo global por detección de ruta (`usePathname`, mismo patrón que `Nav.tsx`) en vez de un contexto/prop que el reproductor setee. Se autocorrige ante cualquier forma de salir de `/jugar` (botón salir, fin de partida, error, back button) sin depender de cleanup en cada shell de juego, y cubre los 4 juegos de una sola vez porque comparten la misma ruta.
- **No:** tocar `backdrop-filter` del `.av-nav` — señalado en el diagnóstico como parte del mismo overhead sistémico, pero se decidió acotar esta spec a pausar el fondo, dejando el nav para una spec futura si hiciera falta.
- **No:** agregar contador de FPS ni instrumentación de medición — se prioriza simplicidad; verificación por prueba manual en el dispositivo real.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Que agrupar el shadow por carril introduzca diferencias visuales sutiles si dos entidades llegaran a solaparse. | Los huecos mínimos entre entidades de un mismo carril (40-120px, definidos en `buildRoadEntities`/`buildRiverEntities`) y la separación entre carriles (40px/fila) son muy superiores al blur usado (6-8px) — no hay solapamiento posible entre formas de distinto shadow. Pendiente confirmación visual manual explícita por el usuario. |
| Que `BackgroundFx` remonte el nodo `.av-bg` en vez de solo cambiar su clase, reiniciando `@keyframes gridscroll` desde 0 con un salto visible. | El componente renderiza siempre el mismo nodo DOM, alternando únicamente el `className` según `isPlaying` — nunca un renderizado condicional que intercambie elementos. |
| Que atenuar el fondo durante el juego se sienta como pérdida de atmósfera retro. | Transición suave (250ms) y opacidad parcial (0.15) en vez de ocultar del todo; ajustable a `opacity: 0` sin cambiar el mecanismo si en la prueba real se ve insuficiente. |
| Que algún camino del batching quede sin resetear `shadowBlur` a 0 antes de la fase de detalle, filtrando sombra no deseada a elementos neutros (ruedas, vetas, ojos) incluso con `glow:false`. | El bucle de carriles fija `ctx.shadowBlur = 0` explícitamente una vez por carril, antes de la fase de detalle, para los 3 tipos de carril. |

## Lo que **no** está en este spec

- Optimización de `asteroids-engine.ts`, `tetris-engine.ts` o `bloque-buster-engine.ts` (mismo patrón de `shadowBlur` por entidad, y en el caso de Tetris, redibujo completo de un tablero mayormente estático).
- Refactor a capas offscreen/canvas cacheado o dirty-rects en cualquier engine.
- Cambios a `backdrop-filter` de `.av-nav`.
- Cualquier cambio al efecto visual del skin `neon` — se mantiene idéntico.
- Contador de FPS o instrumentación de medición de performance.

Cada uno de estos, si se implementa, va en su propio spec.
