# SPEC game-jam 01 — Barriles: prototipo jugable

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-08-04
> **Objective:** Construir la mecánica core de "Barriles" (trepar una torre de plataformas esquivando barriles rodantes) jugable de punta a punta en local, como clase `BarrilesEngine` + wrapper React, integrada al Reproductor bajo un `id` nuevo del catálogo.

## Por qué este spec existe

Tema de game jam recibido: **"Donkey Kong"** (física de plataformas + barriles rodantes + múltiples animaciones), entrada #18 (`barriles`) del Tier 2 de `references/games-references.md`, propuesta por `game-planner` como concepto nuevo fuera del catálogo (ARCADE, complejidad Alta) sin ningún `game.js` de referencia en `references/started-games/`. Este spec traduce ese tema a un concepto propio, jugable, sin replicar Donkey Kong al pie de la letra: un obrero que escala una torre de plataformas horizontales conectadas por escaleras, esquivando barriles que descienden en zigzag piso por piso.

Para mantener el motor dentro del contrato ya validado (1 canvas, sin assets externos, sin física compleja), la mecánica de barriles se simplifica a un movimiento discreto por "piso" en vez de física continua sobre plataformas inclinadas — ver Decisiones.

## Scope

**In:**

- Nueva entrada en `GAMES` (`lib/games-data.ts`): `id: "barriles"`, `title: "BARRILES"`, `cat: "ARCADE"`, `cover: "cover-barriles"`, con `short`/`long`/`color`/`best`/`plays` en el mismo tono retro-arcade que el resto del catálogo — descrita en Data model, no escrita en código en este spec (la escribe `/spec-impl`).
- Clase CSS `.cover-barriles` **temporal**, mínima (fondo sólido/gradiente simple, sin el tratamiento de 3 capas final), suficiente para distinguir la tarjeta en Biblioteca. El tratamiento final de 3 capas queda para el spec de integración.
- Motor `BarrilesEngine` (`components/games/engine/barriles-engine.ts`), clase standalone con el contrato completo de `pattern.md` (`start/pause/resume/reset/forceGameOver/destroy`, `destroyed` flag, `pause()`/`resume()` detienen solo `update()`).
- Entidades: `Player` (obrero), `Platform` (pisos horizontales, "lanes"), `Ladder` (tramos que conectan un piso con el inmediato superior/inferior en una posición `x` fija), `Barrel` (rueda por un piso y cae en zigzag al piso inferior).
- Mecánica: mover al jugador en horizontal por su piso actual; subir/bajar por una escalera cuando el jugador está alineado con su `x`; saltar en el lugar para pasar por encima de un barril que viene por el mismo piso (ventana breve de invulnerabilidad); al llegar al piso superior (meta) se completa el nivel.
- Barriles: spawean periódicamente en el piso superior, avanzan en una dirección horizontal fija hasta el borde del piso o una escalera con caída, bajan un piso, invierten dirección, y repiten hasta el piso inferior (donde se eliminan) o hasta colisionar con el jugador.
- Progresión: completar la torre (llegar al piso superior) dispara `onLevelChange(nivel + 1)`, regenera una torre nueva con más pisos y/o mayor frecuencia/velocidad de barriles, reubica al jugador en el piso inferior, conserva puntaje y vidas.
- Vidas: 3 al iniciar; colisión jugador-barril (sin saltar) resta una vida y reubica al jugador en el piso inferior con una ventana breve de invencibilidad; al llegar a 0 dispara `onGameOver(score)`.
- Puntaje: puntos por saltar sobre un barril, puntos por completar la torre; sin power-ups todavía (quedan para el spec de pulido).
- Wrapper React `BarrilesGame` (`components/games/BarrilesGame.tsx`), `forwardRef`/`useImperativeHandle`, canvas único de 800×600 (mismo tamaño que Asteroides/Arkanoid) para no alterar el `aspect-ratio` 4/3 compartido de `.crt-screen`; la torre se dibuja compacta dentro de ese marco (pisos apilados con altura fija, cantidad de pisos calculada para caber en 600px de alto).
- HUD del sitio como única fuente visible de estado, vía callbacks: `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`. Sin contador propio adicional (no hay equivalente a "Líneas" de Tetris en esta mecánica).
- Rama condicional `id === "barriles"` en `app/juegos/[id]/jugar/page.tsx`, reemplazando el `<div className="game-arena">` placeholder por `<BarrilesGame />` dentro de `.crt-screen`; se agrega esta condición a las dependencias del `useEffect` de score simulado para desactivarlo, mismo patrón que `isTetris`/Asteroides.
- Controles de teclado: `←`/`→` mover, `↑`/`↓` subir/bajar escalera (solo si el jugador está alineado con una), `Espacio` saltar; `preventDefault` en esas teclas mientras el juego está montado.
- PAUSA/REANUDAR (detiene/reanuda solo `update()`), FIN (`forceGameOver()`), "JUGAR DE NUEVO" (`reset()` — reinicia torre, score, vidas, nivel), "SALIR" (navega a `/juegos/barriles`, destruye el engine), todos con el mismo contrato ya usado en Asteroides/Tetris/Arkanoid.

**Out of scope (for future specs):**

- La fila del juego en la tabla `games` de Supabase — **por lo tanto "GUARDAR PUNTUACIÓN" no puede insertar de verdad todavía**. Decisión explícita: el botón queda **deshabilitado** en este estado intermedio (ver Decisiones), no se intenta un guardado que falle a propósito.
- Tratamiento final de 3 capas de `.cover-barriles` (radial-gradients, `::before`/`::after` con carácter Unicode) — se usa una versión mínima temporal en este spec.
- Power-up de martillo, datos de niveles/torres variados en un archivo separado (`lib/barriles-levels.ts`), sonido — quedan para el spec de pulido.
- Controles táctiles/móviles.
- Cualquier cambio a otro juego existente del catálogo.
- Un mecanismo genérico de "juego real conectable" más allá de esta rama condicional puntual.

## Data model

### Nueva entrada en `GAMES` (`lib/games-data.ts`)

```ts
{
  id: "barriles",
  title: "BARRILES",
  short: "Trepa la torre esquivando barriles rodantes.",
  long: "Un obrero decidido escala una torre de construcción improvisada mientras barriles de acero descienden piso por piso. Salta en el momento justo, sube por las escaleras y llega a la cima antes de quedarte sin vidas.",
  cat: "ARCADE",
  cover: "cover-barriles",
  color: "yellow",
  best: 19800,
  plays: "3.6K",
}
```

No se modifica el tipo `Game` ni ningún otro campo de `lib/games-data.ts`.

### Entidades del motor (`barriles-engine.ts`)

```ts
interface Platform {
  lane: number;      // índice de piso, 0 = inferior
  y: number;          // coordenada de dibujo
}

interface Ladder {
  x: number;
  laneFrom: number;
  laneTo: number;     // laneFrom + 1
}

interface Barrel {
  x: number;
  lane: number;
  dir: 1 | -1;         // sentido horizontal actual
  speed: number;
}

interface Player {
  x: number;
  lane: number;
  state: "idle" | "walking" | "climbing" | "jumping" | "hit";
  invulnerableUntil: number; // timestamp del motor
}
```

Una torre se genera proceduralmente por nivel: `N` pisos (`N` crece con el nivel), cada piso con 1 escalera en una posición `x` aleatoria distinta a la del piso adyacente (para forzar zigzag al subir), y una meta en el piso superior.

### Interfaz del componente del motor (`components/games/BarrilesGame.tsx`)

```ts
interface BarrilesGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface BarrilesGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}
```

`BarrilesGame` es un `forwardRef` que expone `BarrilesGameHandle` vía `useImperativeHandle`.

### Persistencia

No se crea ningún esquema nuevo. `saveScore`/`getTopScores` (spec 05) ya son genéricos, pero no se invocan para `"barriles"` en este spec porque la fila `games` correspondiente todavía no existe — el botón "GUARDAR PUNTUACIÓN" se deshabilita para este `id` (ver Decisiones).

## Implementation plan

1. **Catálogo y portada temporal.** Agregar la entrada `barriles` a `GAMES` en `lib/games-data.ts` y una clase `.cover-barriles` mínima (gradiente simple) en `app/globals.css`. Test manual: la tarjeta "BARRILES" aparece en Biblioteca bajo el chip "ARCADE".

2. **Motor del juego como clase standalone.** Crear `components/games/engine/barriles-engine.ts` con la clase `BarrilesEngine`: generación procedural de la torre (pisos + escaleras), entidades `Player`/`Barrel`, spawn periódico de barriles en el piso superior, movimiento en zigzag piso a piso, colisión AABB jugador-barril, mecánica de salto con ventana de invulnerabilidad. Constructor `(canvas, callbacks)`. Sin integración con React todavía.

3. **Loop, input y callbacks.** Implementar `start()`/`pause()`/`resume()`/`reset()`/`forceGameOver()`/`destroy()`. `start()` agrega listeners de teclado (`←`/`→`/`↑`/`↓`/`Espacio`) con `preventDefault`, arranca el `requestAnimationFrame`. `pause()`/`resume()` detienen/reanudan solo `update()`; `draw()` sigue corriendo siempre. Cada cambio de score/vidas/nivel dispara su callback; perder la última vida o `forceGameOver()` dispara `onGameOver(score)`.

4. **Componente React `BarrilesGame`.** Crear `components/games/BarrilesGame.tsx`: `forwardRef<BarrilesGameHandle, BarrilesGameProps>`, `<canvas width={800} height={600}>` con `style={{ width: "100%", height: "100%" }}`, instancia `BarrilesEngine` en un `useEffect` (`start()` al montar, `destroy()` al desmontar), expone `pause`/`resume`/`reset`/`forceGameOver` vía `useImperativeHandle`.

5. **Integración en el Reproductor.** En `app/juegos/[id]/jugar/page.tsx`: agregar `id === "barriles"` a las dependencias del `useEffect` de score simulado (para desactivarlo); renderizar `<BarrilesGame ref={...} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={...} />` dentro de `.crt-screen`; conectar PAUSA/REANUDAR/FIN/"JUGAR DE NUEVO" al `ref`, mismo patrón que Asteroides/Tetris/Arkanoid; deshabilitar el botón "GUARDAR PUNTUACIÓN" del modal de fin de partida específicamente cuando `id === "barriles"`, mostrando un texto/tooltip tipo "Disponible próximamente" en vez del botón activo.

6. **QA manual y build.** Jugar una partida completa (subir varios pisos, saltar sobre barriles, perder una vida al chocar, completar una torre y ver el nivel subir, perder las 3 vidas), confirmar que PAUSA congela visualmente sin detener el render, que ninguna tecla de juego hace scroll de página, cero errores en consola, y correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] La tarjeta "BARRILES" aparece en Biblioteca, filtra correctamente bajo el chip "ARCADE", y su portada temporal `.cover-barriles` se distingue visualmente de las demás tarjetas.
- [ ] `/juegos/barriles/jugar` renderiza el canvas del juego real dentro de `.crt-screen`; los demás juegos (con motor real o placeholder) siguen sin cambios.
- [ ] La barra HUD del sitio (Puntuación/Vidas/Nivel) refleja en vivo el estado real: puntuación sube al saltar sobre un barril o completar la torre, vidas bajan al chocar con un barril, nivel sube al llegar al piso superior.
- [ ] Los controles `←`/`→` mueven al jugador por su piso; `↑`/`↓` lo suben/bajan por una escalera solo cuando está alineado con su `x`; `Espacio` lo hace saltar en el lugar; ninguna de esas teclas hace scroll de la página mientras el juego está montado.
- [ ] Un barril que avanza por un piso, al llegar al borde o a una escalera con caída, desciende al piso inmediato inferior e invierte su dirección horizontal.
- [ ] Saltar sobre un barril mientras está en el mismo piso y rango horizontal que el jugador no resta vidas y suma puntos.
- [ ] Chocar con un barril sin saltar resta una vida, reubica al jugador en el piso inferior y le da una ventana breve de invencibilidad visible (parpadeo).
- [ ] Llegar al piso superior (meta) sube el nivel, regenera una torre nueva (más pisos y/o barriles más frecuentes o veloces) y reubica al jugador en el piso inferior, conservando puntaje y vidas.
- [ ] Al perder las 3 vidas se abre el modal de fin de partida con la puntuación final; el botón "GUARDAR PUNTUACIÓN" aparece deshabilitado con un indicador de "disponible próximamente" (no inserta nada, no muestra error).
- [ ] El botón PAUSA congela jugador/barriles (el render sigue visible) y muestra el overlay "EN PAUSA"; REANUDAR continúa exactamente donde quedó.
- [ ] El botón FIN abre el modal de fin de partida inmediatamente con el score actual.
- [ ] "JUGAR DE NUEVO" reinicia torre, score, vidas y nivel sin recargar la página.
- [ ] "SALIR" navega a `/juegos/barriles` y detiene el loop del juego (no sigue corriendo en segundo plano ni genera errores al volver a entrar).
- [ ] "VOLVER AL VAULT" desde el modal de game over navega a `/biblioteca`.

## Decisiones

- **Sí:** `id` nuevo (`"barriles"`), no reuso de ningún placeholder existente (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`). Ninguno encaja temáticamente con una torre de plataformas y barriles rodantes (son Snake, Pac-Man, Space Invaders, Frogger y Pong respectivamente). Sigue el precedente de Asteroides (spec 04): cuando no hay overlap conceptual real con un placeholder, se crea una entrada de catálogo distinta en vez de forzar el reuso.

- **Sí:** título/descripción/`id` retoman directamente la sugerencia `barriles` de `game-planner` (`references/games-references.md`, entrada #18) en vez de inventar un nombre distinto — mantiene consistencia entre lo que `game-planner` catalogó como pendiente y lo que efectivamente se especifica acá.

- **Sí:** movimiento de barriles simplificado a zigzag discreto piso-a-piso (en vez de física continua sobre plataformas con pendiente, como en el Donkey Kong original). Mantiene el motor dentro de la misma clase de complejidad que Asteroides/Tetris/Arkanoid (colisiones AABB, sin integración de física continua ni ángulos), evitando la complejidad "Alta" que `game-planner` atribuyó al concepto completo. Se documenta como simplificación deliberada, no como bug.

- **Sí:** canvas único de 800×600 (igual que Asteroides/Arkanoid) con la torre dibujada compacta dentro de ese marco, en vez de un canvas más alto/angosto tipo retrato. Evita modificar el `aspect-ratio` 4/3 compartido de `.crt-screen` (mismo criterio de Tetris en spec 06, que resolvió su tablero 1:2 con letterboxing en vez de tocar el marco compartido).

- **Sí:** botón "GUARDAR PUNTUACIÓN" deshabilitado (no un guardado que falle a propósito) mientras la fila `games` para `"barriles"` no existe en Supabase. Evita mostrar un toast de error confuso por una violación de FK que el usuario no puede resolver desde la UI; queda explícito que el guardado real llega en el spec de integración.

- **Sí:** callbacks `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` — el concepto tiene vidas (colisión con barril) y progresión de nivel (torres sucesivas), pero ningún contador propio adicional tipo "Líneas" de Tetris; no se agrega un quinto slot al HUD.

- **No:** power-up de martillo, sonido, o datos de niveles en archivo separado en este spec. Quedan para el spec de pulido si el concepto lo justifica (sí lo justifica — ver spec de pulido), evitando sobrecargar el prototipo.

- **No:** sprites/spritesheet de imagen para el jugador o los barriles. Al no existir ningún `game.js`/assets de referencia para este concepto (es 100% original, no un port), se dibuja con formas vectoriales simples (igual que Asteroides/Tetris), evitando la necesidad de generar o conseguir arte nuevo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Compactar una torre de varios pisos dentro de un canvas de 600px de alto podría dejar pisos muy juntos o ilegibles a medida que sube el nivel (más pisos por torre). | La cantidad de pisos por torre se acota con un máximo fijo (p. ej. 6-8); al superarlo, sube la velocidad/frecuencia de barriles en vez de agregar más pisos, manteniendo el alto de piso legible siempre. |
| La detección de "jugador alineado con la escalera" podría ser demasiado estricta (requiere un `x` exacto) y sentirse injusta al jugar. | Se usa una tolerancia epsilon alrededor del `x` de la escalera (ventana de unos pocos píxeles), mismo criterio que la detección de colisión paleta-pelota en Arkanoid. |
| React monta los efectos dos veces en desarrollo (Strict Mode), pudiendo instanciar `BarrilesEngine` dos veces y duplicar listeners o loops de `requestAnimationFrame`. | El `useEffect` de `BarrilesGame` siempre limpia con `destroy()` antes de un nuevo `start()`; `destroy()` es idempotente, mismo patrón que `AsteroidsEngine`/`TetrisEngine`/`BloqueBusterEngine`. |
| Un callback podría dispararse desde un frame en vuelo justo cuando el componente ya se desmontó. | `destroy()` cancela el `requestAnimationFrame` pendiente y marca el flag `destroyed` que corta cualquier callback posterior, mismo patrón que los otros 3 engines. |

## Lo que **no** está en este spec

- La fila `games` en Supabase para `"barriles"` — "GUARDAR PUNTUACIÓN" queda deshabilitado hasta el spec de integración.
- Tratamiento final de 3 capas de `.cover-barriles`.
- Power-up de martillo, datos de niveles en `lib/barriles-levels.ts`, sonido.
- Controles táctiles/móviles.
- Cualquier cambio a otro juego existente del catálogo.
- Un mecanismo genérico de "juego real conectable" para futuros juegos.

Cada uno de estos, si se implementa, va en su propio spec.
