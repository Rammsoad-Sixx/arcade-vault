# SPEC game-jam 02 — Barriles: integración a catálogo y leaderboard

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 05, specs/game-jam/barriles/01-prototipo.md
> **Date:** 2026-08-04
> **Objective:** Conectar "Barriles" al catálogo y al leaderboard real de punta a punta: fila `games` en Supabase, portada `.cover-barriles` definitiva de 3 capas, y guardado/lectura real de puntuaciones.

## Scope

**In:**

- Migración Supabase (`insert into games (...)` para la fila `id: "barriles"`, vía `mcp__supabase__apply_migration`), necesaria porque `scores.game_id` tiene una FK `references games(id)` — sin esta fila, cualquier intento de guardar puntuación falla.
- Reemplazo de la clase `.cover-barriles` temporal (spec de prototipo) por el tratamiento definitivo de 3 capas descrito en `pattern.md`: fondo base + capa de textura (`::after`, radial-gradients simulando estructura de andamios/torre) + carácter Unicode temático (`::before`, p. ej. un tambor/barril) con `color`/`text-shadow` usando `var(--yellow)`.
- Habilitar el botón "GUARDAR PUNTUACIÓN" del modal de fin de partida para `id === "barriles"` (se elimina el estado deshabilitado del prototipo), llamando a la Server Action `saveScore("barriles", name, score)` (spec 05) sin modificaciones a `actions.ts`.
- Conectar el Detalle (`/juegos/barriles`) a `getTopScores("barriles", 10)` en la tabla "MEJORES PUNTUACIONES" — ya es el comportamiento genérico de spec 05 para cualquier `id` con fila en `games`; solo empieza a funcionar en cuanto existe la fila.
- Confirmar que `/salon` incluye "BARRILES" como chip navegable (`?juego=barriles`) automáticamente, al leer `GAMES` — sin cambios de código en `app/salon/page.tsx`.

**Out of scope (for future specs):**

- Power-up de martillo, datos de niveles en `lib/barriles-levels.ts`, sonido — quedan para el spec de pulido (spec game-jam 03).
- Controles táctiles/móviles.
- Cualquier cambio a otro juego existente del catálogo o a su fila en `games`.
- Actualizar las columnas descriptivas (`title`/`short`/`long`/etc.) de la fila `games` en Supabase más allá de lo sembrado en la migración — ninguna pantalla lee esas columnas (spec 05), solo actúan como referencia FK.

## Data model

Sin cambios al esquema `games`/`scores` (spec 05). Único dato nuevo: la fila de `barriles` en la tabla `games`.

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays)
values (
  'barriles',
  'BARRILES',
  'Trepa la torre esquivando barriles rodantes.',
  'Un obrero decidido escala una torre de construcción improvisada mientras barriles de acero descienden piso por piso. Salta en el momento justo, sube por las escaleras y llega a la cima antes de quedarte sin vidas.',
  'ARCADE',
  'cover-barriles',
  'yellow',
  19800,
  '3.6K'
);
```

Mismos valores que la entrada ya agregada a `GAMES` (`lib/games-data.ts`) en el spec de prototipo — sin divergencia entre el array estático y la fila de Supabase (mismo criterio que las 9 filas sembradas en spec 05).

No se modifica el tipo `Game`, `ScoreRow`, ni las funciones `getTopScores`/`saveScore`.

## Implementation plan

1. **Migración: fila `games` para `barriles`.** Insertar la fila descrita arriba vía `mcp__supabase__apply_migration`. Verificación: `select id from games where id = 'barriles'` devuelve una fila.

2. **Portada definitiva `.cover-barriles`.** Reemplazar la clase CSS temporal del prototipo por el patrón de 3 capas (`pattern.md`): fondo base con gradiente radial, capa `::after` de textura (estructura de andamios/torre en tonos oscuros con `drop-shadow`), capa `::before` con un carácter Unicode de barril/tambor en `var(--yellow)` con `text-shadow`. Test manual: la tarjeta "BARRILES" en Biblioteca se distingue claramente de las otras 8 portadas, sin reusar ninguna clase existente.

3. **Habilitar guardado real.** En `app/juegos/[id]/jugar/page.tsx`, quitar la condición que deshabilitaba "GUARDAR PUNTUACIÓN" para `id === "barriles"`; el flujo pasa a llamar `saveScore("barriles", name, score)` igual que los demás juegos reales. Manejar `{ ok: false }` mostrando el toast de error existente (mismo patrón que los otros 3 juegos).

4. **QA manual y build.** Jugar una partida completa de Barriles, guardar la puntuación, verificar que aparece en el Detalle (`/juegos/barriles`) y en el Salón de la Fama (`/salon?juego=barriles`) sin recargar manualmente. Confirmar que la tarjeta en Biblioteca usa la portada definitiva. Correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Existe una fila `games` con `id: "barriles"` en Supabase (verificable vía `execute_sql` o `list_tables`).
- [ ] La tarjeta "BARRILES" en Biblioteca usa la portada `.cover-barriles` definitiva de 3 capas, distinta visualmente de las otras 8.
- [ ] `/juegos/barriles` muestra portada, descripción, stat-strip y tabla "MEJORES PUNTUACIONES" con datos reales vía `getTopScores` (vacía hasta la primera partida guardada).
- [ ] `/juegos/barriles/jugar` conserva toda la mecánica del prototipo (movimiento, escaleras, salto, barriles, vidas, niveles) sin cambios de comportamiento.
- [ ] El botón "GUARDAR PUNTUACIÓN" ya no aparece deshabilitado para Barriles: al completar una partida, inserta una fila real en `scores` (`game_id: "barriles"`) y muestra el toast "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación recién guardada aparece en la tabla "MEJORES PUNTUACIONES" del Detalle y en el Salón de la Fama al navegar a `?juego=barriles`.
- [ ] El chip "BARRILES" aparece en el Salón de la Fama junto a los demás 8 juegos, sin cambios de código en `app/salon/page.tsx`.
- [ ] La barra HUD (Puntuación/Vidas/Nivel), PAUSA/REANUDAR/FIN/"JUGAR DE NUEVO"/SALIR siguen funcionando exactamente igual que en el prototipo.

## Decisiones

- **Sí:** un spec de integración separado del prototipo, siguiendo el mismo patrón que `/port-game` reserva para la fila de Supabase — permite jugar y validar la mecánica core (spec 01) antes de comprometer datos en Supabase.

- **Sí:** los valores de la fila `games` (`title`/`short`/`long`/`color`/`best`/`plays`) son exactamente los mismos que la entrada ya escrita en `GAMES` durante el spec de prototipo — evita una fuente de verdad divergente entre el array estático y Supabase, mismo criterio que las 9 filas sembradas en spec 05.

- **Sí:** la portada definitiva se resuelve en este spec (no en el prototipo), porque recién acá el juego se considera "terminado" a nivel de catálogo — el prototipo prioriza la mecánica jugable sobre el pulido visual de la tarjeta.

- **No:** cambios a `app/salon/page.tsx`. El Salón ya itera sobre `GAMES` de forma genérica (spec 05); agregar la fila alcanza para que el chip "BARRILES" aparezca solo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si la migración de la fila `games` se aplica pero los valores no coinciden exactamente con los de `GAMES` en el código, quedarían dos fuentes de verdad divergentes (aunque ninguna pantalla lea las columnas de Supabase hoy, spec 05). | Los valores de la migración se copian literalmente de la entrada ya escrita en `lib/games-data.ts` en el spec de prototipo, sin redactar texto nuevo en este spec. |
| Un usuario podría intentar guardar una puntuación de Barriles durante la ventana entre que el prototipo ya está en producción (botón deshabilitado) y este spec se implementa — sin impacto real porque el botón sigue deshabilitado hasta que este spec se complete. | No aplica mitigación adicional: el botón deshabilitado del prototipo ya previene cualquier intento de insert prematuro. |

## Lo que **no** está en este spec

- Power-up de martillo, datos de niveles en `lib/barriles-levels.ts`, sonido.
- Controles táctiles/móviles.
- Cualquier cambio a otro juego existente del catálogo.
- Actualizar columnas descriptivas de la fila `games` más allá del seed inicial de este spec.

Cada uno de estos, si se implementa, va en su propio spec.
