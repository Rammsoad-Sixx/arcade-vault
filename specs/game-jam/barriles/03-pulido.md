# SPEC game-jam 03 — Barriles: torres variadas, martillo y sonido

> **Status:** Draft
> **Depends on:** specs/game-jam/barriles/02-integracion.md
> **Date:** 2026-08-04
> **Objective:** Agregar la tercera capa de contenido de "Barriles": datos de torres variadas en `lib/barriles-levels.ts`, un power-up de martillo que destruye barriles, y efectos de sonido sintetizados sin assets externos.

## Por qué este spec existe

El prototipo (spec game-jam 01) genera torres proceduralmente con parámetros crecientes (más pisos, más velocidad) pero sin curva de diseño explícita ni variedad de layout entre partidas. El concepto tiene una tercera capa natural y no forzada: capturar el resto de la identidad "Donkey Kong" que quedó fuera del prototipo por simplicidad — variedad de torres con diseño propio (como los 5 niveles de `lib/bloque-buster-levels.ts`), un power-up temporal que invierte el riesgo del barril (destruirlo en vez de esquivarlo, como el martillo original), y sonido. Ninguno de los tres es imprescindible para que el juego sea jugable de punta a punta (ya lo es tras spec 02), por eso se separan en este spec opcional.

## Scope

**In:**

- `lib/barriles-levels.ts`: array de layouts de torre predefinidos (cantidad de pisos, posición de escaleras por piso, frecuencia/velocidad base de barriles), siguiendo el mismo patrón de `lib/bloque-buster-levels.ts` (datos de nivel en archivo separado, importados por el engine). Mínimo 5 layouts distintos; al superar la cantidad de layouts definidos, el motor vuelve a generarlos proceduralmente (comportamiento del prototipo) con dificultad creciente.
- Power-up de martillo: aparece periódicamente en una posición fija del piso actual del jugador; al recogerlo, el jugador entra en estado "empoderado" por una duración fija (temporizador que se pausa/reanuda junto con `update()`, igual que el resto del estado del juego); mientras dura, el contacto con un barril lo destruye (en vez de restar una vida) y otorga puntos extra.
- Efectos de sonido: rodar de barril, salto, recoger martillo, romper barril con martillo, perder vida — generados con la Web Audio API nativa (`AudioContext` + osciladores/envolventes simples), **sin archivos de audio externos**, porque no existe ningún asset de referencia para este concepto original (a diferencia de Arkanoid, que sí traía `.mp3` propios en `references/started-games/04-arkanoid/`).
- Extensión del contrato del motor: `BarrilesEngine` pasa a recibir (opcionalmente) el array de `lib/barriles-levels.ts` e inicializa/limpia el `AudioContext` en `start()`/`destroy()` (con el mismo cuidado de idempotencia que el resto del ciclo de vida).

**Out of scope (for future specs):**

- Multijugador o modo cooperativo.
- Otros tipos de obstáculo además del barril (p. ej. barriles de fuego, enemigos que patrullan un piso).
- Plataformas móviles o mecánicas adicionales de plataforma (resortes, cintas transportadoras).
- Controles táctiles/móviles.
- Sprites/spritesheet de imagen — se mantiene el dibujo vectorial de los specs anteriores; el martillo y el estado "empoderado" del jugador se representan con formas/colores distintos, no con arte nuevo.

## Data model

### `lib/barriles-levels.ts`

```ts
export interface BarrilesLevel {
  lanes: number;                 // cantidad de pisos de esta torre
  ladders: { lane: number; x: number }[]; // 1 escalera por piso, x fijo
  barrelSpeed: number;           // velocidad base de los barriles
  barrelIntervalMs: number;      // frecuencia de spawn
}

export const BARRILES_LEVELS: BarrilesLevel[]; // mínimo 5 layouts
```

### Power-up de martillo (estado del motor, sin nueva tabla ni callback)

```ts
interface HammerPowerUp {
  x: number;
  lane: number;
  active: boolean;      // si todavía no fue recogido
}

// En Player:
interface Player {
  // ...campos ya definidos en spec 01
  empoweredUntil: number; // timestamp del motor; 0 = sin poder activo
}
```

No se agrega ningún callback nuevo — el estado "empoderado" es visual (color/aura distinta del jugador dibujada en el canvas) y no necesita reflejarse en el HUD del sitio, igual que el criterio ya aplicado a power-ups en Asteroides (spec 04, triple disparo tampoco tiene callback propio).

### Audio (sin archivos nuevos)

```ts
// Dentro de BarrilesEngine
private audioCtx: AudioContext | null = null;
private playBeep(freq: number, durationMs: number, type: OscillatorType): void;
```

`playBeep` sintetiza cada efecto con un oscilador de frecuencia/duración/forma de onda distintas por evento (p. ej. rodar = tono grave continuo corto, salto = tono ascendente breve, romper barril = ruido corto). `audioCtx` se crea en `start()` (o en el primer gesto de usuario si el navegador lo requiere) y se cierra en `destroy()`.

## Implementation plan

1. **Datos de torres (`lib/barriles-levels.ts`).** Crear el archivo con 5 layouts de torre manualmente diseñados (variedad de cantidad de pisos, posición de escaleras, velocidad/frecuencia de barriles), siguiendo la forma de `lib/bloque-buster-levels.ts`. Sin integración con el engine todavía.

2. **Motor: consumir `BARRILES_LEVELS`.** En `BarrilesEngine`, reemplazar la generación 100% procedural del prototipo por: usar `BARRILES_LEVELS[nivel]` mientras existan layouts definidos, y volver a la generación procedural (con dificultad creciente) para niveles más allá del último layout. Test manual: jugar los primeros 5 niveles y confirmar que cada torre tiene un diseño reconocible y distinto.

3. **Power-up de martillo.** Agregar spawn periódico de `HammerPowerUp` en el piso actual del jugador, detección de recolección (colisión AABB simple), estado `empoweredUntil` en `Player`, y la regla de colisión modificada: barril + jugador empoderado → destruir barril y sumar puntos extra en vez de restar vida. El temporizador de empoderamiento se congela junto con el resto de `update()` durante PAUSA.

4. **Sonido sintetizado.** Implementar `playBeep` con Web Audio API y disparar el efecto correspondiente en cada evento (barril rodando entra en pantalla, salto, recolección de martillo, barril destruido con martillo, pérdida de vida). Inicializar `audioCtx` en `start()`, cerrarlo en `destroy()` (idempotente, protegido contra doble cierre).

5. **QA manual y build.** Jugar varios niveles seguidos verificando que los layouts de `BARRILES_LEVELS` se reconocen como distintos entre sí, recoger el martillo y destruir al menos un barril con él, confirmar que los 5 efectos de sonido se escuchan en el momento correcto y no se duplican ni quedan sonando tras "SALIR", confirmar cero errores en consola, y correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Los primeros 5 niveles de una partida usan los layouts definidos en `lib/barriles-levels.ts` (pisos/escaleras reconociblemente distintos entre sí); niveles posteriores vuelven a la generación procedural con dificultad creciente.
- [ ] Un power-up de martillo aparece periódicamente en el piso donde está el jugador; recogerlo activa el estado "empoderado" (visualmente distinguible) durante una duración fija.
- [ ] Mientras el jugador está empoderado, chocar con un barril lo destruye (el barril desaparece) y suma puntos extra, en vez de restar una vida.
- [ ] Al vencer el efecto del martillo, el jugador vuelve a perder vidas normalmente al chocar con un barril.
- [ ] El temporizador del martillo se congela mientras el juego está en PAUSA y continúa exactamente donde quedó al REANUDAR.
- [ ] Se escuchan efectos de sonido distintos para: barril rodando, salto, recoger martillo, romper barril con martillo, perder vida — todos generados sin archivos de audio externos.
- [ ] "SALIR" o desmontar el juego detiene cualquier audio en curso y no deja el `AudioContext` corriendo en segundo plano.
- [ ] El resto de la mecánica (movimiento, escaleras, HUD, PAUSA/REANUDAR/FIN/JUGAR DE NUEVO/SALIR, guardado real de puntuación) sigue funcionando igual que en specs 01 y 02.

## Decisiones

- **Sí:** se crea este tercer spec porque el concepto sí tiene un incremento de contenido natural y no forzado — variedad de torres (paralelo directo a `lib/bloque-buster-levels.ts`), un power-up central a la identidad "Donkey Kong" (el martillo), y sonido, ninguno de los cuales es necesario para que el juego sea jugable de punta a punta (ya lo es desde spec 02).

- **Sí:** sonido sintetizado con Web Audio API en vez de archivos `.mp3`. A diferencia de Arkanoid (spec 07), que portó audio real porque el `game.js` de referencia lo traía, Barriles es un concepto 100% original sin ningún asset de origen — sintetizar evita la necesidad de generar o conseguir archivos de audio nuevos fuera del alcance de un agente que solo escribe specs.

- **No:** callback de HUD para el estado "empoderado" del martillo. Se resuelve con una señal visual en el canvas (color/aura del jugador), mismo criterio que el power-up de triple disparo de Asteroides (spec 04), que tampoco expone un callback propio.

- **No:** otros tipos de obstáculo, plataformas móviles, o multijugador. Ampliarían el alcance del "pulido" a una reescritura mayor del motor; si se quieren en el futuro, van en un spec nuevo fuera de este batch de game-jam.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Algunos navegadores bloquean la creación/reanudación de `AudioContext` sin un gesto de usuario previo, pudiendo dejar el juego sin sonido silenciosamente. | `audioCtx.resume()` se llama en el primer input de teclado capturado por el motor (que ya requiere una interacción del usuario para existir), en vez de asumir que `start()` alcanza. |
| Layouts fijos de `BARRILES_LEVELS` podrían generar una dificultad desbalanceada (muy fácil o imposible) si se diseñan sin jugarlos. | El paso 5 del plan incluye QA manual jugando explícitamente los 5 niveles con layout fijo antes de dar el spec por cerrado. |
| El temporizador del martillo, si no se integra correctamente con el mecanismo de pausa existente, podría seguir corriendo en tiempo real durante PAUSA (rompiendo la convención de que `pause()` congela todo el estado de juego). | El temporizador se implementa como un contador de frames/ticks dentro de `update()` (no `Date.now()` de pared), igual que el resto del estado del motor — automáticamente se congela cuando `update()` deja de llamarse. |

## Lo que **no** está en este spec

- Multijugador o modo cooperativo.
- Otros tipos de obstáculo además del barril.
- Plataformas móviles o mecánicas adicionales de plataforma.
- Controles táctiles/móviles.
- Sprites/spritesheet de imagen.

Cada uno de estos, si se implementa, va en su propio spec.
