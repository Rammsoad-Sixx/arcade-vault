# SPEC 08 — Controles táctiles para dispositivos móviles

> **Status:** Implementado
> **Depends on:** SPEC 04 (contrato engine/wrapper), SPEC 06 (Tetris), SPEC 07 (Arkanoid)
> **Date:** 2026-08-07
> **Objective:** Agregar un overlay de controles táctiles (D-pad diamante + botón de acción, superpuesto sobre el canvas) para Asteroides y Caída, y arrastre táctil directo sobre el canvas para la paleta de Bloque Buster, visibles únicamente en viewport móvil (mismo breakpoint que el menú hamburguesa, `max-width: 840px`), de modo que los 3 juegos con motor real sean jugables por completo en una pantalla táctil.

## Scope

**In:**

- Hook nuevo para detectar viewport móvil (`max-width: 840px`, mismo breakpoint que ya activa el menú hamburguesa en `Nav.tsx`), SSR-safe (`false` en el server, se actualiza al montar vía `matchMedia`).
- Componente compartido `components/games/TouchControls.tsx`: overlay presentacional con D-pad en diamante (4 direcciones, cada una mostrable/ocultable según el juego) + botón(es) de acción configurables, usando Pointer Events, estilo neón semi-transparente acorde al sitio, posicionado `absolute` dentro de `.crt-screen` (D-pad abajo-izquierda, botón(es) de acción abajo-derecha — igual que la imagen de referencia).
- Métodos públicos nuevos en los 3 engines para simular teclas sin duplicar lógica de juego:
  - `AsteroidsEngine` / `TetrisEngine`: se refactorizan los handlers privados de teclado para delegar en un método compartido; se exponen `pressVirtualKey(code)` / `releaseVirtualKey(code)` (Asteroides, teclas sostenidas) y `pressVirtualKey(code)` (Caída, edge-triggered, sin necesidad de "release").
  - Auto-repeat propio (por intervalo, mientras el botón se mantiene presionado) para las direcciones sostenidas de Caída (izquierda/derecha/soft-drop), ya que en teclado ese comportamiento depende del repeat nativo del SO, que el touch no tiene.
- Bloque Buster: listener de arrastre táctil agregado directamente sobre el canvas (reutiliza el mismo cálculo de escala que ya usa `mousemove` para posicionar la paleta en X). No usa `TouchControls` — no necesita overlay de botones.
- Los wrappers `AsteroidsGame.tsx` y `TetrisGame.tsx` renderizan `<TouchControls>` condicionalmente (según el hook de viewport móvil), conectado a los nuevos métodos virtuales del engine correspondiente.
- `touch-action: none` (o equivalente) en el canvas/overlay mientras el juego está montado, para evitar que el scroll, pinch-zoom o pull-to-refresh del navegador interfieran con la partida.
- QA manual en emulación de dispositivo (DevTools) y, si es posible, dispositivo real, para los 3 juegos; `npm run build` y `npm run lint`.

**Out of scope (para specs futuras):**

- Juegos placeholder sin motor real (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — no tienen controles que portar, siguen con su animación simulada intacta.
- Auditoría general de layout responsivo en otras pantallas (Nav, Biblioteca, Salón, Home) — ya cubierta por specs 01/02, no se toca acá.
- Controles por gestos (swipe/tap sin botones visibles) — descartado a favor del D-pad.
- Paridad exacta con el repeat-rate nativo del SO para botones sostenidos — se usa un intervalo propio aproximado, no timing pixel-perfect.
- Feedback háptico (API de vibración) al presionar botones.
- Layout distinto para orientación horizontal (landscape) — el overlay usa la misma posición sin importar la orientación del dispositivo.
- Un mecanismo genérico de "todo juego futuro recibe controles táctiles automáticamente" más allá de aplicarlo a estos 3 juegos puntuales — mismo criterio que specs anteriores.

## Data model

Esta feature no agrega estructuras de persistencia (no hay tabla nueva, no hay `localStorage` nuevo — el estado de "qué botón está presionado" vive en memoria del componente/engine, igual que las teclas). Sí introduce tipos e interfaces nuevas de UI/engine:

### Hook de detección (`lib/use-is-mobile-viewport.ts`)

```ts
export function useIsMobileViewport(breakpoint = 840): boolean;
```

SSR-safe (arranca en `false`, se actualiza al montar vía `matchMedia(\`(max-width: ${breakpoint}px)\`)`+ listener de resize), mismo breakpoint que ya usa`.av-nav` para el menú hamburguesa.

### Componente compartido (`components/games/TouchControls.tsx`)

```ts
export type DPadDirection = "up" | "down" | "left" | "right";

export interface TouchActionButton {
  code: string; // el "código de tecla virtual" que simula, ej. "Space"
  label: string; // texto/ícono visible en el botón
}

export interface TouchControlsProps {
  directions: Partial<Record<DPadDirection, string>>;
  // qué direcciones del diamante están activas y a qué código de tecla virtual
  // dispara cada una, ej. { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" }
  actions: TouchActionButton[];
  onPress: (code: string) => void;
  onRelease: (code: string) => void;
}
```

Renderiza el D-pad (solo las direcciones presentes en `directions`) abajo-izquierda y los botones de `actions` abajo-derecha, superpuestos sobre `.crt-screen`. Cada botón usa Pointer Events (`onPointerDown` → `onPress(code)`, `onPointerUp`/`onPointerLeave`/`onPointerCancel` → `onRelease(code)`), independiente de los demás — así varios botones sostenidos a la vez funcionan sin lógica extra de multi-touch.

### Engines: métodos públicos nuevos

**`AsteroidsEngine`** (refactor: `handleKeyDown`/`handleKeyUp` delegan en los mismos métodos que se exponen abajo):

```ts
pressVirtualKey(code: string): void;   // equivalente a keydown: this.keys[code] = true + justPressed si corresponde
releaseVirtualKey(code: string): void; // equivalente a keyup: this.keys[code] = false
```

**`TetrisEngine`** (refactor: el `switch` de `handleKeyDown` se extrae a un método privado reutilizado):

```ts
pressVirtualKey(code: string): void; // ejecuta la misma acción discreta del switch (mover, rotar, soft/hard drop)
```

Sin `releaseVirtualKey` — Caída no tiene keyup. El auto-repeat de las direcciones sostenidas (izq/der/abajo) lo maneja `TouchControls` con un `setInterval` propio mientras el botón sigue presionado, llamando `pressVirtualKey` repetidamente; el engine no distingue si el llamado vino de teclado o de touch.

**`BloqueBusterEngine`** (sin D-pad — arrastre directo sobre el canvas):

```ts
movePaddleTo(clientX: number): void; // misma fórmula de escala que ya usa handleMouseMove, invocada desde un listener touchmove nuevo sobre el propio canvas
```

### Wrappers — sin cambios de props públicas

`AsteroidsGameProps`, `TetrisGameProps`, `BloqueBusterGameProps` no cambian de forma (page.tsx sigue invocándolos igual). El toggle del overlay es interno a cada wrapper vía `useIsMobileViewport()`; `AsteroidsGame`/`TetrisGame` renderizan `<TouchControls>` conectado a los métodos virtuales de su engine cuando el hook da `true`. `BloqueBusterGame` agrega su listener `touchmove` internamente, sin overlay.

## Implementation plan

1. **Hook de detección de viewport móvil.** Crear `lib/use-is-mobile-viewport.ts` con `useIsMobileViewport(breakpoint = 840)`, SSR-safe vía `matchMedia` + listener de resize. Test manual: hook aislado, sin uso todavía en ninguna pantalla — se puede probar con un `console.log` temporal en cualquier client component y confirmar que cambia al redimensionar el viewport en DevTools.

2. **Componente `TouchControls`.** Crear `components/games/TouchControls.tsx` con la interfaz `TouchControlsProps` (D-pad diamante configurable + botones de acción), usando Pointer Events (`onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel`), y su CSS asociado en `app/globals.css` (`.touch-controls`, `.touch-dpad`, `.touch-action-btn`, etc.) con estilo neón semi-transparente. Sin integrar en ningún engine todavía — se puede montar temporalmente en cualquier página para verificar visualmente el layout (D-pad abajo-izquierda, botones abajo-derecha) en emulación móvil.

3. **Asteroides: virtual keys + integración.** Refactorizar `AsteroidsEngine` para que `handleKeyDown`/`handleKeyUp` deleguen en dos métodos privados compartidos; exponerlos como públicos `pressVirtualKey(code)` / `releaseVirtualKey(code)`. En `AsteroidsGame.tsx`, usar `useIsMobileViewport()` para renderizar `<TouchControls directions={{ left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" }} actions={[{ code: "Space", label: "DISPARAR" }]} onPress={...} onRelease={...} />` superpuesto al canvas, cableado a los métodos virtuales del engine. Test manual: en emulación móvil, rotar/acelerar/disparar funciona igual que con teclado; en desktop no aparece el overlay.

4. **Caída: virtual keys + auto-repeat + integración.** Refactorizar `TetrisEngine` extrayendo el `switch` de `handleKeyDown` a un método privado reutilizado; exponer `pressVirtualKey(code)` público (sin release, acción discreta). En `TouchControls`, implementar el auto-repeat interno (`setInterval` mientras el botón sigue presionado) solo para las direcciones que lo necesitan (izquierda/derecha/abajo); rotar y hard-drop se disparan una sola vez por toque. En `TetrisGame.tsx`, renderizar `<TouchControls directions={{ left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown", up: "ArrowUp" }} actions={[{ code: "Space", label: "CAER" }]} .../>` condicionado al mismo hook. Test manual: mover/rotar/soft-drop/hard-drop funcionan por touch, y mantener presionado izquierda/derecha mueve la pieza repetidamente.

5. **Bloque Buster: arrastre táctil sobre el canvas.** Agregar `movePaddleTo(clientX)` público a `BloqueBusterEngine` (misma fórmula de escala que `handleMouseMove`) y un listener `touchmove` (+ `touchstart`) sobre el propio canvas dentro de `start()`/`destroy()`, sin pasar por `TouchControls`. No requiere cambios en `BloqueBusterGame.tsx` más allá de lo ya interno al engine. Test manual: en emulación móvil, arrastrar el dedo sobre el canvas mueve la paleta; en desktop el mouse sigue funcionando sin cambios.

6. **Prevenir scroll/zoom mientras se juega.** Aplicar `touch-action: none` al canvas y al overlay de `TouchControls` en los 3 juegos (vía CSS o inline style), y `e.preventDefault()` en los listeners táctiles nuevos donde corresponda, para que arrastrar/tocar sobre el juego no dispare scroll de página, pull-to-refresh o pinch-zoom.

7. **QA manual y build.** En emulación de dispositivo (DevTools, viewport ≤840px) y en un dispositivo real si está disponible: jugar una partida completa de cada uno de los 3 juegos usando únicamente controles táctiles (sin teclado/mouse), confirmar que el overlay no aparece en desktop, que ningún gesto de juego hace scroll/zoom de la página, y que teclado/mouse siguen funcionando en desktop sin regresiones. Correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] En viewport de escritorio (>840px), ninguno de los 3 juegos muestra el overlay de controles táctiles; teclado (y mouse en Bloque Buster) siguen funcionando exactamente igual que antes.
- [ ] En viewport móvil (≤840px, emulado o real), `/juegos/asteroides/jugar` muestra el D-pad (izquierda/derecha rotan, arriba acelera) + botón "DISPARAR" superpuestos sobre el canvas; una partida completa es jugable de punta a punta solo con touch.
- [ ] En viewport móvil, `/juegos/caida/jugar` muestra el D-pad (izquierda/derecha mueven, abajo soft-drop, arriba rota) + botón "CAER" (hard drop); mantener presionado izquierda/derecha/abajo repite la acción mientras se sostiene; una partida completa es jugable solo con touch.
- [ ] En viewport móvil, `/juegos/bloque-buster/jugar` mueve la paleta arrastrando el dedo sobre el canvas, sin overlay de botones; una partida completa es jugable solo con touch.
- [ ] Combinaciones simultáneas (ej. sostener acelerar + rotar + tocar disparar en Asteroides) funcionan sin que un botón bloquee a otro.
- [ ] Ningún gesto sobre el canvas o el overlay (tap, drag, mantener presionado) dispara scroll de página, pinch-zoom o pull-to-refresh mientras el juego está montado.
- [ ] Los 5 juegos placeholder sin motor real no muestran ningún overlay nuevo ni cambian su comportamiento.
- [ ] PAUSA/REANUDAR/FIN/JUGAR DE NUEVO/SALIR del HUD del sitio siguen funcionando igual en mobile con el overlay visible (no se superponen visualmente de forma que tapen los botones del HUD).

## Decisiones tomadas y descartadas

- **Sí:** un solo spec cubre los 3 juegos con motor real (Asteroides, Caída, Bloque Buster), a diferencia del patrón de specs 04/06/07 (un spec por juego). Decisión explícita del usuario — es la misma feature transversal (controles táctiles) aplicada a 3 juegos, no 3 features distintas.
- **Sí:** overlay de D-pad diamante + botón(es) de acción superpuestos sobre el canvas para Asteroides y Caída, siguiendo la referencia visual provista por el usuario. Se descartaron los gestos (swipe/tap sin botones visibles) por ser menos precisos para control fino y requerir diseño de gestos distinto por juego.
- **Sí:** Bloque Buster usa arrastre táctil directo sobre el canvas en vez de D-pad — el juego solo mueve la paleta en horizontal y ya tiene la lógica de seguimiento de puntero (`mousemove`) lista para reutilizar; agregar un D-pad con dos botones sin función (arriba/abajo) hubiera sido ruido.
- **Sí:** detección de "móvil" por ancho de viewport (`max-width: 840px`, el mismo breakpoint que ya usa el menú hamburguesa), no por capacidad táctil (`pointer: coarse`). Mantiene un único criterio de "qué es mobile" en todo el sitio en vez de agregar un segundo mecanismo de detección.
- **Sí:** cada botón del overlay usa Pointer Events independientes (no un solo listener global) — el multi-touch (sostener varios botones a la vez) sale "gratis" de este diseño, sin necesidad de lógica extra dedicada a rastrear múltiples dedos.
- **Sí:** los engines exponen métodos públicos (`pressVirtualKey`/`releaseVirtualKey`) que reusan la lógica interna ya existente de manejo de teclado, en vez de que `TouchControls` implemente su propia versión de las reglas de juego. Evita duplicar/desincronizar comportamiento entre teclado y touch.
- **Sí:** Caída implementa su propio auto-repeat (por intervalo) para las direcciones sostenidas del D-pad, ya que el original depende del repeat nativo del teclado del sistema operativo, que el touch no tiene. Se descartó buscar paridad exacta de timing con el repeat-rate del SO — alcanza con una aproximación razonable.
- **No:** controles táctiles para los 5 juegos placeholder sin motor real. No hay lógica de juego real a la que conectarlos; se abordará junto con el port de cada uno (`/port-game`).
- **No:** layout distinto para orientación horizontal (landscape) — mismo overlay sin importar la orientación, para no ampliar el alcance.
- **No:** feedback háptico (vibración) al presionar botones — no fue pedido y es una mejora incremental separable.
- **No:** un mecanismo genérico de "todo juego futuro recibe controles táctiles automáticamente" — mismo criterio de no sobre-ingeniería que specs anteriores; `TouchControls` es reutilizable pero cada juego decide explícitamente su propia config de `directions`/`actions`.
- **Sí:** dependencia declarada de SPEC 04 (contrato engine/wrapper), SPEC 06 (Caída) y SPEC 07 (Bloque Buster) — se refactorizan sus engines existentes, no se tocan specs 01/02/03/05.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                               | Mitigación                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor de `handleKeyDown`/`handleKeyUp` en `AsteroidsEngine` y `TetrisEngine` (para delegar en los métodos compartidos con `pressVirtualKey`/`releaseVirtualKey`) podría introducir una regresión en el comportamiento de teclado ya existente. | QA manual explícito de teclado en desktop en los pasos 3 y 4 del plan, comparando contra el comportamiento pre-refactor antes de darlos por cerrados.                               |
| Pointer Events del D-pad podrían "filtrarse" al canvas subyacente (o viceversa en Bloque Buster, que escucha `touchmove` sobre su propio canvas), generando movimiento de paleta/nave no intencional.                                                | `setPointerCapture` en cada botón de `TouchControls` para que sus eventos no lleguen al canvas; `TouchControls` no se renderiza en Bloque Buster, evitando el conflicto por diseño. |
| El auto-repeat por intervalo de las direcciones sostenidas en Caída podría quedar corriendo indefinidamente si el dedo se desliza fuera del botón sin disparar `pointerup` (pointer "perdido").                                                      | Registrar también `onPointerCancel`/`onPointerLeave` para limpiar el intervalo, además de cleanup en el `useEffect` de desmontaje del wrapper.                                      |
| `touch-action: none` aplicado de forma demasiado amplia podría bloquear el scroll legítimo del resto de la página `/juegos/[id]/jugar` si el estilo se filtra fuera de `.crt-screen`.                                                                | Aplicar `touch-action: none` únicamente al canvas y al overlay `TouchControls`, nunca a contenedores padres (`.av-player`, `body`).                                                 |
| React Strict Mode (doble montaje en desarrollo) podría duplicar el nuevo listener `touchmove` del canvas en Bloque Buster.                                                                                                                           | Mismo mecanismo ya usado para `mousemove`/`keydown`: se agrega/remueve dentro del `start()`/`destroy()` idempotente ya existente.                                                   |

## Lo que **no** está en este spec

- Controles táctiles para los 5 juegos placeholder sin motor real.
- Auditoría general de layout responsivo en otras pantallas del sitio (Nav, Biblioteca, Salón, Home).
- Controles por gestos (swipe/tap sin botones visibles).
- Paridad exacta con el repeat-rate nativo del sistema operativo.
- Feedback háptico (vibración).
- Layout distinto para orientación horizontal (landscape).
- Un mecanismo genérico de "todo juego futuro recibe controles táctiles automáticamente".

Cada uno de estos, si se implementa, va en su propio spec.
