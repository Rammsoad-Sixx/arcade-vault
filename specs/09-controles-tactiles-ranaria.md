# SPEC 09 — Controles táctiles para Ranaria (Frogger)

> **Status:** implementado
> **Depends on:** SPEC 04 (contrato engine/wrapper), SPEC 08 (controles táctiles — `TouchControls`, `useIsMobileViewport`), `specs/game-jam/frogger/01-frogger-core.md` (motor de Ranaria)
> **Date:** 2026-08-07
> **Objective:** Agregar el D-pad táctil de `TouchControls` a Ranaria (Frogger), visible únicamente en viewport móvil (mismo breakpoint `max-width: 840px` de spec 08), de modo que el 4º juego con motor real del catálogo sea jugable por completo en pantalla táctil. Detectado como pendiente por `mobile-porter` al auditar el port de Frogger — spec 08 no lo cubrió porque en ese momento `ranaria` todavía era un placeholder sin motor real.

## Scope

**In:**

- Refactor privado en `FroggerEngine` (`components/games/engine/frogger-engine.ts`): extraer de `handleKeyDown` la resolución de dirección (gate `state !== "playing"` + `pendingDir = dir`) a un método privado compartido. Exponer `pressVirtualKey(code: string): void` público — edge-triggered puro, sin `release` (mismo criterio que `TetrisEngine` en spec 08: una llamada = una acción discreta), que mapea `"ArrowUp"/"ArrowDown"/"ArrowLeft"/"ArrowRight"` al mismo `Direction` interno que ya usa el teclado.
- Extender `TouchControlsProps` (`components/games/TouchControls.tsx`) con un prop opcional `repeatDirections?: DPadDirection[]`, que reemplaza al `Set` fijo `REPEAT_DIRECTIONS` como valor por defecto (`["left", "right", "down"]`) cuando no se pasa — así Asteroides y Caída siguen exactamente igual sin tocar sus invocaciones. `FroggerGame` lo invoca con `repeatDirections={[]}`: ninguna dirección tiene auto-repeat, porque en Frogger cada toque debe ser exactamente un salto de una celda, nunca una repetición mientras se mantiene presionado (a diferencia de Caída, donde sostener mueve la pieza repetidamente).
- `FroggerGame.tsx`: usar `useIsMobileViewport()` (ya existe, `lib/use-is-mobile-viewport.ts`, sin cambios) para renderizar `<TouchControls directions={{ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }} actions={[]} repeatDirections={[]} onPress={...} onRelease={() => {}} />` superpuesto al canvas cuando el hook da `true`. Sin botones de acción — Frogger no tiene ninguna tecla más allá de las 4 direcciones.
- Confirmar que `touch-action: none`, ya presente en el `<canvas>` de `FroggerGame.tsx` desde el port original, sigue siendo suficiente (no hay drag táctil directo sobre el canvas como en Bloque Buster, solo el D-pad superpuesto).
- QA manual en emulación de viewport móvil (DevTools, ≤840px) y, si es posible, dispositivo real: completar una ronda entera (llenar las 5 bocas) usando solo touch. `npm run build` y `npm run lint`.

**Fuera de alcance:**

- Los 4 juegos placeholder restantes sin motor real (`serpentina`, `gloton`, `invasores`, `duelo-pixel`) — sin controles que portar todavía.
- Cualquier cambio de comportamiento en Asteroides, Caída o Bloque Buster — la extensión de `TouchControlsProps` es estrictamente retrocompatible (prop opcional, default preserva el `Set` actual).
- Botón de acción táctil — no aplica, Frogger no tiene ninguna acción de teclado aparte de moverse.
- Gestos (swipe/tap sin botones visibles), feedback háptico, layout distinto en landscape — mismos descartes que spec 08, sin revisitarlos acá.
- Cualquier ajuste a la mecánica de juego de Ranaria (velocidades, temporizador, puntuación) — ya cerrada en `specs/game-jam/frogger/01-frogger-core.md`.

## Data model

Sin persistencia nueva (mismo criterio que spec 08). Cambios de tipos/interfaces:

### `TouchControlsProps` extendida (`components/games/TouchControls.tsx`)

```ts
export interface TouchControlsProps {
  directions: Partial<Record<DPadDirection, string>>;
  actions: TouchActionButton[];
  onPress: (code: string) => void;
  onRelease: (code: string) => void;
  repeatDirections?: DPadDirection[]; // nuevo, opcional — default: ["left","right","down"]
}
```

Si se omite, el componente usa internamente el mismo `Set` que hoy está hardcodeado como `REPEAT_DIRECTIONS` — Asteroides y Caída no necesitan tocar su invocación existente.

### `FroggerEngine`: método público nuevo

```ts
pressVirtualKey(code: string): void;
// equivalente a una pulsación de teclado: resuelve la misma dirección y aplica
// el mismo gate de estado que handleKeyDown, sin necesidad de "release".
```

`FroggerGameProps` no cambia de forma — el toggle del overlay es interno a `FroggerGame`, igual que en los otros 3 juegos.

## Implementation plan

1. **Extender `TouchControls`.** Agregar `repeatDirections?: DPadDirection[]` a `TouchControlsProps`; dentro del componente, usar `new Set(repeatDirections ?? ["left", "right", "down"])` en vez de la constante módulo-scope fija. Test manual: Asteroides y Caída (que no pasan la prop nueva) se comportan exactamente igual que antes — repetir el QA de auto-repeat de spec 08 como chequeo de regresión.

2. **Refactor de input en `FroggerEngine`.** Extraer de `handleKeyDown` el bloque que resuelve `pendingDir` (gate de `state`, asignación) a un método privado reutilizable. Exponer `pressVirtualKey(code: string)` público que mapea el código al `Direction` (reutilizando el mismo diccionario que ya usa `handleKeyDown`, extraído a una constante de módulo para no duplicarlo) y llama al método privado compartido. Test manual: el teclado en desktop se sigue comportando exactamente igual tras el refactor (sin regresión).

3. **Integrar `TouchControls` en `FroggerGame.tsx`.** Usar `useIsMobileViewport()`; renderizar el D-pad de 4 direcciones (sin `actions`, `repeatDirections={[]}`) superpuesto al canvas cuando el hook da `true`, conectado a `engineRef.current?.pressVirtualKey(code)`; `onRelease` no hace nada (no-op), ya que Frogger no tiene estado "sostenido". Test manual: en emulación móvil, cada toque de una flecha del D-pad produce exactamente un salto; en desktop el overlay no aparece.

4. **QA manual y build.** En emulación de dispositivo (DevTools, ≤840px) y en dispositivo real si está disponible: completar una ronda entera de Ranaria (llenar las 5 bocas) usando solo touch, confirmar que sostener un botón no produce saltos repetidos, que ningún gesto sobre el D-pad o el canvas hace scroll/zoom de página, y que Asteroides/Caída no tuvieron ninguna regresión. Correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] En viewport de escritorio (>840px), `/juegos/ranaria/jugar` no muestra ningún overlay táctil; el teclado (flechas + WASD) sigue funcionando exactamente igual que antes.
- [ ] En viewport móvil (≤840px, emulado o real), `/juegos/ranaria/jugar` muestra el D-pad de 4 direcciones superpuesto al canvas, sin ningún botón de acción.
- [ ] Cada toque de una dirección del D-pad dispara exactamente un salto de una celda (120 ms) — mantener presionado no repite el salto automáticamente (a diferencia del D-pad de Caída).
- [ ] Una ronda completa (las 5 bocas ocupadas) es jugable de punta a punta usando solo controles táctiles.
- [ ] Las condiciones de muerte (vehículo, agua, tortuga sumergida, salir del río, tiempo agotado) siguen funcionando igual vía touch que vía teclado.
- [ ] Asteroides y Caída no cambian de comportamiento tras la extensión de `TouchControlsProps` (regresión verificada manualmente).
- [ ] Ningún gesto sobre el D-pad o el canvas dispara scroll de página, pinch-zoom o pull-to-refresh mientras el juego está montado.
- [ ] PAUSA/REANUDAR/FIN/JUGAR DE NUEVO/SALIR del HUD del sitio siguen funcionando igual en mobile con el overlay visible, sin que se superpongan visualmente.

## Decisiones tomadas y descartadas

- **Sí:** extender `TouchControlsProps` con `repeatDirections` opcional en vez de duplicar el componente o hardcodear un caso especial para Frogger dentro de `TouchControls`. Reutiliza toda la lógica de Pointer Events/multi-touch/cleanup ya validada por spec 08; retrocompatible por default, cero riesgo de regresión en Asteroides/Caída.
- **Sí:** sin auto-repeat en ninguna dirección para Ranaria. Decisión basada en el hallazgo explícito de `mobile-porter` al auditar el port (`references/games-mobile-review.md`) y en la semántica ya cerrada en `specs/game-jam/frogger/01-frogger-core.md` ("cada pulsación desplaza la rana exactamente una celda").
- **Sí:** sin botón de acción táctil — Ranaria no tiene ninguna tecla de acción aparte de las 4 direcciones de movimiento.
- **No:** cambios a Asteroides, Caída o Bloque Buster más allá de la extensión retrocompatible de `TouchControlsProps`.
- **No:** controles táctiles para los 4 placeholders restantes sin motor real — se abordan junto con el port de cada uno.
- **No:** gestos, feedback háptico, layout landscape distinto — mismos descartes que spec 08, sin reabrir la discusión acá.

## Riesgos identificados

| Riesgo                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor de `handleKeyDown` en `FroggerEngine` (para delegar en el método compartido con `pressVirtualKey`) podría introducir una regresión en el comportamiento de teclado ya existente. | QA manual explícito de teclado en desktop en el paso 2 del plan, comparando contra el comportamiento pre-refactor.                                                                                                                          |
| Hacer `repeatDirections` opcional con default interno podría desincronizarse si alguna invocación futura de `TouchControls` olvida pasarlo y espera comportamiento sin repeat.               | El default (`["left","right","down"]`) preserva el comportamiento actual — cualquier juego nuevo que no quiera auto-repeat debe pasar `repeatDirections={[]}` explícitamente, igual que hace Ranaria acá; documentado en el JSDoc del prop. |
| El D-pad de Ranaria podría solaparse visualmente con el HUD del sitio en pantallas muy angostas, igual que se mitigó en spec 08 para Asteroides/Caída.                                       | Mismo posicionamiento `absolute` dentro de `.crt-screen` ya usado por los otros 2 juegos con D-pad — sin CSS nuevo, se reutiliza `.touch-controls`/`.touch-dpad` tal cual.                                                                  |

## Lo que **no** está en este spec

- Controles táctiles para `serpentina`, `gloton`, `invasores`, `duelo-pixel`.
- Cambios de comportamiento en Asteroides, Caída o Bloque Buster.
- Botón de acción táctil para Ranaria.
- Gestos, feedback háptico, layout landscape distinto.
- Cualquier ajuste a la mecánica de juego de Ranaria ya cerrada en el spec de portado.

Cada uno de estos, si se implementa, va en su propio spec.
