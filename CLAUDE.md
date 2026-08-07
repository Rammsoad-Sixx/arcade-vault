# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Skills

- Usa siempre `/front-design` para diseñar la interfaz de usuario.
- El proyecto sigue Spec Driven Design vía `/spec` y `/spec-impl` (fernando-skills, instalado con `npx skills@latest add Klerith/fernando-skills`). Toda feature nueva empieza como un `.md` en `specs/` en estado `Draft` antes de implementarse.
- `/port-game` — variante especializada de `/spec` para portar un juego jugable real al catálogo con leaderboard en Supabase. Ya conoce el patrón validado en `specs/04-juego-asteroides.md` y `specs/05-leaderboard-y-tabla-juegos.md`, así que pregunta menos que `/spec` genérico. Fuente de juegos de referencia: `references/started-games/`. Definido en `.agents/skills/port-game/` (symlinkeado en `.claude/skills/port-game`).
- `specs/.spec-config.yml` controla si `/spec-impl` crea la rama de git automáticamente (`AutoCreateBranch: true` por defecto).

## Subagentes

- `game-planner` (`.claude/agents/game-planner.md`) — subagente de solo lectura que planifica qué juego portar o crear a continuación: evalúa completar los placeholders de `lib/games-data.ts` (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) o proponer juegos arcade clásicos nuevos fuera del catálogo actual. Nunca escribe código ni crea specs — solo recomienda; el siguiente paso siempre es correr `/port-game` manualmente sobre el candidato elegido. Mantiene memoria persistente entre corridas en `game-planner/memory.md` (historial detallado interno) y publica un resumen curado en `references/games-references.md` (qué se sugirió, con qué estado y por qué) para no repetir propuestas ya hechas. Invocalo explícitamente pidiendo "usa game-planner" o preguntando qué juego conviene portar/agregar a continuación.
- `game-jam` (`.claude/agents/game-jam.md`) — subagente que, dado un tema (p. ej. "gravedad", "un solo botón"), diseña un concepto de juego original que encaje con ese tema y lo entrega partido en 2-3 specs secuenciales en estado `Draft` dentro de `specs/game-jam/` (Prototipo → Integración → Pulido opcional). A diferencia de `game-planner`, sí escribe specs — pero nunca código, nunca los aprueba ni los implementa; el siguiente paso siempre es que el usuario los revise, ajuste y apruebe manualmente antes de correr `/spec-impl`. Reutiliza el mismo contrato técnico ya validado en `.agents/skills/port-game/pattern.md` y el formato de `.agents/skills/spec/template.md`, aunque el juego se inventa desde cero (no porta ningún `game.js` de referencia). Mantiene memoria persistente entre corridas en `game-jam/memory.md` para no repetir temas o conceptos ya propuestos. Invocalo explícitamente con "usa game-jam" o "@game-jam \<tema\>".
- `skin-designer` (`.claude/agents/skin-designer.md`) — subagente que aplica las 3 skins visuales (`clasico` default, `retro`, `neon`) a **un juego puntual que el usuario indica en la invocación** (p. ej. "usa skin-designer para asteroides"); si no le dicen a cuál, pregunta antes de tocar código, listando los juegos elegibles (con motor real: hoy `asteroides`, `caida`, `bloque-buster`). A diferencia de `game-planner`/`game-jam`, sí escribe código directamente sobre el juego objetivo — crea/actualiza `lib/skins.ts`, refactoriza su engine en `components/games/engine/` para dibujar con la paleta activa, agrega el prop `skin` a su wrapper React, y wire-a el selector persistido en `app/juegos/[id]/jugar/page.tsx`, corriendo `npm run lint` al final. Un placeholder sin motor real señalado como objetivo queda bloqueado, no implementado. Mantiene memoria persistente entre corridas en `skin-designer/memory.md` (historial detallado interno) y publica una tabla curada en `references/games-with-skin.md` (qué juegos tienen sus 3 skins, cuáles están parciales y cuáles bloqueados). Invocalo explícitamente con "usa skin-designer" o "aplicá las skins a `<juego>`".

## Project

Arcade Vault — plataforma para jugar online y competir por la mayor cantidad de puntos. Dejó de ser un scaffold: hay landing, biblioteca de juegos, 3 juegos jugables reales con motor propio, autenticación básica y un leaderboard persistido en Supabase.

Specs implementadas hasta ahora (ver `specs/`, numeradas y en orden):

1. `01-mvp-visual.md` — sistema visual retro-arcade (CRT, neón, pixel fonts).
2. `02-home-landing.md` — landing page.
3. `03-supabase-install.md` — instalación e integración de Supabase.
4. `04-juego-asteroides.md` — primer juego jugable real (patrón base para portar juegos).
5. `05-leaderboard-y-tabla-juegos.md` — tabla `scores` en Supabase + Salón de la Fama.
6. `06-juego-tetris.md` — Tetris (id de catálogo `caida`).
7. `07-juego-arkanoid.md` — Arkanoid (id de catálogo `bloque-buster`, nombre en catálogo "Bloque Buster").

De los 8 juegos listados en `lib/games-data.ts` (`GAMES`), solo 3 tienen motor jugable real hoy: `asteroides`, `caida` (Tetris) y `bloque-buster` (Arkanoid). El resto (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) son solo tarjetas de catálogo con datos de muestra — `/juegos/[id]/jugar` cae a una animación placeholder para esos ids. Portarlos es candidato natural para `/port-game`. Puedes consultar `implemented-games/implemented-games.md` para mas información, y usar el subagente `game-planner` (ver `references/games-references.md`) para decidir qué portar o agregar a continuación.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint.config.mjs)
```

No hay test setup (sin script de test, sin archivos de test, sin dependencia de test runner) — no asumas que Jest/Vitest/Playwright están configurados.

## Critical: this is not the Next.js you know

This repo pins `next@16.2.12`. Per `AGENTS.md`, treat this as a version with breaking changes relative to training data — **read the relevant page under `node_modules/next/dist/docs/` before writing code that touches routing, caching, data fetching, or proxy/middleware**, and follow any deprecation notices found there. Two changes that are easy to get wrong from memory:

- **`middleware.ts` is deprecated → renamed to `proxy.ts`.** The exported function is `proxy` (not `middleware`), file lives at project root (or `src/`) next to `app/`. See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- **Cache Components (`use cache` / `cacheLife` / `cacheTag`) replace route segment configs** (`export const dynamic`, `revalidate`, `fetchCache`) when `cacheComponents: true` is set in `next.config.ts`. This flag is **not currently enabled** (`next.config.ts` is empty) — the classic fetch-cache/route-segment-config model applies until it is. Check `next.config.ts` before assuming which caching model is in effect. See `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` and `.../02-guides/migrating-to-cache-components.md`.

When in doubt about any App Router API, prefer reading the bundled docs over relying on prior Next.js knowledge.

## Architecture

- **App Router only** (`app/`), TypeScript, React 19. No `pages/` directory.
- `app/layout.tsx` — root layout; loads `Geist`/`Geist_Mono` via `next/font/google`, expone `--font-geist-sans`/`--font-geist-mono`, y envuelve la app en `UserProvider` (`lib/user-context.tsx`).
- `app/page.tsx` — landing (`/`).
- `app/biblioteca/page.tsx` — catálogo de juegos, filtrable por categoría y búsqueda (`"use client"`, filtra `GAMES` de `lib/games-data.ts`).
- `app/juegos/[id]/page.tsx` — detalle de un juego (server component) + top scores del juego vía `getTopScores`.
- `app/juegos/[id]/jugar/page.tsx` — reproductor del juego (`"use client"`): HUD (puntuación/vidas/nivel/líneas), monta el motor correspondiente según `id` (`asteroides` → `AsteroidsGame`, `caida` → `TetrisGame`, `bloque-buster` → `BloqueBusterGame`; cualquier otro id → animación placeholder), maneja pausa/reinicio/fin de partida y guarda el score final vía la server action `actions.ts`.
- `app/juegos/[id]/jugar/actions.ts` — server action `saveScore(gameId, name, score)` que inserta en la tabla `scores` de Supabase usando el cliente admin (service role, sin RLS).
- `app/salon/page.tsx` — Salón de la Fama / leaderboard (server component): tabs por juego, podio top 3 + tabla, lee `getTopScores` de `lib/scores.ts`.
- `app/auth/page.tsx` — login/registro mock (`"use client"`): no hay backend de auth real; `login()`/`logout()` solo escriben el nombre de usuario en `localStorage` vía `useUser()`. También permite "jugar como invitado".
- `app/globals.css` — Tailwind CSS v4 entry point (`@tailwindcss/postcss`, sin `tailwind.config.js`, v4 es CSS-first) + el sistema visual retro-arcade (CRT, neón, pixel fonts) definido en spec 01.
- Path alias `@/*` → project root (`tsconfig.json`).
- `public/` — static assets served at `/`.

### Componentes y lógica compartida

- `components/Nav.tsx` — nav superior + panel móvil, resalta la sección activa, muestra usuario logueado o botón de login.
- `components/GameCard.tsx` / `components/MiniGameCard.tsx` — tarjetas de juego para biblioteca/landing.
- `components/games/AsteroidsGame.tsx`, `TetrisGame.tsx`, `BloqueBusterGame.tsx` — wrappers React (forwardRef con handle imperativo: `pause`/`resume`/`reset`/`forceGameOver`) que montan cada motor sobre `<canvas>`.
- `components/games/engine/` — motores de juego en TS puro (sin React): `asteroids-engine.ts`, `tetris-engine.ts`, `bloque-buster-engine.ts`, `bloque-buster-sprites.ts`.
- `lib/games-data.ts` — catálogo de juegos (`GAMES`, tipos `GameCategory`/`GameColor`), categorías (`CATS`) y datos de muestra para nombres/scores sintéticos usados donde aún no hay datos reales.
- `lib/bloque-buster-levels.ts` — definición de niveles del Arkanoid.
- `lib/scores.ts` — `getTopScores(gameId, limit)` (lee de Supabase) y `formatScoreDate`.
- `lib/user-context.tsx` — `UserProvider`/`useUser()`, sesión mock persistida en `localStorage` (clave `av_user`), sincronizada entre componentes con `useSyncExternalStore`.

### Supabase

- `lib/supabase/client.ts` — cliente browser (`createBrowserClient`, usa `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- `lib/supabase/server.ts` — cliente server-side (`createServerClient`, integrado con `next/headers` cookies) para Server Components/Actions que necesitan contexto de request.
- `lib/supabase/admin.ts` — cliente con `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS), usado solo en la server action de guardar score.
- Variables de entorno en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Tabla `scores` (definida en spec 05): `id`, `game_id`, `name`, `score`, `created_at` — sin migraciones versionadas en el repo (no hay carpeta `supabase/`); el MCP de Supabase (`.mcp.json`, proyecto `sfifdojgcfvdnadojqmq`) es la vía para inspeccionar/alterar el esquema remoto.
