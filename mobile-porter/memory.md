# mobile-porter — memoria

## Estado de soporte táctil por juego

| id | Motor real | Arquetipo(s) de input | Veredicto | Hallazgos abiertos | Última corrida |
|---|---|---|---|---|---|
| asteroides | Sí | Sostenido con release (`pressVirtualKey`/`releaseVirtualKey` + `TouchControls`) | Sin revisar | — | — |
| caida | Sí | Discreto/edge-triggered (`pressVirtualKey` + auto-repeat en izq/der/abajo vía `TouchControls`) | Sin revisar | — | — |
| bloque-buster | Sí | Arrastre directo sobre canvas (`movePaddleTo`) | Sin revisar | — | — |
| ranaria | Sí | Discreto/edge-triggered (4 direcciones, un salto de una celda por toque, sin auto-repeat necesario) | Sin soporte táctil | Ningún input táctil: sin método virtual público en `FroggerEngine`, sin `<TouchControls>` ni `useIsMobileViewport()` en `FroggerGame.tsx`. Bloqueante — el juego es injugable en touch. | Corrida #1 (2026-08-07) |

Notas sobre la tabla:

- "Sin revisar" = tiene motor real pero `mobile-porter` todavía no corrió una auditoría de código sobre él (distinto de "Bloqueado: sin motor real", que ni siquiera aplica hoy porque los 4 juegos elegibles tienen motor real).
- `asteroides`/`caida`/`bloque-buster` ya tienen soporte táctil implementado por `specs/08-controles-tactiles.md`, pero como `mobile-porter` nunca corrió sobre ellos todavía (esta es la primera corrida del subagente), quedan en "Sin revisar" hasta que se les dedique una corrida explícita — no se asume que pasan solo porque el spec dice "Implementado".

## Historial de corridas

### Corrida #1 — 2026-08-07

- **Juego objetivo:** `ranaria` (título de catálogo "RANARIA", Frogger). Nombrado explícitamente por el usuario en la invocación.
- **Confirmación de motor real:** `components/games/engine/frogger-engine.ts` (clase `FroggerEngine`) + wrapper `components/games/FroggerGame.tsx`, integrado en `app/juegos/[id]/jugar/page.tsx` (`isFrogger = id === "ranaria"`). Portado vía `specs/game-jam/frogger/01-frogger-core.md`, que declara explícitamente en su Scope (línea 44): "Controles táctiles/móviles (se audita después, automáticamente, vía `mobile-porter`)" — confirma que el estado sin soporte táctil es esperado en este punto del flujo, no un descuido.
- **Arquetipo de input:** Discreto/edge-triggered puro — 4 direcciones (`ArrowUp/Down/Left/Right` + `WASD`), cada tecla dispara un salto de una sola celda (`pendingDir`), ignorando `e.repeat` (`frogger-engine.ts:664`). No hay ninguna dirección que dependa de auto-repeat del SO (a diferencia de Caída) porque el salto es de una celda por pulsación, no continuo.
- **Hallazgos:**
  1. **Existencia (Bloqueante).** `FroggerEngine.handleKeyDown` (`frogger-engine.ts:645-666`) es privado; no existe ningún `pressVirtualKey`/método público equivalente para simular una dirección. `FroggerGame.tsx` no importa `TouchControls` ni `useIsMobileViewport` (`lib/use-is-mobile-viewport.ts`) en ningún punto del archivo. Resultado: en viewport móvil (≤840px) el juego no tiene ningún camino de input — es completamente injugable en touch, ya que el único input del juego (moverse en las 4 direcciones) depende 100% de `document.addEventListener("keydown", ...)`.
  2. **`touch-action: none` ya presente pero sin efecto útil (Menor).** El `<canvas>` en `FroggerGame.tsx:71` ya tiene `style={{ touchAction: "none" }}` inline — correcto en sí mismo y coherente con el check 4 del checklist, pero hoy no cumple ninguna función real porque no hay ningún listener táctil que dependa de bloquear scroll/zoom; queda como base ya lista para cuando se agregue soporte táctil real.
  3. **Contrato `pattern.md` intacto (no es hallazgo, confirmación positiva).** `start/pause/resume/reset/forceGameOver/destroy` presentes con la semántica esperada: `pause()`/`resume()` solo alternan el flag `paused` que congela `update()` (`frogger-engine.ts:640`, `draw()` sigue corriendo siempre), `destroy()` es idempotente vía el flag `destroyed` y remueve el único listener (`keydown`) que agregó. No hay ningún listener táctil que auditar por ahora, así que no hay riesgo de fuga de listeners en este momento — pero si se agrega soporte táctil sin replicar este mismo cuidado de cleanup, sería una regresión a vigilar en la próxima corrida.
- **Veredicto:** `Sin soporte táctil: ninguna de las 4 direcciones de movimiento tiene equivalente táctil (sin pressVirtualKey en el engine, sin TouchControls ni useIsMobileViewport en el wrapper)`.
