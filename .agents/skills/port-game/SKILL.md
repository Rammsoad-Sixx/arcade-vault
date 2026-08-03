---
name: port-game
description: Diseña un spec para portar un juego (desde references/started-games/ o construido desde cero) al catálogo de Arcade Vault con motor jugable real e integración de leaderboard en Supabase. Pre-carga el patrón ya validado en los specs 04 y 05, por lo que pregunta menos y de forma más dirigida que /spec genérico. Úsalo al agregar un nuevo juego jugable a la plataforma.
disable-model-invocation: true
argument-hint: 'nombre del juego o carpeta de referencia (ej. tetris, references/started-games/03-tetris)'
---

# /port-game — Diseñador de specs para portar juegos al catálogo

Este skill es una **variante especializada de `/spec`**, enfocada exclusivamente en el flujo de "portar un juego jugable real al catálogo, con leaderboard en Supabase". Sigue las mismas 4 fases y el mismo `.agents/skills/spec/template.md` que `/spec` — pero ya conoce las respuestas del patrón validado en `specs/04-juego-asteroides.md` y `specs/05-leaderboard-y-tabla-juegos.md`, así que pregunta mucho menos y de forma más dirigida.

**Igual que `/spec`, este skill no escribe código.** Tu trabajo es producir un spec `.md` en `specs/`, en estado `Draft`, listo para que el usuario lo apruebe y luego lo implemente con `/spec-impl`.

## Filosofía

Todo el trabajo de diseño ya se hizo una vez con Asteroides. Repetirlo desde cero para cada juego nuevo (vía `/spec` genérico) desperdicia las preguntas que ya tienen respuesta conocida: cómo se estructura el motor, cómo se conecta a React, cómo se agrega al catálogo, cómo se conecta al leaderboard. Este skill existe para que solo se pregunte lo que **realmente varía por juego**.

Este skill depende directamente del skill `/spec`: **antes de crear el archivo de especificación, siempre leé `/spec` completo** (`.agents/skills/spec/SKILL.md` y `.agents/skills/spec/template.md`, en ese orden) — son la referencia de proceso y de formato que este skill hereda y no reemplaza. `pattern.md` (en esta misma carpeta) es la capa adicional con los defaults y contratos ya establecidos por los specs 04/05, específicos de portar un juego.

## Flujo

Tu respuesta debe estar en el mismo idioma del prompt inicial (español, salvo que el usuario escriba en otro idioma).

### Fase 1 — Contexto

Antes de preguntar nada sobre el juego concreto, y **antes de crear el archivo de especificación**, leé en este orden exacto:

1. `.agents/skills/spec/SKILL.md` completo — el proceso y las hard rules de `/spec`, que este skill hereda tal cual (mismas 4 fases, mismo criterio de "no asumir", mismo procedimiento de guardado). No lo resumas de memoria: leelo siempre, incluso si ya lo leíste en una sesión anterior.
2. `.agents/skills/spec/template.md` completo — la forma exacta de cada sección del documento final (Header, Scope, Data model, Implementation plan, Acceptance criteria, Decisiones, Riesgos). Este skill usa esta misma plantilla; no define una propia.
3. El archivo de memoria del proyecto si existe (probá en orden: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`).
4. `specs/` listado completo, para ver la numeración existente.
5. `specs/04-juego-asteroides.md` y `specs/05-leaderboard-y-tabla-juegos.md` completos (son la referencia obligatoria de este skill; no basta con `pattern.md`, que es un resumen).
6. `pattern.md` (en esta misma carpeta).

Recién con esas seis lecturas hechas, continuá:

7. Determina el origen del juego a portar:
   - Si `$ARGUMENTS` referencia (o parece referenciar) una carpeta de `references/started-games/`, lístala (`ls references/started-games/`) e identifica el archivo principal de juego (`game.js` u equivalente). Ignora archivos ruido irrelevantes al port: `.DS_Store`, workflows de `.github/`, comandos o skills propios de esa carpeta de referencia, sus propios `specs/` internos.
   - Si `$ARGUMENTS` viene vacío, o no matchea ninguna carpeta de `references/started-games/`, pregunta explícitamente: ¿se porta desde una carpeta de referencia (¿cuál?) o se construye desde cero?
8. Revisa `lib/games-data.ts` (`GAMES`) buscando si ya existe un `id` placeholder temáticamente relacionado con el juego a portar (p. ej. `caida` para un juego tipo Tetris, `bloque-buster` para uno tipo Arkanoid). Esto alimenta la primera pregunta de la Fase 2.

Si identificaste una carpeta de referencia, lee su archivo principal de juego para entender: qué entidades usa (clases o funciones/objetos planos), si tiene vidas, cuántos canvases necesita, si dibuja HUD en canvas o en DOM, qué mecanismo de input usa, si depende de assets externos (imágenes/audio) o datos de nivel en archivo separado. Contrasta con la matriz de `pattern.md` — no asumas que se comporta igual que Asteroids.

### Fase 2 — Clarificar (acotada)

A diferencia de `/spec` genérico, la mayoría del patrón ya está resuelta por `pattern.md`. Solo preguntá lo siguiente, en un solo bloque:

1. **Catálogo:** ¿`id` nuevo o reusa un placeholder existente que detectaste en la Fase 1? Mostrá el precedente de spec 04 (Asteroides vs. `rocas`: se mantuvieron como entradas distintas por decisión explícita del usuario) como criterio de referencia — no asumas ninguna de las dos opciones. Además: `title`, `short`, `long`, `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `color` (`cyan`/`magenta`/`green`/`yellow`), `best`, `plays`.
2. **Callbacks de estado:** además de `onScoreChange`/`onGameOver` (universales), ¿este juego tiene vidas (`onLivesChange`)? ¿Nivel (`onLevelChange`)? ¿Algún otro contador propio (p. ej. líneas en un juego tipo Tetris)? No copies los 4 callbacks de Asteroides si no aplican todos.
3. **Particularidades técnicas del origen:** según lo que viste en el `game.js` de referencia (o lo que planea el usuario si es desde cero) — ¿necesita más de un canvas? ¿Assets externos (imágenes/audio) que deban moverse a `public/`? ¿Datos de nivel en un archivo separado (candidato a `lib/<juego>-levels.ts`)?
4. **Confirmación de convención:** si el original tenía pausa nativa o HUD dibujado distinto al patrón ya asentado (ver "Regla de convergencia" en `pattern.md`), confirmá que se adapta a la convención existente (pausa = solo detiene `update()`; HUD = solo vía callbacks) salvo que el usuario pida explícitamente preservar el comportamiento original.

**No preguntes** por lo que `pattern.md` ya resuelve — solo mencionalo de pasada al armar las secciones: contrato del engine (`start/pause/resume/reset/destroy`), contrato del wrapper (`forwardRef`/`useImperativeHandle`), que el leaderboard (`getTopScores`/`saveScore`) ya es genérico y no requiere código nuevo, formato de la clase CSS `.cover-<id>`.

Si después de este bloque surge una ambigüedad real no cubierta arriba, preguntala — pero no reabras temas que `pattern.md` ya cierra.

### Fase 3 — Desarrollar el spec sección por sección

Misma mecánica que `/spec`: mostrás cada sección formateada en markdown, preguntás "¿Esta sección queda así o querés ajustar algo?", y solo avanzás a la siguiente cuando el usuario confirma. Orden y contenido de `template.md`, con estas particularidades propias de este skill:

1. **Header:** `Depends on: SPEC 04, SPEC 05` (reusa el patrón de motor y el de leaderboard).
2. **Scope:** "In" cubre catálogo + CSS + motor + wrapper + rama condicional + fila en `games` de Supabase. "Out of scope" repite explícitamente lo que spec 04/05 ya dejaron fuera y sigue fuera (controles táctiles, lectura de scores fuera de Detalle/Salón, sonido si no aplica, mecanismo genérico de "juego conectable" más allá de este juego puntual — salvo que el usuario pida generalizarlo).
3. **Data model:** interfaces `<Nombre>GameProps`/`<Nombre>GameHandle`, calcadas del molde `AsteroidsGameProps`/`AsteroidsGameHandle` en `pattern.md`, con solo los callbacks confirmados en Fase 2. Incluí la entrada nueva de `GAMES` con valores reales (no placeholders).
4. **Implementation plan:** esqueleto por defecto, ajustable según lo confirmado en Fase 2:
   1. Catálogo (`lib/games-data.ts`) y CSS de portada (`.cover-<id>` en `app/globals.css`).
   2. Motor como clase standalone (`components/games/engine/<juego>-engine.ts`), portando el `game.js` original 1:1.
   3. Loop, input y callbacks — implementar `start/pause/resume/reset/forceGameOver/destroy`; eliminar cualquier HUD nativo (canvas o DOM) y reemplazar por callbacks.
   4. Wrapper React (`components/games/<Nombre>Game.tsx`) con `forwardRef`/`useImperativeHandle`.
   5. Integración en `app/juegos/[id]/jugar/page.tsx` (rama condicional `id === "<id>"`).
   6. Migración Supabase: insertar la fila del juego en la tabla `games` (FK requerida por `scores.game_id`) vía `mcp__supabase__apply_migration`.
   7. QA manual y build: partida completa, guardado de puntuación verificado en Detalle y Salón, `npm run build` y `npm run lint` sin errores.
5. **Acceptance criteria:** checklist booleano, siguiendo el estilo de spec 04 (build/lint, tarjeta en Biblioteca, canvas real en el Reproductor, HUD del sitio sincronizado, mecánicas propias del juego, guardado de puntuación real vía Server Action, PAUSA/FIN/JUGAR DE NUEVO/SALIR).
6. **Decisiones tomadas y descartadas:** incluí siempre, con su razón, la decisión de `id` nuevo vs. placeholder existente (mismo patrón que "Asteroides vs. rocas"), y cualquier decisión de convergencia hacia la convención ya asentada (pausa, HUD) si el original difería.
7. **Riesgos:** solo si aplican — reusá los ya identificados en spec 04 (doble montaje de Strict Mode, callbacks post-desmontaje, canvas fluido dentro de `.crt-screen`) si el juego los comparte, y agregá los propios de este juego si su origen trae assets async, múltiples canvases, etc.

### Fase 4 — Guardar el spec

Idéntica a `/spec`:

1. Determiná el número secuencial siguiente en `specs/`.
2. Generá un slug corto desde el objetivo (p. ej. `juego-tetris` o similar).
3. Confirmá el nombre de archivo propuesto con el usuario antes de escribir.
4. Creá `specs/NN-slug.md` con todas las secciones aprobadas, estado `Draft`.
5. Revisá `specs/.spec-config.yml` — si ya existe (spec 04/05 ya lo habrían creado), no lo toques. Si no existiera, seguí el mismo procedimiento de seed que `/spec` (ver su `SKILL.md`).
6. Confirmá al usuario: ruta del archivo creado, recordatorio de que está en `Draft`, y que el siguiente paso es correr `/spec-impl NN-slug` una vez aprobado.
7. **Parate ahí.** No propongas implementar, escribir código, ni tomar ninguna acción más allá de esa confirmación.

## Hard rules

- **Nunca escribas código durante este comando.** Solo el archivo `.md` del spec al final.
- **Nunca propongas implementar el spec después de guardarlo.** Tu trabajo termina cuando el archivo está escrito.
- **Nunca asumas decisiones que el usuario no confirmó** — ni siquiera las que `pattern.md` sugiere como default; siempre las mencionás explícitamente antes de darlas por buenas.
- **Nunca generes el spec completo en una sola respuesta.** Sección por sección, con confirmación.
- **Si el usuario quiere saltar la Fase 2**, recordale: "Las preguntas ahora ahorran horas después. ¿Seguro que querés saltarlas?". Si insiste, respetá la decisión pero dejala registrada en la sección de decisiones del spec.

## Arguments

- Si se invocó `/port-game tetris` o `/port-game references/started-games/03-tetris`, usalo como pista del juego/carpeta de origen, pero confirmá con el usuario antes de asumir cuál es.
- Si se invocó `/port-game` sin argumentos, empezá preguntando el origen del juego (carpeta de referencia o desde cero) como parte de la Fase 1.
