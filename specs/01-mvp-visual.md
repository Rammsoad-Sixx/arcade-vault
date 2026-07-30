# 01 - MVP Visual Arcade Vault

**Estado:** Implementado
**Dependencias:** Ninguna (primer spec del proyecto)
**Fecha:** 2026-07-30

**Objetivo:** Implementar la interfaz visual completa de las 5 pantallas de Arcade Vault (Biblioteca, Detalle de juego, Reproductor, Autenticación y Salón de la Fama) en Next.js App Router, portando fielmente el diseño, estilos y datos mock del template de referencia en `references/templates/`, sin implementar ningún motor de juego real.

## Alcance

### Incluye

- **5 pantallas** implementadas como rutas de Next.js App Router:
  - `/` — Biblioteca (grid de juegos, buscador, filtro por categoría)
  - `/juegos/[id]` — Detalle de juego (info, tabla de mejores puntuaciones, botón jugar)
  - `/juegos/[id]/jugar` — Reproductor (HUD simulado, pausa, fin de partida, guardar puntuación)
  - `/auth` — Autenticación (login / registro / invitado, tabs, botones sociales decorativos)
  - `/salon` — Salón de la Fama (podio + tabla de ranking por juego)
- **Nav compartido** (logo, links, contador de créditos estático, estado de sesión, menú hamburguesa responsive) y footer, en el layout raíz.
- **Datos mock** portados tal cual desde `data.jsx` a TypeScript: los 8 juegos, la lista de jugadores y el generador `seededScores`.
- **Estilos**: `styles.css` del template portado a `app/globals.css`, conviviendo con las directivas de Tailwind v4.
- **Fuentes**: Press Start 2P / Courier Prime / JetBrains Mono vía `next/font/google`, reemplazando Geist/Geist Mono.
- **Auth mock funcional**: el formulario guarda `{ name }` en `localStorage` (`av_user`) para que el Nav refleje sesión iniciada / invitado. Sin validación real ni backend.
- **Simulación de partida completa** en el Reproductor: score que sube solo (`setInterval`), pausa/reanudar, botón fin, modal de game over con input de iniciales y botón "guardar puntuación" (escribe en `localStorage` `av_scores`, sin leerse en ninguna tabla).
- Reemplazo total de `app/page.tsx` (contenido starter de create-next-app eliminado).

### No incluye (explícitamente fuera de alcance)

- Ningún motor de juego real ni lógica jugable para los 8 juegos del catálogo (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Backend, API o base de datos: toda persistencia es `localStorage` del navegador.
- Autenticación real (sin validación de credenciales, sin cuentas persistentes en servidor, sin OAuth funcional para los botones de Google/GitHub).
- Sistema de créditos/economía real (el contador "CRÉDITOS · 03" es decorativo y estático).
- Lectura de `av_scores` guardado en las tablas de ranking (Detalle y Salón de la Fama siempre usan `seededScores`, nunca lo guardado por el usuario).
- Cualquier característica no presente en los templates de referencia (`references/templates/`).

## Modelo de datos

Todo el contenido es mock estático, sin backend. Se porta `data.jsx` a un módulo TypeScript tipado.

### Archivo: `lib/games-data.ts`

```typescript
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string; // "bloque-buster", "caida", "serpentina", "gloton",
  // "invasores", "rocas", "ranaria", "duelo-pixel"
  title: string;
  short: string; // descripción corta (tarjeta)
  long: string; // descripción larga (detalle)
  cat: GameCategory;
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: GameColor;
  best: number; // mejor puntuación global
  plays: string; // ej. "12.4K"
}

export const GAMES: Game[]; // los 8 juegos, tal cual el template
export const CATS: ("TODOS" | GameCategory)[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[]; // 18 nombres mock

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

### Estado de sesión (cliente, no en este módulo)

- `localStorage["av_user"]`: `{ name: string } | null` — set por la pantalla Auth, leído por el Nav.
- `localStorage["av_scores"]`: `{ game: string; score: number; name: string; at: number }[]` — append-only, escrito por el Reproductor al guardar puntuación. No se lee en ninguna pantalla (confirmado en Alcance).

### Rutas (parámetros)

- `/juegos/[id]` y `/juegos/[id]/jugar` reciben `id` como `Game["id"]`; si no existe el juego, no se renderiza contenido (igual que `GameDetail` en el template, que retorna `null`).

## Plan de implementación

Cada paso deja la app funcional y compilable (`npm run dev` / `npm run build` sin errores).

1. **Fuentes y layout base.** En `app/layout.tsx`, reemplazar Geist/Geist Mono por Press Start 2P, Courier Prime y JetBrains Mono vía `next/font/google`, exponiéndolas como CSS variables. Portar a `app/globals.css` el reset, variables de color/tema y capas de fondo (`av-bg`, `av-noise`) del template, conviviendo con las directivas `@import "tailwindcss"`.

2. **Modelo de datos.** Crear `lib/games-data.ts` con `Game`, `GameCategory`, `GameColor`, `ScoreRow`, `GAMES`, `CATS`, `PLAYERS` y `seededScores`, tal como se definió en la sección de Modelo de datos.

3. **Nav y layout compartido.** Crear `components/Nav.tsx` (client component: maneja menú hamburguesa, lee `av_user` de `localStorage`, botón de cerrar sesión) y el footer, e integrarlos en `app/layout.tsx` envolviendo `{children}`. Usar `<Link>` de `next/navigation` en vez de la función `navigate()` del template.

4. **Pantalla Biblioteca (`/`).** Reemplazar `app/page.tsx` por la pantalla Biblioteca: hero, buscador, chips de categoría (client component por el estado de búsqueda/filtro) y grid de `GameCard` con efecto tilt, enlazando cada tarjeta a `/juegos/[id]`.

5. **Pantalla Detalle (`/juegos/[id]/page.tsx`).** Portar, con `GAMES.find` y `seededScores` a partir del `id`, la portada, info, tags, stat-strip y tabla de mejores puntuaciones. Botón "JUGAR AHORA" enlaza a `/juegos/[id]/jugar`; "VOLVER AL VAULT" enlaza a `/`.

6. **Pantalla Auth (`/auth/page.tsx`).** Client component con tabs (iniciar sesión / crear cuenta), campos de formulario, botón "jugar como invitado" y botones sociales decorativos. Al enviar, guarda `{ name }` en `localStorage["av_user"]` y redirige a `/` con `useRouter().push`.

7. **Pantalla Reproductor (`/juegos/[id]/jugar/page.tsx`).** Client component que replica el HUD, la arena CRT animada, el ciclo de simulación (score con `setInterval`, subida de nivel, pausa/reanudar), el botón "FIN" y el modal de game over con guardado de puntuación en `localStorage["av_scores"]`. "SALIR" vuelve a `/juegos/[id]`; "VOLVER AL VAULT" a `/`.

8. **Pantalla Salón de la Fama (`/salon/page.tsx`).** Client component con tabs por juego (estado local, sin URL param), podio top 3, tabla de ranking vía `seededScores`, y fila "tu mejor marca" condicionada a que exista `av_user` en `localStorage`.

9. **Repaso de estado de sesión entre pantallas.** Verificar que el Nav refleja login/logout y que el signo de "invitado" (`user: null`) se comporta igual que en el template en las 5 pantallas.

10. **QA visual final.** Recorrer las 5 pantallas en desktop y mobile (menú hamburguesa) comparando contra `references/templates/Arcade Vault.html` abierto en el navegador, y correr `npm run lint`.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `app/page.tsx` renderiza la pantalla Biblioteca (hero, buscador, chips de categoría, grid de 8 juegos); el contenido starter de create-next-app ya no existe.
- [ ] El buscador filtra por título (case-insensitive) y los chips filtran por categoría; combinados, ambos filtros aplican a la vez; sin resultados muestra el estado "NO HAY RESULTADOS".
- [ ] Cada `GameCard` enlaza a `/juegos/[id]` (tanto al hacer click en la tarjeta como en el botón "JUGAR").
- [ ] `/juegos/[id]` muestra portada, tags, descripción larga, stat-strip (partidas/mejor global/dificultad) y tabla de mejores puntuaciones (10 filas) para cada uno de los 8 juegos; con un `id` inexistente no rompe la app.
- [ ] Desde el Detalle, "JUGAR AHORA" navega a `/juegos/[id]/jugar` y "VOLVER AL VAULT" navega a `/`.
- [ ] `/juegos/[id]/jugar` muestra el HUD (jugador, puntuación, vidas, nivel) con la puntuación subiendo automáticamente mientras no está en pausa ni terminado.
- [ ] El botón PAUSA/REANUDAR detiene y reanuda la subida de puntuación, mostrando el overlay "EN PAUSA".
- [ ] El botón FIN abre el modal de game over con la puntuación final; el input de iniciales y "GUARDAR PUNTUACIÓN" escriben en `localStorage["av_scores"]` y muestran el toast "PUNTUACIÓN GUARDADA".
- [ ] Desde el modal de game over, "JUGAR DE NUEVO" reinicia el estado de la partida (score/vidas/nivel/pausa) sin recargar la página; "VOLVER AL VAULT" navega a `/`.
- [ ] "SALIR" en el HUD navega de vuelta a `/juegos/[id]`.
- [ ] `/auth` muestra tabs "INICIAR SESIÓN" / "CREAR CUENTA" (el campo correo solo aparece en la segunda); al enviar el formulario o pulsar "JUGAR COMO INVITADO", guarda el usuario correspondiente en `localStorage["av_user"]` y redirige a `/`.
- [ ] Con `av_user` presente en `localStorage`, el Nav muestra el nombre del usuario en vez de "Iniciar Sesión" en las 5 pantallas; el botón correspondiente hace sign-out (borra `av_user`) y vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon` muestra tabs por cada uno de los 8 juegos, podio (top 3) y tabla de ranking (12 filas) que cambian según el juego seleccionado.
- [ ] Con `av_user` presente, `/salon` muestra la fila "TU MEJOR MARCA EN [JUEGO]"; sin usuario, esa fila no aparece.
- [ ] El menú hamburguesa del Nav funciona en viewport mobile (abre/cierra panel lateral con los mismos links).
- [ ] La estética visual (colores neón, tipografías retro, efectos CRT/scanline, animaciones) coincide con `references/templates/Arcade Vault.html` al comparar lado a lado.
- [ ] Ninguna pantalla incluye lógica de juego real, llamadas a red, ni lectura de `av_scores` en las tablas de ranking.

## Decisiones tomadas y descartadas

- **Rutas de archivo App Router en vez de hash-routing.** El template usa un único componente `App` que interpreta `location.hash` como JSON. Se descartó replicar esto porque no es idiomático en Next.js App Router y rompería SSR/back-forward nativo del navegador. Se adoptaron rutas reales (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`).

- **CSS portado casi literal en vez de reconstruir en Tailwind.** Se descartó traducir las 950 líneas de `styles.css` a utilidades Tailwind por el riesgo de desviación visual y el costo de tiempo, priorizando fidelidad exacta al template. Tailwind queda disponible para uso futuro pero no se usa para portar este diseño.

- **Reemplazo de Geist por las fuentes del template.** Se descartó mantener Geist porque no encaja con la identidad visual retro-arcade que define al producto; se prioriza coherencia estética sobre conservar el starter.

- **Datos mock portados sin cambios.** Se descartó inventar un catálogo de juegos nuevo; se mantienen los 8 juegos, categorías y generador de puntuaciones exactamente como en `data.jsx`, para no introducir contenido no validado por el usuario.

- **Auth mock funcional (localStorage) en vez de estático.** Se descartó un formulario puramente decorativo porque el Nav necesita reflejar estado de sesión en las 5 pantallas (varios criterios de aceptación dependen de esto); no hay validación de credenciales ni backend.

- **Simulación completa del Reproductor en vez de una sola vista estática.** Se descartó mostrar un único frame fijo del reproductor porque el template define varios estados visuales relevantes (jugando, pausado, game over) que forman parte del "diseño" a portar, aunque no exista un juego real detrás.

- **`av_scores` no se lee en ninguna tabla de ranking.** Se descartó mezclar puntuaciones guardadas por el usuario con los datos `seededScores`, para no construir lógica de ranking real en un spec que es explícitamente solo visual. Queda como candidato para un spec futuro.

- **Contador de créditos estático.** Confirmado como puramente decorativo ("CRÉDITOS · 03" fijo), sin sistema de economía.

- **`app/page.tsx` se reemplaza por completo.** Se descarta convivir con el contenido starter de create-next-app; la Biblioteca es la única home.

## Riesgos identificados

- **Hidratación con `localStorage`.** El Nav, Auth, Reproductor y Salón de la Fama dependen de `localStorage["av_user"]`/`av_scores`, que no existe en el servidor. Leerlo directamente durante el render (como hace el template) puede causar mismatch de hidratación en Next.js. Mitigación: leer el valor dentro de `useEffect`/al montar el componente cliente, no durante el render inicial.

- **Conflicto entre CSS portado y Tailwind.** Portar `styles.css` casi literal junto a las directivas de Tailwind v4 puede generar choques de especificidad o reseteos duplicados (Tailwind también trae su propio reset). Mitigación: revisar visualmente cada pantalla tras portar el CSS y ajustar el orden de imports si aparecen conflictos.

- **Next.js 16 con comportamiento distinto al conocido.** Según `AGENTS.md`, esta versión tiene cambios de ruptura respecto a versiones previas. Aunque este spec no toca middleware/proxy ni Cache Components directamente, `next/font/google` y el manejo de rutas dinámicas (`/juegos/[id]`) deben verificarse contra `node_modules/next/dist/docs/` antes de implementar, por si hay cambios de API no evidentes desde el conocimiento previo del modelo.
