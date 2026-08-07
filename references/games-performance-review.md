# Revisión de performance de dibujo por juego

> Mantenido automáticamente por el subagente `game-performance-booster`. No se
> edita a mano fuera de ese subagente — se reescribe entera en cada corrida
> (esta versión puntual fue reconciliada a mano tras 3 corridas paralelas
> que se pisaron entre sí en memoria; ver nota en `game-performance-booster/memory.md`).

**Última corrida:** 2026-08-07 — 3 corridas en paralelo, juegos actualizados: `bloque-buster`, `asteroides`, `caida` (Tetris). `ranaria` no se tocó en este lote, a pedido explícito.

## Estado por juego

| id | Juego | Motor real | Estado | Hallazgos abiertos |
| --- | --- | --- | --- | --- |
| asteroides | ASTEROIDES | Sí | Optimizado | Sin hallazgos de Categoría A. Categoría B (no accionada): `.filter()`/`.concat()` de `bullets`/`particles`/`powerUps`/`asteroids` reasignados incondicionalmente cada frame; colisión bala↔asteroide O(n·m) sin partición espacial; `ctx.save()`/`ctx.restore()` por instancia en `Asteroid.draw()`/`PowerUp.draw()`. |
| bloque-buster | BLOQUE BUSTER | Sí | Optimizado | Sin hallazgos de Categoría A (bloques y paddle/pelota ya agrupaban correctamente; solo el loop de explosiones tenía una asignación redundante, ya hoisteada). Categoría B (no accionada): redibujo de la grilla de bloques sin caché offscreen (severidad baja); `explosions.filter()` incondicional cada frame; `Audio.cloneNode()` por rebote/rotura de bloque. |
| caida | CAÍDA | Sí | Pendiente | Auditado. `drawBlock()` (tablero, ghost, pieza activa y preview) reasigna `shadowBlur`/`shadowColor` por bloque dentro de 4 grupos homogéneos por color — candidato al mismo batching de Frogger, pero **descartado como no seguro de aplicar a ciegas**: los bloques quedan casi contiguos (~2px de hueco) frente a un blur de 8px en el skin `neon`, muy por debajo del margen que sí tenía Frogger (huecos 40-120px vs blur 6-8px), por lo que agrupar en 2 pasadas podría introducir una diferencia de píxel sutil pero real cerca de los bordes entre bloques. Además, el tablero (~200 celdas) se redibuja entero cada frame sin ninguna capa cacheada, aunque casi todo el tablero es estático entre frames — mismo tipo de hallazgo que spec 10 dejó fuera de su propio alcance para Frogger. Ninguno de los dos se implementó. |
| ranaria | RANARIA | Sí | Optimizado (según spec 10) | Sin hallazgos abiertos según el diagnóstico e implementación de spec 10 (batching de `shadowBlur`/`shadowColor` por carril, ya aplicado). Estado heredado directamente de spec 10 — todavía no confirmado por una corrida propia de `game-performance-booster` sobre `frogger-engine.ts` (excluido explícitamente de este lote a pedido del usuario). |

## Cómo leer esta tabla

- **Motor real:** si el juego tiene un `draw()` real bajo `components/games/engine/` (elegible para esta auditoría) — los placeholders de catálogo sin motor (`serpentina`, `gloton`, `invasores`, `duelo-pixel`, `rocas`) no aparecen en esta tabla porque no hay nada que auditar todavía; para esos, el paso previo es `/port-game`.
- **`Optimizado`:** el patrón de toggle de `shadowBlur`/`shadowColor` por entidad ya está agrupado por lote (mismo molde que `frogger-engine.ts`), sin hallazgos de Categoría A pendientes.
- **`Optimizado parcialmente: <qué falta>`:** se aplicó batching en parte del engine, pero queda al menos un caso sin agrupar.
- **`Pendiente`:** el juego tiene motor real pero el patrón de toggle-por-entidad sigue sin agrupar — ya sea porque nunca se auditó, o porque se auditó y **no se pudo aplicar el fix estándar con garantía visual** (caso de `caida`: ver columna de hallazgos).
- **`Bloqueado: sin motor real`:** el id señalado como objetivo es solo un placeholder de catálogo, sin `draw()` real que auditar.
