# Patrón de referencia para portar un juego al catálogo

Este archivo es la referencia que el skill `/port-game` consulta al diseñar el spec. Documenta el contrato **ya validado** por `specs/04-juego-asteroides.md` (motor + integración React) y `specs/05-leaderboard-y-tabla-juegos.md` (leaderboard en Supabase), y las diferencias observadas entre los juegos de `references/started-games/`. **No es texto para copiar literalmente en el spec** — es la forma que el skill debe respetar y adaptar al juego concreto que se está portando.

---

## Contrato del engine (`components/games/engine/<juego>-engine.ts`)

Una clase `<Nombre>Engine` que envuelve, casi 1:1, las clases/funciones del `game.js` original:

- Constructor: `(canvas: HTMLCanvasElement, callbacks: <Nombre>EngineCallbacks)`. Obtiene `ctx = canvas.getContext("2d")`.
- Métodos públicos: `start()`, `pause()`, `resume()`, `reset()`, `forceGameOver()`, `destroy()`.
- `start()` agrega los listeners de input y arranca el loop (`requestAnimationFrame`).
- `pause()`/`resume()` congelan/reanudan **solo `update()`**; `draw()` sigue corriendo siempre — así el overlay "EN PAUSA" del sitio muestra el juego congelado detrás, en vez de en blanco. El loop de `requestAnimationFrame` **nunca se cancela** en pausa.
- `destroy()` remueve listeners, cancela el frame pendiente, y es **idempotente** (seguro de llamar más de una vez) — protege contra el doble-montaje de React Strict Mode.
- Flag interno `destroyed` que corta cualquier callback disparado después de la destrucción (evita `setState` sobre componente desmontado).
- `reset()` reinicia todo el estado interno (score, entidades, nivel, etc.) sin recrear el engine.
- `forceGameOver()` dispara `onGameOver(score)` inmediatamente, igual que si el jugador hubiera perdido.
- Los globals module-scope del `game.js` original (posición de nave, arrays de entidades, score, etc.) pasan a ser **propiedades de instancia** de la clase.
- Cualquier `ctx` que el original usaba como global pasa a recibirse como parámetro en los métodos `draw(ctx)` internos, o se usa `this.ctx`.

## Contrato del wrapper React (`components/games/<Nombre>Game.tsx`)

```tsx
"use client";
const XxxGame = forwardRef<XxxGameHandle, XxxGameProps>(function XxxGame(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<XxxEngine | null>(null);

  useImperativeHandle(ref, () => ({
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    reset: () => engineRef.current?.reset(),
    forceGameOver: () => engineRef.current?.forceGameOver(),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new XxxEngine(canvas, { ...callbacks });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", height: "100%" }} />;
});
```

El canvas mantiene su resolución interna fija (atributos `width`/`height`) pero escala fluido dentro de `.crt-screen` vía `style`. Si el juego original usa más de un canvas (p. ej. Tetris con tablero + preview de siguiente pieza), el wrapper expone ambos `<canvas>` con sus propios refs, y el engine recibe ambos.

## Callbacks: universales vs. opcionales

- **Universales, todo juego los tiene:** `onScoreChange(score: number)`, `onGameOver(finalScore: number)`.
- **Opcionales, dependen del juego:** `onLivesChange(lives: number)` (solo si el juego tiene vidas — Tetris no las tiene), `onLevelChange(level: number)` (solo si el juego tiene progresión de nivel), y cualquier otro contador propio del juego (p. ej. `onLinesChange(lines: number)` para Tetris).
- El spec debe declarar **exactamente** los callbacks que aplican al juego que se está portando — no copiar los 4 de Asteroides por inercia.

## HUD: siempre vía callback, nunca dibujado

La barra `.player-hud` del sitio es la única fuente visible de score/vidas/nivel. Cualquier forma en que el original mostraba esos datos se elimina y se reemplaza por el callback correspondiente:

- Si el original dibujaba HUD en el canvas (`drawHUD()`, caso Asteroids y Arkanoid) → se elimina esa función por completo.
- Si el original actualizaba HUD vía DOM (`updateHUD()` con `textContent`, caso Tetris) → se elimina esa función y se reemplaza directamente por los callbacks (la traducción es casi mecánica, sin necesidad de "quitar dibujo del canvas").

## Entrada en `GAMES` (`lib/games-data.ts`)

```ts
{
  id: string;       // no se modifica el tipo Game
  title: string;
  short: string;
  long: string;
  cat: GameCategory; // "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"
  cover: string;     // "cover-<id>"
  color: GameColor;  // "cyan" | "magenta" | "green" | "yellow"
  best: number;
  plays: string;
}
```

**Decisión obligatoria por juego:** ¿el `id` reusa un placeholder ya existente en el catálogo (p. ej. `caida` si se porta Tetris, `bloque-buster` si se porta Arkanoid), o se crea un `id` nuevo? Spec 04 sentó el precedente: aunque `asteroides` es temáticamente casi idéntico a `rocas` (ya existente), el usuario decidió mantenerlos como entradas de catálogo **distintas** porque las consideró conceptualmente separadas. El skill debe preguntar esto explícitamente, mostrando este precedente, y no asumir ninguna de las dos opciones.

## CSS de portada (`app/globals.css`)

Patrón de tres capas para `.cover-<id>`:

```css
.cover-<id> { background: radial-gradient(...); }
.cover-<id>::after {
  content: "";
  position: absolute; inset: 0;
  background: /* varios radial-gradient(...) simulando textura */;
  filter: drop-shadow(0 0 6px rgba(...));
}
.cover-<id>::before {
  content: "<carácter Unicode>";
  position: absolute; left: ...; top: ...;
  color: var(--<color>);
  text-shadow: 0 0 10px var(--<color>);
}
```

Nunca reusar la clase de portada de otro juego, aunque el tema visual sea similar (mismo precedente que `asteroides` vs `rocas`).

## Integración en `app/juegos/[id]/jugar/page.tsx`

Rama condicional `id === "<id>"` que reemplaza el `<div className="game-arena">` placeholder por el wrapper React dentro de `.crt-screen`:

- El `useEffect` de score simulado (incremento automático de los juegos placeholder) se desactiva agregando la condición del juego real a sus dependencias.
- PAUSA/REANUDAR llaman `ref.current?.pause()`/`resume()`.
- FIN llama `ref.current?.forceGameOver()`.
- "JUGAR DE NUEVO" del modal llama `ref.current?.reset()`.
- "GUARDAR PUNTUACIÓN" ya es genérico (ver siguiente sección) — no cambia.
- "SALIR" navega a `/juegos/<id>` (sin cambios respecto al patrón existente).

## Leaderboard: ya es genérico, no requiere código nuevo

`lib/scores.ts` (`getTopScores(gameId, limit)`) y `app/juegos/[id]/jugar/actions.ts` (`saveScore(gameId, name, score)`, vía `createAdminClient` con service role — bypasea RLS server-side) funcionan para **cualquier** `gameId` sin modificaciones. Lo único pendiente por juego nuevo:

- **Insertar la fila del juego en la tabla `games` de Supabase** (vía `mcp__supabase__apply_migration`, `insert into games (...) values (...)`), porque `scores.game_id` tiene una FK `references games(id)`. Sin esta fila, cualquier intento de guardar puntuación falla por violación de FK.
- No se toca el esquema de `games`/`scores`, ni las políticas RLS (`select` público, sin `insert`/`update`/`delete` público) — ya están correctas para cualquier juego.

## Matriz de diferencias entre los juegos de referencia

| Aspecto | Asteroids (ya portado) | Tetris | Arkanoid |
|---|---|---|---|
| Entidades | Clases ES6 (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) | Objetos planos + funciones libres, sin clases | Objetos planos (`paddle`, `ball`, `blocks[]`), sin clases |
| Vidas | Sí (`onLivesChange`) | No — game over al colisionar la pieza en el spawn | Sí (`onLivesChange`) |
| Canvas | 1 (800×600) | 2 (`board` 300×600 + `next-canvas` 120×120 para preview) | 1 (800×600) |
| HUD original | Dibujado en canvas (`drawHUD()`) | DOM (`updateHUD()`, `textContent`) | Dibujado en canvas |
| Pausa nativa | No (se agregó recién en el port) | Sí (`togglePause()`, cancela/relanza `requestAnimationFrame` completo) | Sí (`isPaused`), con overlay clickeable de selección de nivel dentro del canvas |
| Input | `keys{}` (held) + `justPressed{}` (edge-trigger, se auto-consume) | Un solo `keydown` con `switch`, sin `keyup`, cada tecla = acción discreta | `keys{}` (2 teclas, held, para el paddle) + mouse (`mousemove` mueve el paddle, `click` para botones del overlay de pausa) |
| Assets externos | Ninguno (dibujo vectorial) | Ninguno (dibujo vectorial) | Spritesheet (imagen) + 2 audios; carga async (`loadSpritesheet(cb)`) antes de arrancar el loop |
| Datos de nivel | Inline en el motor | Inline en el motor | Archivo separado `levels.js` (candidato a `lib/<juego>-levels.ts` en el port, siguiendo el patrón de `lib/games-data.ts`) |

**Regla de convergencia:** independientemente de cómo esté estructurado el original, el port siempre converge al mismo contrato de salida descrito arriba (clase `XxxEngine`, `start/pause/resume/reset/destroy`, loop de `requestAnimationFrame` que nunca se cancela, `pause()` solo detiene `update()`). No copiar la pausa nativa de Tetris (que cancela el loop) ni la de Arkanoid (con overlay clickeable) tal cual — se adaptan a la convención ya asentada, salvo que el usuario pida explícitamente preservar ese comportamiento.

Si el juego de origen trae archivos ruido irrelevantes al port (`.DS_Store`, workflows de `.github/`, comandos de skills propios de esa carpeta de referencia, sus propios `specs/` internos), se ignoran al identificar el archivo principal a portar.
