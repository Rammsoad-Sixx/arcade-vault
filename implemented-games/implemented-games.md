# Juegos implementados en Arcade Vault

De los 8 juegos listados en el catálogo (`lib/games-data.ts`), estos 3 tienen motor jugable real (los demás son solo tarjetas de catálogo con datos de muestra).

## 1. Asteroides

- **id catálogo:** `asteroides`
- **Título:** ASTEROIDES
- **Categoría:** SHOOTER · **Color:** cyan
- **Descripción:** Pilotea una nave triangular a través de un campo de asteroides que envuelve los bordes de la pantalla. Dispara para fragmentar rocas grandes en medianas y pequeñas, esquiva colisiones y sobrevive oleada tras oleada. Recoge el power-up de triple disparo cuando aparezca.
- **Motor:** `components/games/engine/asteroids-engine.ts`
- **Wrapper React:** `components/games/AsteroidsGame.tsx`
- **Spec:** `specs/04-juego-asteroides.md`
- **Scores en Supabase:** 2 partidas registradas, mejor puntaje 15.000

## 2. Caída (Tetris)

- **id catálogo:** `caida`
- **Título:** CAÍDA
- **Categoría:** PUZZLE · **Color:** magenta
- **Descripción:** Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.
- **Motor:** `components/games/engine/tetris-engine.ts`
- **Wrapper React:** `components/games/TetrisGame.tsx`
- **Spec:** `specs/06-juego-tetris.md`
- **Scores en Supabase:** 1 partida registrada, mejor puntaje 919

## 3. Bloque Buster (Arkanoid)

- **id catálogo:** `bloque-buster`
- **Título:** BLOQUE BUSTER
- **Categoría:** ARCADE · **Color:** cyan
- **Descripción:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles.
- **Motor:** `components/games/engine/bloque-buster-engine.ts` (+ `bloque-buster-sprites.ts`, niveles en `lib/bloque-buster-levels.ts`)
- **Wrapper React:** `components/games/BloqueBusterGame.tsx`
- **Spec:** `specs/07-juego-arkanoid.md`
- **Scores en Supabase:** 2 partidas registradas, mejor puntaje 210

---

**Nota:** `serpentina`, `gloton`, `invasores`, `ranaria` y `duelo-pixel` figuran en `lib/games-data.ts` pero no tienen motor real; `/juegos/[id]/jugar` cae a una animación placeholder para esos ids. Candidatos naturales para portar vía `/port-game`.

Datos de la tabla `scores` consultados directamente en Supabase el 2026-08-04.
