# 02 - Home Landing

**Estado:** Implementado
**Dependencias:** 01-mvp-visual
**Fecha:** 2026-07-30

**Objetivo:** Implementar la pantalla Home (landing) del template `references/templates/home-about/` en `/`, moviendo la pantalla Biblioteca (implementada en el spec 01) de `/` a `/biblioteca` y actualizando el Nav y los enlaces internos que dependían de que `/` fuera la Biblioteca.

## Alcance

### Incluye

- **Nueva pantalla Home en `/`** (reemplaza el `app/page.tsx` actual), portando fielmente de `references/templates/home-about/home.jsx`:
  - Hero: eyebrow, título en 3 líneas, subtítulo, CTAs ("EXPLORAR JUEGOS" → `/biblioteca`, "CREAR CUENTA" → `/auth`), siluetas flotantes decorativas (`FloatingSilhouettes`), hint de scroll.
  - Sección "POR QUÉ ARCADE VAULT" — grid de 4 feature cards con íconos pixel.
  - Sección "JUEGOS DISPONIBLES AHORA" — rail de 6 juegos (`GAMES.slice(0, 6)`) con tarjeta mini, enlazando a `/juegos/[id]`; botón "VER TODOS LOS JUEGOS" → `/biblioteca`.
  - Sección STATS — 3 bloques; el conteo de juegos se calcula desde `GAMES.length` (no queda hardcodeado como en el template).
  - Sección "ACTIVIDAD EN VIVO" — ticker de últimas puntuaciones y tabla "Top jugadores · hoy", ambos generados de forma determinista con `PLAYERS`/`seededScores` de `lib/games-data.ts` (sin arrays literales nuevos); botón "VER SALÓN" → `/salon`.
  - Sección PRECIOS — card de plan único + FAQ, botón "EMPEZAR GRATIS" → `/auth`.
  - CTA final — botón "INSERTAR MONEDA" → `/biblioteca`.
  - Animaciones reveal-on-scroll vía `IntersectionObserver` (misma técnica que el template).
- **Mover Biblioteca**: el contenido actual de `app/page.tsx` (hero corto, buscador, chips, grid) se traslada tal cual a `app/biblioteca/page.tsx`, sin cambios de comportamiento.
- **Actualizar Nav** (`components/Nav.tsx`): agregar link "Inicio" → `/`, apuntar "Biblioteca" → `/biblioteca`, ajustar lógica `isActive` para ambas rutas (desktop y panel móvil).
- **Actualizar destinos que asumían `/` como Biblioteca**:
  - `app/auth/page.tsx`: redirect tras login/registro/invitado → `/biblioteca`.
  - `app/juegos/[id]/page.tsx`: botón "VOLVER AL VAULT" → `/biblioteca`.
  - `app/juegos/[id]/jugar/page.tsx`: botón "VOLVER AL VAULT" del modal de Game Over → `/biblioteca`.
- **CSS**: portar a `app/globals.css` únicamente las clases del template ligadas al Home (`home-hero`, `home-silos`, `home-section`, `feature-grid`/`feature-card`, `mini-rail`/`mini-card`, `home-stats`/`stat-block`, `activity-grid`/`ticker`/`top-list`, `pricing-grid`/`price-card`/`pricing-faq`, `home-final`), excluyendo las exclusivas de `about.jsx` (`about-hero`, `contact-*`, `highlight`, `about-divider`, etc.).
- **Nuevo componente** para el rail de juegos (tarjeta mini, distinta del `GameCard` de Biblioteca).

### No incluye

- La pantalla "Acerca de" (`about.jsx`) ni su formulario de contacto — spec futuro.
- Cambios a Detalle, Reproductor, Auth o Salón de la Fama más allá de los redirects/enlaces listados arriba.
- Datos nuevos en `lib/games-data.ts` (juegos, jugadores o categorías adicionales).
- Actividad en tiempo real: el ticker sigue siendo mock determinista, sin websockets ni backend.
- Sistema de precios/pagos real: la sección PRECIOS es informativa; "EMPEZAR GRATIS" solo navega a `/auth`.
- Cambios a la identidad visual ya definida en el spec 01 (colores, tipografías, efectos CRT) — se reutiliza tal cual.

## Modelo de datos

No se agrega persistencia ni tipos nuevos a `lib/games-data.ts`. La sección "Actividad en vivo" del Home deriva sus filas en tiempo de render a partir de `PLAYERS` y `seededScores`, siguiendo el mismo patrón de seed que ya usan `app/juegos/[id]/page.tsx` (`id.length * 17 + 3`) y `app/salon/page.tsx` (`tab.length * 23 + 7`):

- **Ticker "Últimas puntuaciones"** (7 filas): para los primeros 7 juegos de `GAMES`, se toma la fila top de `seededScores(g.id.length * 17 + 3, 1)[0]` y se empareja con `g.title`. El texto "hace N min" se genera con una lista fija de valores crecientes (`["hace 2 min", "hace 5 min", "hace 8 min", ...]`) indexada por posición — es decorativo, no depende de tiempo real.
- **"Top jugadores · hoy"** (5 filas): `seededScores(101, 5)` (seed fijo, no ligado a un juego puntual), usando `rank`, `name`, `score`.

Ambas derivaciones son funciones locales dentro de `app/page.tsx`; no se exportan tipos ni funciones nuevas desde `lib/games-data.ts`.

## Plan de implementación

Cada paso deja la app funcional y compilable (`npm run dev` / `npm run build` sin errores).

1. **Mover Biblioteca.** Crear `app/biblioteca/page.tsx` con el contenido exacto de `app/page.tsx` actual (sin cambios). No borrar `app/page.tsx` todavía en este paso.

2. **Actualizar enlaces que asumían `/` como Biblioteca.** En `app/auth/page.tsx` (ambos `router.push("/")` tras login/registro/invitado), `app/juegos/[id]/page.tsx` (botón "VOLVER AL VAULT") y `app/juegos/[id]/jugar/page.tsx` (botón "VOLVER AL VAULT" del modal Game Over), cambiar el destino a `/biblioteca`.

3. **Actualizar Nav.** En `components/Nav.tsx`, agregar el link "Inicio" apuntando a `/`, cambiar el link "Biblioteca" para apuntar a `/biblioteca`, y ajustar `isActive` para que "Inicio" esté activo solo en `/` y "Biblioteca" en `/biblioteca` + `/juegos/*` (desktop y panel móvil).

4. **Portar CSS del Home.** Agregar a `app/globals.css` las clases de `references/templates/home-about/styles.css` correspondientes a Home: `home-hero`, `home-silos` (+ `s1`..`s8`), `home-hero-inner`, `home-title`, `home-sub`, `home-ctas`, `hero-scroll`, `home-section`, `section-head/title/rule`, `feature-grid`/`feature-card`, `mini-rail`/`mini-card`/`mini-cover`/`mini-meta`, `home-stats`/`stat-block`, `activity-grid`/`activity-card`/`ticker`/`tick-row`/`top-list`/`top-row`, `pricing-grid`/`price-card`/`pricing-faq`/`faq-item`, `home-final`. No portar clases exclusivas de `about.jsx`.

5. **Componente MiniGameCard.** Crear `components/MiniGameCard.tsx` (tarjeta pequeña: portada + título + categoría), a partir del `MiniCard` del template, recibiendo un `Game` y enlazando a `/juegos/[id]` con `<Link>`.

6. **Construir el nuevo Home (`app/page.tsx`).** Reemplazar el contenido actual (ya migrado en el paso 1) por la pantalla Home: hook `useReveal` (IntersectionObserver sobre `.reveal`), `FloatingSilhouettes`, hero con CTAs, sección "POR QUÉ ARCADE VAULT" (`FeatureIcon` + 4 cards), sección "JUEGOS DISPONIBLES AHORA" (`MiniGameCard` × 6 + botón "VER TODOS LOS JUEGOS"), sección STATS (con `GAMES.length` dinámico), sección "ACTIVIDAD EN VIVO" (ticker + top jugadores según el modelo de datos definido), sección PRECIOS (card + FAQ), CTA final.

7. **QA visual y build.** Recorrer `/` en desktop y mobile comparando contra `references/templates/home-about/arcade-vault-standalone.html`, verificar que `/biblioteca` sigue funcionando igual que antes, que los CTAs y el Nav navegan a las rutas correctas, y correr `npm run build` y `npm run lint`.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `app/page.tsx` renderiza la nueva pantalla Home (hero, "POR QUÉ ARCADE VAULT", "JUEGOS DISPONIBLES AHORA", STATS, "ACTIVIDAD EN VIVO", PRECIOS, CTA final); ya no muestra el buscador/grid de la Biblioteca.
- [ ] `app/biblioteca/page.tsx` renderiza exactamente lo que antes mostraba `/` (hero corto, buscador, chips de categoría, grid de 8 juegos), con el mismo comportamiento de filtrado.
- [ ] En el hero del Home, "EXPLORAR JUEGOS" navega a `/biblioteca` y "CREAR CUENTA" navega a `/auth`.
- [ ] La sección "JUEGOS DISPONIBLES AHORA" muestra 6 tarjetas (`GAMES.slice(0, 6)`), cada una enlaza a `/juegos/[id]`; "VER TODOS LOS JUEGOS" navega a `/biblioteca`.
- [ ] La sección STATS muestra el conteo real de juegos (`GAMES.length`, actualmente 8), no el "12+" literal del template.
- [ ] La sección "ACTIVIDAD EN VIVO" muestra 7 filas de ticker y 5 filas de "Top jugadores · hoy", ambas con nombres provenientes de `PLAYERS` (ningún nombre ajeno al resto del sitio); "VER SALÓN" navega a `/salon`.
- [ ] La sección PRECIOS muestra la card de plan único y el FAQ; "EMPEZAR GRATIS" navega a `/auth`.
- [ ] El CTA final ("INSERTAR MONEDA") navega a `/biblioteca`.
- [ ] Las animaciones reveal-on-scroll aplican a todas las secciones marcadas `.reveal` en el Home (aparecen al hacer scroll, no de entrada).
- [ ] El Nav muestra "Inicio" (activo en `/`) y "Biblioteca" (activo en `/biblioteca` y `/juegos/*`), en desktop y en el panel móvil.
- [ ] Tras login, registro o "jugar como invitado" en `/auth`, la redirección lleva a `/biblioteca` (no a `/`).
- [ ] El botón "VOLVER AL VAULT" en Detalle de juego y en el modal de Game Over del Reproductor navega a `/biblioteca` (no a `/`).
- [ ] La estética visual del Home (colores neón, tipografías retro, animaciones) coincide con `references/templates/home-about/arcade-vault-standalone.html` al comparar lado a lado, en desktop y mobile.

## Decisiones tomadas y descartadas

- **Biblioteca se mueve a `/biblioteca` en vez de a `/games`.** El usuario propuso inicialmente `/games`; se descartó a favor de `/biblioteca` para mantener consistencia con el resto de rutas del sitio, todas en español (`/juegos/[id]`, `/salon`, `/auth`).

- **About queda fuera de este spec.** Aunque `references/templates/home-about/` incluye `about.jsx`, se limita el alcance a Home para mantener el spec enfocado en una sola pantalla nueva; About se implementará en un spec posterior.

- **Actividad en vivo derivada de `PLAYERS`/`seededScores` en vez de portar los arrays literales del template.** Se descartó introducir un set de nombres nuevo (NEONFOX, PX_KAI, etc. tal como aparecen literalmente en el template) porque ya existe `PLAYERS` usado consistentemente en Detalle y Salón de la Fama; usar los mismos nombres evita que el Home muestre jugadores que no existen en ningún otro lado del sitio.

- **Stat de juegos calculado (`GAMES.length`) en vez de literal "12+".** Se descartó portar el texto fijo del template porque no coincide con el catálogo real de 8 juegos definido en el spec 01; se prioriza que el dato no quede desactualizado si el catálogo crece.

- **Redirects y botones "VOLVER AL VAULT" actualizados a `/biblioteca`.** Se descartó dejarlos apuntando a `/` porque, tras este spec, `/` deja de significar "catálogo de juegos" y pasa a ser la landing de marketing; mantener el comportamiento original (volver al catálogo) requiere actualizar estos tres puntos ya implementados en el spec 01.

- **Nav actualizado en este mismo spec.** Se descartó posponerlo a un spec aparte porque sin el link "Inicio" no habría forma de navegar a la nueva Home desde dentro del sitio, y es consecuencia directa de mover Biblioteca de ruta.

- **Solo se portan al CSS global las clases del Home, no las de About.** Se descartó portar `styles.css` completo de una vez para no introducir CSS sin uso (dead code) hasta que exista un spec que implemente About.

- **CSS portado casi literal, no reconstruido en Tailwind.** Mismo criterio que el spec 01: se prioriza fidelidad visual exacta sobre migrar a utilidades Tailwind.

## Riesgos identificados

- **Colisión de nombres de clase con Tailwind o utilidades existentes.** Al portar las clases del Home (`home-section`, `stat-block`, etc.) a `app/globals.css`, existe riesgo de que alguna choque en especificidad con clases ya usadas en otras pantallas o con el reset de Tailwind. Mitigación: revisar visualmente Biblioteca, Detalle, Reproductor, Auth y Salón tras el cambio, no solo el Home nuevo.

- **Enlaces rotos si se olvida algún punto que asumía `/` como Biblioteca.** Además de los tres lugares identificados (Auth, Detalle, Reproductor), podría existir algún otro `href="/"` o `router.push("/")` no detectado. Mitigación: en el paso de QA, hacer un grep final de `"/"` como destino de navegación antes de dar el spec por terminado.
