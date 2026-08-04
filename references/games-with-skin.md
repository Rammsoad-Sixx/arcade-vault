# Juegos con skins — estado actual

Tabla curada y siempre-vigente (no es un log) del estado de las 3 skins
visuales (`clasico` default, `retro`, `neon`) por juego. La mantiene
automáticamente el subagente `skin-designer` (`.claude/agents/skin-designer.md`)
en cada corrida — no se edita a mano fuera de él. Memoria interna detallada
en `skin-designer/memory.md`.

Solo los juegos con **motor jugable real** son elegibles: un skin cambia
cómo dibuja un engine, y un placeholder no tiene engine que dibuje nada. Para
los bloqueados, las columnas de skin van con `—` (no `No`) porque no están en
deuda — simplemente todavía no tienen motor.

| id | Juego | Motor real | `clasico` | `retro` | `neon` | Estado |
|---|---|---|---|---|---|---|
| `asteroides` | ASTEROIDES | Sí | Sí | Sí | Sí | Completo |
| `bloque-buster` | BLOQUE BUSTER (Arkanoid) | Sí | Sí | Sí | Sí | Completo |
| `caida` | CAÍDA (Tetris) | Sí | Sí | Sí | Sí | Completo |
| `serpentina` | SERPENTINA | No | — | — | — | Bloqueado: sin motor real |
| `gloton` | GLOTÓN | No | — | — | — | Bloqueado: sin motor real |
| `invasores` | INVASORES | No | — | — | — | Bloqueado: sin motor real |
| `rocas` | ROCAS | No | — | — | — | Bloqueado: sin motor real |
| `ranaria` | RANARIA | No | — | — | — | Bloqueado: sin motor real |
| `duelo-pixel` | DUELO PIXEL | No | — | — | — | Bloqueado: sin motor real |

**Resumen:** los 3 juegos elegibles (motor real) tienen hoy las 3 skins
completas (`asteroides`, `bloque-buster`, `caida`). 6 juegos siguen
bloqueados por ser placeholder sin motor real — no cuentan como
incumplimiento, son candidatos naturales a `/port-game` primero. Cuando
`/port-game` sume un motor nuevo, ese juego pasa a "Sin implementar" en la
próxima corrida de `skin-designer`.

Última actualización: 2026-08-04 — corrida #3 de `skin-designer`, implementó
`caida` (`clasico`/`retro`/`neon` completos). El motor de Tetris tenía un
color hex fijo por cada uno de sus 8 tipos de pieza (I/O/T/S/Z/J/L + una
pieza no estándar "N"); se eliminó ese color por tipo y se remapeó por rol
de paleta según el estado del bloque: pieza activa + preview de la próxima
pieza → `primary` (entidad bajo control del jugador), piezas ya asentadas en
el tablero + líneas de la grilla de fondo → `secondary`, ghost/previsualización
de aterrizaje → `accent` (el motor no tenía ningún efecto de "línea
completa"/flash existente que mapear ahí, así que se usó el resalte puntual
más cercano en espíritu — el ghost piece — en vez de inventar una animación
nueva), fondo del canvas (tablero y next-canvas) → `background`. El selector
de skin en `app/juegos/[id]/jugar/page.tsx` ya era infraestructura compartida
visible para este juego desde la corrida #1; solo faltaba pasarle el prop
`skin` al wrapper. Los 3 juegos elegibles del catálogo (`asteroides`,
`bloque-buster`, `caida`) tienen ahora sus 3 skins completas.
