# SPEC 05 — Leaderboard y tabla de juegos

**Estado:** Implementado
**Dependencias:** SPEC 03 (Supabase instalación)
**Fecha:** 2026-08-03
**Objetivo:** Reemplazar los datos mock de puntuaciones (`seededScores`) del Detalle de juego y el Salón de la Fama por un leaderboard real persistido en Supabase (tablas `games` y `scores`), guardando cada puntuación vía una Server Action validada en vez de `localStorage`.

## Alcance

### Incluye

- Migración SQL en Supabase que crea la tabla `games` (columnas: `id text PK`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best integer`, `plays text`) y la sembra con las 9 filas actuales de `lib/games-data.ts` (incluida `asteroides`).
- Migración SQL que crea la tabla `scores` (`id bigserial PK`, `game_id text REFERENCES games(id)`, `name text`, `score integer`, `created_at timestamptz default now()`), sin datos semilla (arranca vacía).
- RLS en `scores` y `games`: sin `INSERT`/`UPDATE`/`DELETE` público; `SELECT` público habilitado (necesario para leer el leaderboard sin autenticación).
- `lib/scores.ts` — helper de servidor `getTopScores(gameId, limit)` que consulta `scores` ordenado por `score desc` para un juego.
- `app/juegos/[id]/jugar/actions.ts` — Server Action `saveScore(gameId, name, score)` que valida `name` no vacío y `score` numérico, e inserta en `scores` usando el cliente de servidor de Supabase (la FK `game_id → games.id` garantiza que el juego exista).
- `app/juegos/[id]/page.tsx` (Detalle): la tabla "MEJORES PUNTUACIONES" pasa a usar `getTopScores` en vez de `seededScores`; el resto de la página (metadatos del juego: título, cover, descripción, stat-strip) sigue leyendo del array estático `GAMES`.
- `app/salon/page.tsx` (Salón de la Fama): se reescribe como Server Component `async`, seleccionando el juego vía `searchParams` (`?juego=id`, default al primer juego de `GAMES`); los chips de juego pasan a ser `<Link href="/salon?juego=...">`; se elimina la sección "TU MEJOR MARCA"; el podio (oro/plata/bronce) se renderiza parcialmente según cuántas filas reales existan (0 filas → se oculta el podio y se muestra un mensaje "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO"; 1-2 filas → solo los slots correspondientes).
- `app/juegos/[id]/jugar/page.tsx`: `saveScore` deja de escribir en `localStorage["av_scores"]` y en su lugar invoca la Server Action `saveScore` de `actions.ts`; se elimina la interfaz `SavedScore` y toda referencia a `av_scores`.

### No incluye

- Cambios a Home (`app/page.tsx`) ni a Biblioteca (`app/biblioteca/page.tsx`) — siguen usando el array estático `GAMES` y `seededScores` tal como hoy.
- Cálculo dinámico de `best`/`plays` desde datos reales de `scores` — quedan estáticos, migrados tal cual desde `lib/games-data.ts`. Queda para un spec futuro.
- Autenticación real (Supabase Auth) — las puntuaciones se guardan con `name` de texto libre, sin cuenta asociada.
- Cualquier edición/borrado de puntuaciones ya guardadas (moderación, admin, etc.).
- Ranking global agregado entre juegos — el leaderboard sigue siendo per-juego, igual que el diseño actual del Salón.
- Sincronización o migración de datos que ya existan en `localStorage["av_scores"]` de usuarios actuales — ese localStorage simplemente deja de usarse; no hay import de datos viejos.
- Lectura de columnas de la tabla `games` desde ninguna pantalla (título, cover, etc.) — su único uso es como referencia FK para `scores.game_id`.

## Modelo de datos

### Tablas Supabase (migración SQL)

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null,
  best integer not null,
  plays text not null
);

create table scores (
  id bigserial primary key,
  game_id text not null references games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games are publicly readable"
  on games for select
  using (true);

create policy "scores are publicly readable"
  on scores for select
  using (true);
```

Sin políticas de `insert`/`update`/`delete` → bloqueadas por default con RLS habilitado. Los inserts en `scores` solo ocurren server-side (Server Action con el cliente de servidor de Supabase).

Seed de `games`: `insert into games (...) values (...)` con las 9 filas actuales de `GAMES` en `lib/games-data.ts` (incluida `asteroides` del spec 04), como parte de la misma migración o una migración de seed separada.

### Tipos TypeScript (`lib/scores.ts`)

```ts
export interface ScoreRow {
  id: number;
  game_id: string;
  name: string;
  score: number;
  created_at: string;
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
```

### Server Action (`app/juegos/[id]/jugar/actions.ts`)

```ts
"use server";

export async function saveScore(
  gameId: string,
  name: string,
  score: number,
): Promise<{ ok: true } | { ok: false; error: string }>;
```

Valida `name.trim().length > 0` y `Number.isFinite(score) && score >= 0` antes de insertar; si la FK falla (juego inexistente) o hay error de Supabase, devuelve `{ ok: false, error }`.

### Reutilización existente

No se modifica el tipo `Game` de `lib/games-data.ts`; `GAMES` y `seededScores` siguen existiendo tal cual para Home/Biblioteca. `SavedScore` y toda lógica de `localStorage["av_scores"]` en `app/juegos/[id]/jugar/page.tsx` se eliminan por completo.

## Plan de implementación

Cada paso deja la app funcional y compilable (`npm run dev` / `npm run build` sin errores).

1. **Migración SQL: tablas + RLS.** Crear la migración que define `games` y `scores` (con FK, índice `scores_game_id_score_idx`, RLS habilitado y policies de `select` público) vía el MCP de Supabase (`apply_migration`). Verificación: `list_tables` muestra ambas tablas con RLS activo.

2. **Seed de `games`.** Insertar las 9 filas actuales de `GAMES` (`lib/games-data.ts`) en la tabla `games`, en una migración separada o en la misma del paso 1. Verificación: `execute_sql` (`select count(*) from games`) devuelve 9.

3. **Helper de lectura (`lib/scores.ts`).** Crear `getTopScores(gameId, limit)` usando el cliente de servidor de Supabase (`lib/supabase/server.ts`), consultando `scores` filtrado por `game_id`, ordenado `score desc`, con `limit`. Sin integración con ninguna pantalla todavía.

4. **Server Action de guardado (`app/juegos/[id]/jugar/actions.ts`).** Implementar `saveScore(gameId, name, score)` con validación de `name`/`score` e inserción en `scores` vía cliente de servidor. Sin integración con ninguna pantalla todavía.

5. **Detalle (`app/juegos/[id]/page.tsx`).** Reemplazar `seededScores(...)` por `await getTopScores(id, 10)` en la tabla "MEJORES PUNTUACIONES". El resto de la página no cambia. Test manual: con `scores` vacía, la tabla se renderiza sin filas (sin errores).

6. **Salón de la Fama (`app/salon/page.tsx`).** Reescribir como Server Component `async` que lee `searchParams.juego` (default al primer `GAMES[0].id`), hace `await getTopScores(juego, 12)`, renderiza chips como `<Link href="/salon?juego=...">`, arma el podio parcial según cantidad de filas (0 → mensaje "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO" sin podio; 1-2 → solo los slots con datos; 3+ → podio completo), y elimina la sección "TU MEJOR MARCA". Test manual: navegar entre chips cambia el juego y las puntuaciones mostradas.

7. **Guardado real en el Reproductor (`app/juegos/[id]/jugar/page.tsx`).** Reemplazar la escritura en `localStorage["av_scores"]` de `saveScore` por una llamada a la Server Action `saveScore(game.id, name, score)`; eliminar la interfaz `SavedScore`. Manejar el caso `{ ok: false }` mostrando el toast de error en vez de "PUNTUACIÓN GUARDADA_".

8. **QA manual y build.** Jugar una partida (cualquier juego, incluido `asteroides`), guardar la puntuación, verificar que aparece en el Detalle y en el Salón (tras navegar a ese juego) sin recargar manualmente el navegador. Confirmar que `localStorage["av_scores"]` ya no se escribe. Correr `npm run build` y `npm run lint`.

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` pasan sin errores.
- [x] Existen las tablas `games` y `scores` en Supabase, con RLS habilitado, policies de `select` público, y sin policies de `insert`/`update`/`delete` públicas.
- [x] La tabla `games` contiene 9 filas (una por cada juego de `lib/games-data.ts`, incluida `asteroides`).
- [x] La tabla `scores` arranca vacía y tiene FK `game_id → games.id` e índice `(game_id, score desc)`.
- [x] Al terminar una partida y guardar la puntuación en `/juegos/[id]/jugar`, se inserta una fila real en `scores` (verificable vía `execute_sql` o recargando el Detalle) y ya no se escribe nada en `localStorage["av_scores"]`.
- [x] El Detalle de cualquier juego (`/juegos/[id]`) muestra en "MEJORES PUNTUACIONES" datos reales de `scores` (no `seededScores`), ordenados de mayor a menor.
- [x] El Salón de la Fama (`/salon`) permite cambiar de juego navegando entre chips (`?juego=id`) y muestra las puntuaciones reales de ese juego.
- [x] Si un juego tiene 0 puntuaciones guardadas, el Salón oculta el podio y muestra el mensaje "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO"; con 1 o 2 puntuaciones, solo se muestran los slots del podio correspondientes.
- [x] La sección "TU MEJOR MARCA EN [JUEGO]" ya no existe en el Salón de la Fama.
- [x] Las fechas de puntuaciones reales se muestran en formato `DD/MM/YYYY`.
- [x] Un intento de `insert` directo a `scores` desde el cliente (browser, con la publishable key) falla por RLS — solo la Server Action (con el cliente de servidor) puede escribir.
- [x] Home (`app/page.tsx`) y Biblioteca (`app/biblioteca/page.tsx`) no fueron modificados y siguen mostrando datos del array estático `GAMES`/`seededScores` sin cambios.

## Decisiones tomadas y descartadas

- **Sí:** un solo spec cubre tanto la tabla `games` como el leaderboard de `scores`, en vez de separarlos en dos specs. Decisión explícita del usuario.

- **Sí:** la tabla `games` en Supabase existe únicamente como referencia FK para `scores.game_id` — ninguna pantalla lee sus columnas (`title`, `cover`, etc.). Home, Biblioteca y los metadatos del Detalle siguen usando el array estático `GAMES`. Evita acoplar dos fuentes de verdad para el catálogo en este spec; se puede migrar el resto del catálogo a Supabase en un spec futuro si hace falta.

- **No:** cálculo dinámico de `best`/`plays` desde datos reales de `scores`. Quedan estáticos, migrados tal cual desde `lib/games-data.ts`. Evita acoplar lógica de agregación entre `games` y `scores` en este spec.

- **No:** autenticación real (Supabase Auth). Las puntuaciones se guardan con `name` de texto libre, igual que el flujo actual del modal de game over, para no bloquear este spec detrás de una implementación de auth completa.

- **Sí:** `localStorage["av_scores"]` se reemplaza por completo por Supabase — no convive con la persistencia real, y no se migran datos viejos de usuarios existentes. Simplifica el spec al tener una sola fuente de verdad para puntuaciones.

- **Sí:** escritura de puntuaciones vía Server Action validada (con el cliente de servidor de Supabase), no vía RLS permisiva de `insert` público. Mismo esfuerzo de código, evita que cualquiera con la publishable key llene el leaderboard con datos arbitrarios desde la consola del navegador.

- **Sí:** fetch de puntuaciones en Server Components sin estado de carga visible en cliente, en vez de fetch desde cliente con skeleton/spinner. Aprovecha que Detalle ya es un Server Component `async`, y evita agregar estado de loading para un fetch que suele resolver en el mismo request de navegación.

- **Sí:** como consecuencia del punto anterior, el Salón de la Fama pasa de tabs con `useState` (swap instantáneo en cliente) a chips como `<Link>` que navegan con `?juego=id`, forzando un nuevo fetch server-side por cada cambio de juego. Acepta un cambio de interacción (navegación en vez de swap instantáneo) a cambio de mantener el modelo "Server Component sin loading".

- **No:** mantener la sección "TU MEJOR MARCA EN [JUEGO]" del Salón de la Fama. Sin autenticación real, comparar por `name` de texto libre sería frágil (nombres duplicados, mayúsculas) y daría falsos positivos; se elimina en vez de mantener una aproximación poco confiable.

- **Sí:** podio parcial cuando hay menos de 3 puntuaciones reales para un juego (en vez de ocultarlo por completo hasta llegar a 3, o rellenar con placeholders). Prioriza mostrar datos reales disponibles cuanto antes sobre la fidelidad visual del podio de 3 slots.

- **Sí:** filas de tabla sin relleno — se muestran solo las puntuaciones reales existentes (0 a N), sin placeholders. Evita inventar datos falsos en una tabla que ahora es "real".

- **Sí:** RLS con `select` público habilitado en ambas tablas, sin `insert`/`update`/`delete` público. Es un leaderboard público por diseño (cualquiera debe poder verlo sin login), pero la escritura queda controlada server-side.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                   | Mitigación                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble click en "GUARDAR PUNTUACIÓN" antes de que resuelva la Server Action podría insertar la puntuación dos veces, ya que ahora es una operación async (antes era escritura síncrona a `localStorage`). | El botón se deshabilita (o se oculta) mientras la Server Action está en vuelo, usando un estado `pending` separado de `saved`, que solo pasa a `true` cuando la respuesta confirma `{ ok: true }`. |
| El Salón de la Fama lee el juego activo desde `searchParams.juego`; un valor manipulado en la URL que no exista en `GAMES` rompería el `find` (`game` undefined) al construir la página.                 | Si `searchParams.juego` no matchea ningún `id` de `GAMES`, se hace fallback al primer juego (`GAMES[0].id`) en vez de fallar.                                                                      |
| Un error de red o de Supabase al hacer `getTopScores` en Detalle o Salón (Server Components) podría tirar una excepción no controlada durante el render del servidor.                                    | Envolver la consulta en un `try/catch`; si falla, tratar como lista vacía y mostrar el mismo mensaje de "aún no hay puntuaciones" en vez de romper la página.                                      |
