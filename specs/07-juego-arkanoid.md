# SPEC 07 — Juego Bloque Buster (Arkanoid) jugable

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-08-03
> **Objective:** Portar el motor real de Arkanoid (`references/started-games/04-arkanoid/game.js`) a un componente React que reemplace el Reproductor simulado para `id === "bloque-buster"`, reutilizando esa entrada de catálogo ya existente.

## Scope

**In:**

- Actualizar la entrada `bloque-buster` ya existente en `GAMES` (`lib/games-data.ts`): `title`, `short`, `long`, `color` y `best`/`plays` se ajustan para reflejar fielmente el juego real portado (paddle, pelota, 5 niveles de bloques con patrones distintos). `id`, `cat: "ARCADE"` y `cover: "cover-bricks"` no cambian.
- Puerto del motor de `references/started-games/04-arkanoid/game.js` a una clase standalone `components/games/engine/bloque-buster-engine.ts`.
- Datos de nivel de `references/started-games/04-arkanoid/levels.js` migrados a `lib/bloque-buster-levels.ts` (5 niveles: `blocks[]` + multiplicador de velocidad).
- Copia de assets a `public/`: `spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3`.
- Componente wrapper `components/games/BloqueBusterGame.tsx` (`forwardRef`/`useImperativeHandle`), siguiendo el contrato de `pattern.md`.
- Rama condicional en `app/juegos/[id]/jugar/page.tsx` para `id === "bloque-buster"`, reemplazando el `game-arena` placeholder por el canvas real de 800×600 dentro de `.crt-screen`.
- HUD del sitio (`player-hud`: Puntuación/Vidas/Nivel) sincronizado en vivo vía `onScoreChange`/`onLivesChange`/`onLevelChange`; se elimina por completo el dibujo de HUD en canvas del original.
- PAUSA/REANUDAR controla únicamente `update()`, sin el overlay clickeable de salto de nivel del original; FIN fuerza game over inmediato.
- Control de paleta con teclado (`←`/`→`) **y** mouse (`mousemove` sobre el canvas), como en el original.
- Efectos de sonido portados (rebote de pared/paleta, rotura de bloque) vía `Audio` del navegador.
- Guardado real de puntuación reutilizando `saveScore`/`getTopScores` (spec 05) sin cambios — la fila `bloque-buster` ya existe en la tabla `games` de Supabase desde el seed de spec 05, así que no hace falta ninguna migración nueva para que la FK de `scores.game_id` funcione.

**Out of scope (for future specs):**

- Controles táctiles/móviles.
- Lectura de puntuaciones fuera del Detalle y el Salón de la Fama.
- El overlay clickeable de salto de nivel (`1`-`5`) del original — se descarta, no se preserva ni siquiera como función de debug.
- Actualizar las columnas descriptivas de la fila `bloque-buster` en la tabla `games` de Supabase — ninguna pantalla lee esas columnas (spec 05), solo se usa como referencia FK; el catálogo visible sigue viniendo del array estático `GAMES`.
- Cualquier cambio a otro juego existente del catálogo.
- Un mecanismo genérico de "juego real conectable" más allá de este juego puntual.

## Data model

### Entrada actualizada en `GAMES` (`lib/games-data.ts`)

El texto ya existente describe con precisión el gameplay portado (paleta que rebota una pelota, muros de bloques, 5 niveles con distinta disposición de grilla). No se modifica:

```ts
{
  id: "bloque-buster",
  title: "BLOQUE BUSTER",
  short: "Rebota la pelota y destruye muros de neón.",
  long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?",
  cat: "ARCADE",
  cover: "cover-bricks",
  color: "cyan",
  best: 28450,
  plays: "12.4K",
}
```

### Datos de nivel (`lib/bloque-buster-levels.ts`)

```ts
export interface BloqueBusterLevel {
  speed: number;
  blocks: { col: number; row: number; color: string }[];
}

export const BLOQUE_BUSTER_LEVELS: BloqueBusterLevel[]; // 5 niveles, portados 1:1 desde levels.js
```

### Interfaz del componente del motor (`components/games/BloqueBusterGame.tsx`)

```ts
interface BloqueBusterGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface BloqueBusterGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}
```

### Assets (`public/`)

- `public/games/bloque-buster/spritesheet-breakout.png`
- `public/games/bloque-buster/sounds/ball-bounce.mp3`
- `public/games/bloque-buster/sounds/break-sound.mp3`

### Persistencia reutilizada

Sin esquema nuevo. `saveScore("bloque-buster", name, score)` y `getTopScores("bloque-buster", 10)` (spec 05), sin modificaciones — la fila `bloque-buster` ya existe en la tabla `games` de Supabase.

## Implementation plan

1. **Assets y datos de nivel.** Copiar `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3` a `public/games/bloque-buster/`. Crear `lib/bloque-buster-levels.ts` portando los 5 niveles de `levels.js` (`blocks[]` + `speed`). Test manual: `npm run build` pasa; nada se importa todavía desde ninguna pantalla.

2. **Módulo de sprites (`components/games/engine/bloque-buster-sprites.ts`).** Portar `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y las funciones `loadSpritesheet`/`drawSprite`/`drawFrame` de `assets/spritesheet.js`, adaptando `loadSpritesheet` a una función que retorna una `Promise<void>` (en vez de callback) y apuntando la carga de imagen a `/games/bloque-buster/spritesheet-breakout.png`. Sin integración con el motor todavía.

3. **Motor del juego (`components/games/engine/bloque-buster-engine.ts`).** Clase `BloqueBusterEngine` portando 1:1 el estado y la lógica de `game.js`: `paddle`, `ball`, `blocks[]`, `explosions[]`, `collideAABB`, física de rebote (paredes, paleta, bloques), progresión de niveles vía `loadLevel(n)`, y los dos `Audio` (`bounceSound`/`breakSound`) reproducidos con el mismo patrón `.cloneNode().play()` del original. Constructor recibe `(canvas, callbacks)`. Sin integración con React todavía.

4. **Loop, input y callbacks.** Implementar `start()`/`pause()`/`resume()`/`reset()`/`forceGameOver()`/`destroy()` siguiendo el contrato de `pattern.md`: `start()` espera `loadSpritesheet()` antes de agregar listeners (`keydown`/`keyup` en flechas, `mousemove` sobre el canvas para la paleta) y arrancar el `requestAnimationFrame`; `pause()`/`resume()` detienen/reanudan solo `update()` (`draw()` sigue corriendo, sin overlay de pausa ni selección de nivel clickeable); `destroy()` remueve listeners, detiene audio en curso y cancela el frame pendiente, de forma idempotente. Se elimina el HUD dibujado en canvas (`Score`/`Nivel`/vidas): en su lugar, romper un bloque dispara `onScoreChange`, perder una vida dispara `onLivesChange`, `loadLevel` dispara `onLevelChange`, y perder la última vida (o `forceGameOver()`) dispara `onGameOver(score)`.

5. **Componente React `BloqueBusterGame`.** Crear `components/games/BloqueBusterGame.tsx`: client component con `forwardRef<BloqueBusterGameHandle, BloqueBusterGameProps>`, `<canvas width={800} height={600}>` con `style={{ width: "100%", height: "100%" }}`, instancia `BloqueBusterEngine` en un `useEffect` (`start()` al montar, `destroy()` al desmontar), expone `pause`/`resume`/`reset`/`forceGameOver` vía `useImperativeHandle`.

6. **Integración en el Reproductor.** En `app/juegos/[id]/jugar/page.tsx`, agregar la rama `id === "bloque-buster"`: renderizar `<BloqueBusterGame ref={...} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={...} />` dentro de `.crt-screen` en vez del `game-arena` simulado; desactivar el `useEffect` de score simulado para este `id`; conectar PAUSA/REANUDAR/FIN/"JUGAR DE NUEVO" igual que en la integración de Asteroides (spec 04). "GUARDAR PUNTUACIÓN" ya usa `saveScore("bloque-buster", ...)` sin cambios.

7. **QA manual y build.** Jugar una partida completa (romper bloques, perder las 3 vidas, subir de nivel hasta el 5, ganar el juego), verificar que la paleta responde tanto a teclado como a mouse, que suenan los efectos de rebote/rotura, que el HUD del sitio refleja el estado real y que ninguna tecla de juego hace scroll de página. Confirmar guardado de puntuación real (Detalle y Salón) y cero errores en consola. Correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] La tarjeta "BLOQUE BUSTER" sigue apareciendo en Biblioteca bajo el chip "ARCADE" con su portada `cover-bricks`, sin cambios visibles en el catálogo salvo el juego real detrás.
- [ ] `/juegos/bloque-buster` muestra portada, descripción, stat-strip y tabla "MEJORES PUNTUACIONES" con datos reales vía `getTopScores` (igual que el resto del catálogo tras spec 05).
- [ ] `/juegos/bloque-buster/jugar` renderiza el canvas real del juego dentro de `.crt-screen`; los demás juegos sin motor real siguen con el Reproductor simulado.
- [ ] La barra HUD del sitio (Puntuación/Vidas/Nivel) refleja en vivo el estado real (+10 puntos por bloque, vidas bajan al perder la pelota, nivel sube al limpiar el campo); el canvas no dibuja texto propio de score/nivel/vidas.
- [ ] La paleta se mueve tanto con `←`/`→` como moviendo el mouse sobre el canvas.
- [ ] La pelota rebota en paredes, techo y paleta reproduciendo el sonido de rebote; romper un bloque suma puntos, dispara la animación de explosión y reproduce el sonido de rotura.
- [ ] Al limpiar todos los bloques de un nivel se carga el siguiente, hasta el nivel 5; completar el nivel 5 dispara el mismo modal de fin de partida que perder las 3 vidas (el juego no tiene un estado "victoria" distinto en la UI del sitio — ver Decisiones).
- [ ] Al terminar la partida (game over o nivel 5 completado) se abre el modal de fin de partida con la puntuación final; "GUARDAR PUNTUACIÓN" inserta una fila real en `scores` (`game_id: "bloque-buster"`) y muestra el toast de éxito.
- [ ] El botón PAUSA congela paleta/pelota/bloques (el render sigue visible) y muestra el overlay "EN PAUSA" del sitio, sin overlay de selección de nivel; REANUDAR continúa exactamente donde quedó.
- [ ] El botón FIN abre el modal de fin de partida inmediatamente con el score actual.
- [ ] "JUGAR DE NUEVO" reinicia score, vidas, nivel y campo de bloques sin recargar la página.
- [ ] "SALIR" navega a `/juegos/bloque-buster` y detiene el loop y los listeners (teclado + mouse) del motor.
- [ ] "VOLVER AL VAULT" navega a `/biblioteca`.
- [ ] Ninguna tecla de juego (`←`/`→`) provoca scroll de página mientras el juego está montado.

## Decisiones tomadas y descartadas

- **Sí:** reusar el `id: "bloque-buster"` existente para el juego real, en vez de crear una entrada nueva. A diferencia del precedente Asteroides/`rocas` (que el usuario mantuvo como entradas distintas), acá decidió que el placeholder se convierte directamente en el juego real portado, sin duplicar la tarjeta en Biblioteca.
- **Sí:** mantener `title`/`short`/`long`/`color`/`cover` del placeholder sin modificar — el texto ya redactado describe con precisión el juego real (paleta, pelota, muros de bloques, niveles con distinta disposición de grilla).
- **Sí:** portar el audio (`ball-bounce.mp3`, `break-sound.mp3`) con la API `Audio` nativa. A diferencia de Asteroides (spec 04 dejó el sonido explícitamente fuera de alcance), acá el usuario pidió portarlo porque el original de Arkanoid lo trae como parte central de su diseño.
- **No:** mantener el overlay clickeable de selección de nivel (`1`-`5`) dentro de la pausa. Es una función de debug/cheat ajena a la experiencia final y rompe la convención de pausa ya asentada en el catálogo (pausa = solo congela `update()`, sin overlay interactivo propio).
- **Sí:** eliminar el `drawHUD` original (Score/Nivel/vidas dibujado en canvas) a favor de los callbacks hacia `player-hud` del sitio. Mismo patrón que Asteroides.
- **Sí:** mantener el control mixto teclado (`←`/`→`) + mouse (`mousemove`) para la paleta, a diferencia de Asteroides (solo teclado). El mouse es intrínseco al gameplay original de Arkanoid y no choca con ninguna convención ya asentada del catálogo.
- **Sí:** completar el nivel 5 ("victoria" en el original) dispara el mismo `onGameOver` que perder las 3 vidas, en vez de introducir un estado de UI nuevo tipo "¡Ganaste!". Ningún otro juego portado tiene ese concepto en el sitio; agregarlo ampliaría el alcance de este spec.
- **Sí:** el motor se refactoriza como clase (`BloqueBusterEngine`) en vez de mantener el estilo de variables globales module-scope de `game.js`. Mismo motivo que Asteroides: los globals no son seguros bajo React Strict Mode (doble montaje) ni permiten instanciar/destruir de forma controlada.
- **Sí:** `loadSpritesheet` se adapta de callback a `Promise`, para poder usar `async/await` limpio en el `start()` del motor en vez de anidar callbacks.
- **No:** mecanismo genérico de "juego real conectable" para futuros juegos. Mismo motivo que spec 04: sobre-ingeniería para el caso actual.
- **Sí:** dependencia declarada de SPEC 04 (contrato de engine/wrapper) y SPEC 05 (leaderboard genérico). No se toca el esquema de Supabase.
- **No:** actualizar las columnas descriptivas de la fila `bloque-buster` en la tabla `games` de Supabase. Ninguna pantalla lee esas columnas (spec 05) — solo actúan como referencia FK para `scores.game_id`, y la fila ya existe desde el seed de spec 05.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La carga del spritesheet es asíncrona (`loadSpritesheet` como `Promise`); si el componente se desmonta mientras la imagen todavía está cargando, el `start()` podría intentar arrancar el loop sobre un engine ya destruido. | Chequear el flag interno `destroyed` inmediatamente después de que la promesa resuelve; si ya es `true`, no se agregan listeners ni se arranca el `requestAnimationFrame`. |
| React monta los efectos dos veces en desarrollo (Strict Mode), pudiendo instanciar `BloqueBusterEngine` dos veces y duplicar listeners de teclado/mouse o loops de `requestAnimationFrame`. | El `useEffect` de `BloqueBusterGame` siempre limpia con `destroy()` antes de un nuevo `start()`; `destroy()` es idempotente y cancela el frame pendiente. |
| El canvas tiene resolución interna fija (800×600) pero se renderiza fluido dentro de `.crt-screen` (`style={{ width: "100%", height: "100%" }}`); el control de paleta por mouse depende de convertir coordenadas de pantalla a coordenadas del canvas. | Portar tal cual el cálculo de escala del original (`scaleX = canvas.width / rect.getBoundingClientRect().width`) al calcular `mouseX` en el listener de `mousemove`. |
| Un callback (`onScoreChange`, `onGameOver`, etc.) podría dispararse desde un frame en vuelo justo cuando el componente ya se desmontó. | Mismo mecanismo que Asteroides: `destroy()` cancela el frame pendiente y el flag `destroyed` corta cualquier callback posterior. |

## Lo que **no** está en este spec

- Controles táctiles/móviles.
- Lectura de puntuaciones fuera del Detalle y el Salón de la Fama.
- El overlay clickeable de salto de nivel (`1`-`5`) del original.
- Actualizar las columnas descriptivas de la fila `bloque-buster` en la tabla `games` de Supabase.
- Cualquier cambio a otro juego existente del catálogo.
- Un mecanismo genérico de "juego real conectable" más allá de este juego puntual.

Cada uno de estos, si se implementa, va en su propio spec.
