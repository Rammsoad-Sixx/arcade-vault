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
| `caida` | CAÍDA (Tetris) | Sí | No | No | No | Sin implementar |
| `bloque-buster` | BLOQUE BUSTER (Arkanoid) | Sí | No | No | No | Sin implementar |
| `serpentina` | SERPENTINA | No | — | — | — | Bloqueado: sin motor real |
| `gloton` | GLOTÓN | No | — | — | — | Bloqueado: sin motor real |
| `invasores` | INVASORES | No | — | — | — | Bloqueado: sin motor real |
| `rocas` | ROCAS | No | — | — | — | Bloqueado: sin motor real |
| `ranaria` | RANARIA | No | — | — | — | Bloqueado: sin motor real |
| `duelo-pixel` | DUELO PIXEL | No | — | — | — | Bloqueado: sin motor real |

**Resumen:** 3 juegos elegibles (motor real), 1 con las 3 skins completas
(`asteroides`). 6 juegos bloqueados por ser placeholder sin motor real — no
cuentan como incumplimiento, son candidatos naturales a `/port-game` primero.

Última actualización: 2026-08-04 — corrida #1 de `skin-designer`, implementó
`asteroides` (`clasico`/`retro`/`neon` completos). El selector de skin en
`app/juegos/[id]/jugar/page.tsx` ya es visible también para `caida` y
`bloque-buster` (misma infraestructura compartida), pero sus engines todavía
no leen la paleta activa.
