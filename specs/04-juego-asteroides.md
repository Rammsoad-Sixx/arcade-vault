# SPEC 04 — Juego Asteroides jugable

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-03
> **Objective:** Agregar "Asteroides" como noveno juego del catálogo, portando el motor de juego real de `references/started-games/02-asteroids/game.js` a un componente React que reemplaza el Reproductor simulado únicamente para `id === "asteroides"`.

## Scope

**In:**

- Nueva entrada en `GAMES` (`lib/games-data.ts`): `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `cover: "cover-asteroides"`, con `short`/`long`/`color`/`best`/`plays` redactados en el mismo tono retro-arcade que el resto del catálogo.
- Nueva clase CSS `.cover-asteroides` en `app/globals.css` (variante propia del estilo espacial, distinta de `.cover-rocas`).
- Puerto del motor de `references/started-games/02-asteroids/game.js` a un componente cliente de React (p. ej. `components/games/AsteroidsGame.tsx`), refactorizando los globals del archivo original en un módulo/clase que recibe una `ref` de canvas y expone controles imperativos (`pause`, `resume`, `reset`, `destroy`) y callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`).
- Rama condicional en `app/juegos/[id]/jugar/page.tsx`: si `id === "asteroides"` renderiza `<AsteroidsGame />`; para cualquier otro `id` seguirá el Reproductor simulado del spec 01, sin cambios.
- Canvas de 800×600 embebido dentro de `.crt-screen`, reemplazando los `<div className="game-arena">` placeholder solo para este juego.
- Barra HUD del sitio (`player-hud`: Jugador/Puntuación/Vidas/Nivel) como única fuente visible de esos datos, sincronizada en vivo vía los callbacks del motor; se elimina el `drawHUD()` que dibuja SCORE/NIVEL/vidas directamente en el canvas original (el canvas solo dibuja nave, asteroides, balas, partículas y power-up).
- Botón **PAUSA**/**REANUDAR** congela y reanuda el loop de actualización del motor (el render se mantiene).
- Botón **FIN** fuerza game over inmediato con el score actual, igual que quedarse sin vidas.
- Modal de fin de partida reutilizado tal cual: input de iniciales + "GUARDAR PUNTUACIÓN" escribe en `localStorage["av_scores"]` con `game: "asteroides"`; "JUGAR DE NUEVO" resetea el motor completo (score, vidas, nivel, asteroides, power-ups) sin recargar la página; "VOLVER AL VAULT" navega a `/biblioteca`.
- Botón **SALIR** navega a `/juegos/asteroides` y detiene/limpia el loop y los listeners de teclado del motor.
- Port fiel de las mecánicas del original: movimiento/rotación/propulsión de nave, envolvimiento toroidal, disparo, división de asteroides en fragmentos, partículas de explosión, power-up de triple disparo, progresión de niveles, vidas con parpadeo de invencibilidad.
- Controles de teclado (`←` `→` `↑` `Espacio`), con `preventDefault` en esas teclas mientras el juego está montado para evitar scroll de página.

**Out of scope (for future specs):**

- Controles táctiles/móviles para este juego.
- Lectura de `av_scores` real en la tabla "MEJORES PUNTUACIONES" del Detalle o en el Salón de la Fama para `asteroides` — siguen usando `seededScores` mock, igual que los otros 8 juegos.
- Cualquier cambio a la entrada `rocas` existente en el catálogo o a su Reproductor simulado.
- Sonido/audio.
- Un mecanismo genérico de "juego real conectable" para futuros juegos — esta rama condicional cubre únicamente `asteroides`.

## Data model

### Nueva entrada en `GAMES` (`lib/games-data.ts`)

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Nave, rocas y disparos: el clásico arcade, jugable de verdad.",
  long: "Pilotea una nave triangular a través de un campo de asteroides que envuelve los bordes de la pantalla. Dispara para fragmentar rocas grandes en medianas y pequeñas, esquiva colisiones y sobrevive oleada tras oleada. Recoge el power-up de triple disparo cuando aparezca.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 62450,
  plays: "2.1K",
}
```

No se modifica el tipo `Game` ni ningún otro campo de `lib/games-data.ts`.

### Interfaz del componente del motor (`components/games/AsteroidsGame.tsx`)

```ts
interface AsteroidsGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}
```

`AsteroidsGame` es un `forwardRef` que expone `AsteroidsGameHandle` vía `useImperativeHandle`, para que `app/juegos/[id]/jugar/page.tsx` controle PAUSA/REANUDAR/FIN/JUGAR DE NUEVO desde los botones existentes del sitio.

### Persistencia reutilizada

No se crea ningún esquema nuevo. Reutiliza `localStorage["av_scores"]` y la interfaz `SavedScore` ya definida en `app/juegos/[id]/jugar/page.tsx` (`{ game, score, name, at }`); para partidas de Asteroides, `game` será el string `"asteroides"`.

## Implementation plan

1. **Catálogo y portada.** Agregar la entrada `asteroides` a `GAMES` en `lib/games-data.ts` y la clase `.cover-asteroides` en `app/globals.css`. Test manual: la tarjeta "ASTEROIDES" aparece en Biblioteca y su Detalle/Reproductor funcionan con el flujo simulado existente (sin motor real todavía).

2. **Motor del juego como clase standalone.** Crear `components/games/engine/asteroids-engine.ts`, portando 1:1 las clases y funciones de `references/started-games/02-asteroids/game.js` (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, `update`, `draw`) dentro de una clase `AsteroidsEngine` cuyo constructor recibe el `canvas` y un objeto de callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`). Sin integración con React todavía; no se importa en ninguna pantalla.

3. **Loop, input y callbacks.** Implementar `start()`/`pause()`/`resume()`/`reset()`/`destroy()` en `AsteroidsEngine`: `start()` agrega los listeners de teclado (`keydown`/`keyup` con `preventDefault` en flechas y espacio) y arranca el `requestAnimationFrame`; `pause()`/`resume()` detienen/reanudan solo el `update()` (el `draw()` sigue corriendo); `destroy()` remueve listeners y cancela el frame pendiente. Se elimina `drawHUD()`; en su lugar, cada cambio de score/vidas/nivel dispara el callback correspondiente, y perder la última vida o llamar a un nuevo método `forceGameOver()` dispara `onGameOver(score)`.

4. **Componente React `AsteroidsGame`.** Crear `components/games/AsteroidsGame.tsx`: client component con `forwardRef<AsteroidsGameHandle, AsteroidsGameProps>` que renderiza un `<canvas width={800} height={600}>`, instancia `AsteroidsEngine` en un `useEffect` (llamando `start()` al montar y `destroy()` al desmontar), y expone `pause`/`resume`/`reset`/`forceGameOver` vía `useImperativeHandle`.

5. **Integración en el Reproductor.** En `app/juegos/[id]/jugar/page.tsx`, agregar la rama `id === "asteroides"`: renderizar `<AsteroidsGame ref={...} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={...} />` dentro de `.crt-screen`, en vez de los `<div className="game-arena">` placeholder. Conectar PAUSA/REANUDAR a `ref.pause()`/`ref.resume()`, FIN a `ref.forceGameOver()`, y "JUGAR DE NUEVO" del modal a `ref.reset()` en vez del `restart()` simulado actual. El resto del flujo (modal de game over, guardado en `av_scores`, SALIR) se reutiliza sin cambios.

6. **QA manual y build.** Jugar una partida completa (subir de nivel, recoger el power-up de triple disparo, perder las 3 vidas, ver el modal de game over, guardar puntuación, "JUGAR DE NUEVO", "SALIR" a mitad de partida verificando que no quede un loop corriendo en segundo plano), confirmar cero errores en consola, y correr `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] La tarjeta "ASTEROIDES" aparece en la Biblioteca, filtra correctamente bajo el chip "SHOOTER" y su portada (`.cover-asteroides`) se distingue visualmente de la de "ROCAS".
- [ ] `/juegos/asteroides` muestra portada, descripción, stat-strip y tabla "MEJORES PUNTUACIONES" (mock `seededScores`, 10 filas), igual que los otros 8 juegos.
- [ ] `/juegos/asteroides/jugar` renderiza el canvas del juego real dentro del marco `.crt-screen`; los otros 7 juegos (incluido `rocas`) siguen mostrando el Reproductor simulado sin cambios.
- [ ] La barra HUD del sitio (Jugador/Puntuación/Vidas/Nivel) refleja en vivo el estado real del juego (score sube al destruir asteroides, vidas bajan al chocar, nivel sube al limpiar el campo); el canvas no dibuja texto de score/nivel/vidas propio.
- [ ] Los controles `←` `→` `↑` `Espacio` mueven, rotan, propulsan y disparan la nave; ninguna de esas teclas hace scroll de la página mientras el juego está montado.
- [ ] Los asteroides grandes se dividen en medianos y estos en pequeños al ser destruidos por una bala; los pequeños desaparecen sin dividirse.
- [ ] El power-up de triple disparo aparece tras destruir asteroides, y al recogerlo la nave dispara 3 balas en abanico durante su duración.
- [ ] Al perder las 3 vidas se abre el modal de fin de partida con la puntuación final; "GUARDAR PUNTUACIÓN" escribe una entrada `{ game: "asteroides", score, name, at }` en `localStorage["av_scores"]` y muestra el toast "PUNTUACIÓN GUARDADA_".
- [ ] El botón PAUSA congela el movimiento de nave/asteroides/balas (el render sigue visible) y muestra el overlay "EN PAUSA"; REANUDAR continúa la partida exactamente donde quedó.
- [ ] El botón FIN abre el modal de fin de partida inmediatamente con el score actual, sin esperar a perder las 3 vidas.
- [ ] "JUGAR DE NUEVO" en el modal reinicia score, vidas, nivel y campo de asteroides sin recargar la página.
- [ ] "SALIR" navega a `/juegos/asteroides` y detiene el loop del juego (verificable en que no sigue corriendo en segundo plano ni genera errores al volver a entrar).
- [ ] "VOLVER AL VAULT" desde el modal de game over navega a `/biblioteca`.

## Decisiones tomadas y descartadas

- **Sí:** "Asteroides" es un juego nuevo e independiente (`id: "asteroides"`) en vez de reutilizar el `id: "rocas"` existente. El usuario aclaró explícitamente que, aunque temáticamente similar, es una entrada de catálogo distinta; `rocas` no se toca.

- **No:** mecanismo genérico de "juego real conectable" para futuros juegos. Se descartó por sobre-ingeniería para un único caso de uso hoy; se puede generalizar cuando exista un segundo juego real que lo justifique.

- **Sí:** la barra HUD del sitio (`player-hud`) es la única fuente visible de score/vidas/nivel; el motor la notifica vía callbacks en vez de dibujar su propio HUD en el canvas. Decidido explícitamente por el usuario ("el canvas debe notificar a React"), evita duplicar información y mantiene consistencia visual con los otros 7 juegos.

- **No:** mantener el `drawHUD()` original dibujado sobre el canvas. Quedaría redundante con la barra del sitio.

- **Sí:** canvas embebido dentro del marco `.crt-screen` del sitio, en vez de standalone con fondo negro puro como en la demo original. Prioriza consistencia visual del catálogo sobre fidelidad exacta al HTML de referencia.

- **Sí:** PAUSA congela solo `update()` (el `draw()` sigue corriendo) y FIN fuerza game over inmediato. El juego original no tiene estos conceptos; se mapean a los botones ya existentes del Reproductor del sitio en vez de rediseñar esa UI.

- **Sí:** nueva clase `.cover-asteroides` en vez de reutilizar `.cover-rocas`. Evita que dos tarjetas casi idénticas convivan en la grilla de Biblioteca.

- **No:** leer `av_scores` real en las tablas "MEJORES PUNTUACIONES" de Detalle o Salón de la Fama para `asteroides`. Mantiene la decisión ya tomada en el spec 01 para todo el catálogo; cambiarla implicaría tocar 2 pantallas ya implementadas, fuera del alcance de "portar el juego".

- **Sí:** power-up de triple disparo portado con fidelidad completa. Es parte del diseño de referencia; no se recorta en esta primera versión.

- **No:** controles táctiles/móviles en este spec. El original solo soporta teclado; agregarlos amplía el alcance sin haber sido solicitado.

- **Sí:** el motor se refactoriza como clase (`AsteroidsEngine`) en vez de mantener el estilo de variables globales module-scope del `game.js` original. Los globals del archivo de referencia no son seguros en React (múltiples montajes, Strict Mode, necesidad de limpiar al desmontar); una clase con estado encapsulado permite instanciar y destruir de forma controlada.

- **Sí:** dependencia declarada solo de SPEC 01 (reutiliza `GAMES`, rutas `/juegos/[id]/jugar` y el Reproductor). No depende de SPEC 02 (Home) ni SPEC 03 (Supabase) — ninguno de los dos se toca ni se necesita.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El canvas tiene resolución interna fija (800×600) pero `.crt-screen` es fluido (`aspect-ratio: 4/3`, ancho variable según viewport) — un canvas sin estilos se vería con el tamaño fijo del atributo, desbordando o dejando espacio en blanco dentro del marco. | El `<canvas width={800} height={600}>` mantiene esos atributos como resolución interna del buffer de dibujo, pero se le aplica `style={{ width: "100%", height: "100%" }}` para que escale fluido dentro de `.crt-screen`, igual que hace el resto del contenido del Reproductor. |
| React monta los efectos dos veces en desarrollo (Strict Mode), pudiendo instanciar `AsteroidsEngine` dos veces y duplicar listeners de teclado o loops de `requestAnimationFrame`.                                                                              | El `useEffect` de `AsteroidsGame` siempre limpia con `destroy()` antes de un nuevo `start()`; `destroy()` es idempotente (seguro de llamar más de una vez) y cancela el frame pendiente y remueve listeners.                                                                      |
| Un callback (`onScoreChange`, `onGameOver`, etc.) podría dispararse desde un frame de animación en vuelo justo cuando el componente ya se desmontó, causando `setState` sobre un componente desmontado.                                                         | `destroy()` cancela el `requestAnimationFrame` pendiente y marca un flag interno que corta cualquier callback posterior a la destrucción.                                                                                                                                         |

## Lo que **no** está en este spec

- Controles táctiles/móviles para Asteroides.
- Lectura de `av_scores` real en las tablas de Detalle o Salón de la Fama para `asteroides` (siguen usando `seededScores` mock).
- Cualquier cambio al juego `rocas` existente o a su Reproductor simulado.
- Sonido/audio.
- Un mecanismo genérico de "juego real conectable" para futuros juegos del catálogo.

Cada uno de estos, si se implementa, va en su propio spec.
