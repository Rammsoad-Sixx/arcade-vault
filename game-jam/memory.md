# Memoria del subagente game-jam

> Este archivo lo mantiene automáticamente el subagente `game-jam`
> (`.claude/agents/game-jam.md`) — se reescribe entero en cada corrida. No lo
> edites a mano fuera de él. Guarda el historial de temas de game jam ya
> trabajados para no repetir conceptos ni ids de catálogo entre corridas.

## Estado de conceptos por tema

| Tema | Juego propuesto | `id` de catálogo | Specs generados | Fecha |
| --- | --- | --- | --- | --- |
| Donkey Kong (física de plataformas + barriles rodantes + múltiples animaciones) | BARRILES — obrero que trepa una torre de pisos conectados por escaleras esquivando/saltando barriles que descienden en zigzag | `barriles` (nuevo, no reusa ningún placeholder) | `specs/game-jam/barriles/01-prototipo.md`, `specs/game-jam/barriles/02-integracion.md`, `specs/game-jam/barriles/03-pulido.md` | 2026-08-04 |

## Historial de corridas

### Corrida 1 — 2026-08-04

- **Tema recibido:** "Donkey Kong" — física de plataformas + barriles rodantes + múltiples animaciones. Origen: entrada #18 (`barriles`) del Tier 2 de `references/games-references.md`, propuesta por `game-planner` (ARCADE, complejidad Alta), sin `game.js` de referencia en `references/started-games/`.
- **Contexto leído:** `game-jam/memory.md` no existía (primera corrida); `CLAUDE.md`/`AGENTS.md`; `implemented-games/implemented-games.md` (3 juegos reales: `asteroides`, `caida`, `bloque-buster`); `lib/games-data.ts` completo (9 entradas: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `asteroides`); `.agents/skills/spec/template.md`; `.agents/skills/port-game/pattern.md`; specs 04/05/06/07 completos (todos en estado Implementado); `specs/` listado (sin ningún spec Draft/In review/Approved en curso); `specs/game-jam/` (vacío, solo `.gitkeep`); `references/started-games/` (02-asteroids, 03-tetris, 04-arkanoid — ninguno relevante como referencia técnica para este tema).
- **Concepto elegido:** "BARRILES" — categoría ARCADE. Un obrero escala una torre de pisos horizontales conectados por escaleras; barriles spawean arriba y descienden en zigzag piso por piso; el jugador los esquiva moviéndose de piso, cambiando de escalera, o saltando en el lugar para pasar por encima de uno en su mismo piso; llegar al piso superior sube de nivel y regenera una torre más difícil; 3 vidas, game over al perderlas todas.
- **Decisión de catálogo:** `id` nuevo `"barriles"`, no reuso de ningún placeholder (`serpentina`=Snake, `gloton`=Pac-Man, `invasores`=Space Invaders, `ranaria`=Frogger, `duelo-pixel`=Pong — ninguno encaja temáticamente). Sigue el precedente de Asteroides/`rocas` (spec 04): sin overlap conceptual real, se crea una entrada de catálogo distinta. El nombre/`id` retoma directamente la sugerencia de `game-planner` (entrada #18, `barriles`) en vez de inventar uno nuevo.
- **Simplificación deliberada:** movimiento de barriles reducido a zigzag discreto piso-a-piso (no física continua sobre plataformas con pendiente como el Donkey Kong original), para mantener el motor dentro de la misma clase de complejidad que Asteroides/Tetris/Arkanoid (1 canvas, colisiones AABB, sin física compleja) pese a que `game-planner` catalogó el tema como complejidad "Alta". Documentado explícitamente en Decisiones del spec de prototipo.
- **Specs creados** (agrupados en `specs/game-jam/barriles/`, una carpeta por juego):
  1. `specs/game-jam/barriles/01-prototipo.md` — mecánica core jugable en local; entrada nueva en `GAMES`; portada `.cover-barriles` temporal; "GUARDAR PUNTUACIÓN" deshabilitado (fila `games` de Supabase todavía no existe).
  2. `specs/game-jam/barriles/02-integracion.md` — fila `games` en Supabase, portada definitiva de 3 capas, guardado/lectura real de puntuaciones conectados.
  3. `specs/game-jam/barriles/03-pulido.md` — SÍ se generó (no se omitió): `lib/barriles-levels.ts` con torres variadas, power-up de martillo (destruye barriles en vez de restar vida), sonido sintetizado con Web Audio API (sin archivos de audio externos, a diferencia de Arkanoid que sí tenía `.mp3` de referencia).
- Los 3 specs quedan en `Status: Draft`, listos para revisión humana y aprobación manual antes de `/spec-impl`.
- **Nota post-corrida (ajuste de convención pedido por el usuario, 2026-08-04):** originalmente los 3 specs se crearon directo en `specs/game-jam/` con nombres `NN-barriles-<etapa>.md` y numeración continua para toda la carpeta. El usuario pidió agruparlos en una subcarpeta por juego; se movieron a `specs/game-jam/barriles/` y se renombraron a `01-prototipo.md`/`02-integracion.md`/`03-pulido.md` (sin slug redundante, ya lo da el nombre de carpeta). La definición del agente (`.claude/agents/game-jam.md`) se actualizó para que las corridas futuras usen esta convención desde el vamos: una carpeta `specs/game-jam/<slug>/` por juego, numeración `01`/`02`/`03` local a esa carpeta (ya no continua entre juegos).
