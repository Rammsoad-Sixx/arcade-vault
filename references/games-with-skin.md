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
| `ranaria` | RANARIA (Frogger) | Sí | Sí | Sí | Sí | Completo |
| `serpentina` | SERPENTINA | No | — | — | — | Bloqueado: sin motor real |
| `gloton` | GLOTÓN | No | — | — | — | Bloqueado: sin motor real |
| `invasores` | INVASORES | No | — | — | — | Bloqueado: sin motor real |
| `rocas` | ROCAS | No | — | — | — | Bloqueado: sin motor real |
| `duelo-pixel` | DUELO PIXEL | No | — | — | — | Bloqueado: sin motor real |

**Resumen:** los 4 juegos elegibles (motor real) tienen hoy las 3 skins
completas (`asteroides`, `bloque-buster`, `caida`, `ranaria`). 5 juegos
siguen bloqueados por ser placeholder sin motor real — no cuentan como
incumplimiento, son candidatos naturales a `/port-game` primero. Cuando
`/port-game` sume un motor nuevo, ese juego pasa a "Sin implementar" en la
próxima corrida de `skin-designer`.

Última actualización: 2026-08-07 — corrida #4 de `skin-designer`, implementó
`ranaria` (Frogger; `clasico`/`retro`/`neon` completos). El motor tenía más
de 20 colores hex fijos entre 4 zonas de terreno (segura/río/carretera/
metas), vehículos, flotadores del río y la rana. Se remapeó por rol
semántico: rana (jugador) y frog-icon de meta completada → `primary`;
vehículos de carretera (hostiles) → `secondary`; flotadores del río
(troncos/tortugas, soporte) y borde de las bocas de meta → `accent`; las 4
zonas de terreno se pintan como un lavado sutil (alpha bajo) del rol
asociado sobre `palette.background`, en vez de un color fijo por zona, para
conservar la lectura del tablero sin introducir colores ajenos a la paleta.
Detalles puramente estructurales (ruedas, vetas de madera, ojos de la rana)
se mantuvieron neutros en los 3 skins, mismo criterio que el bisel blanco de
`tetris-engine.ts`. El selector de skin en `app/juegos/[id]/jugar/page.tsx`
ya era infraestructura compartida visible para este juego (vía `isFrogger`
en `hasRealEngine`) desde antes de esta corrida; solo faltaba pasarle el
prop `skin` al wrapper `FroggerGame`. Los 4 juegos con motor real del
catálogo tienen ahora sus 3 skins completas.

Nota: `CLAUDE.md`/`AGENTS.md`/`implemented-games/implemented-games.md`
todavía describen el catálogo como "solo 3 juegos con motor real" (no
reflejan el port reciente de Frogger a `ranaria`) — fuera del alcance de
`skin-designer` actualizarlos.
