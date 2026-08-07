# game-performance-booster — memoria

> Nota de reconciliación: las corridas de `bloque-buster`, `asteroides` y
> `caida` del 2026-08-07 se lanzaron **en paralelo** (3 instancias del
> subagente a la vez, cada una viendo el repo antes de que las otras
> escribieran memoria). Cada una reescribió este archivo completo sin ver el
> resultado de las otras dos, así que se pisaron entre sí — solo sobrevivió
> la versión de la última en terminar (`caida`). Este archivo fue
> reconciliado a mano fusionando las 3 corridas a partir de sus reportes
> finales y de los diffs de código reales (`git diff`), que sí quedaron
> intactos porque cada corrida tocó un archivo de engine distinto. Las
> corridas futuras de este subagente deberían lanzarse secuencialmente, o
> reconciliarse igual que acá, mientras la memoria sea un archivo compartido
> reescrito entero por corrida.

## Estado de performance por juego

| id | Motor real | Patrón shadowBlur | Hallazgos Categoría B abiertos | Estado | Última corrida |
| --- | --- | --- | --- | --- | --- |
| asteroides | Sí | Agrupado por lote | 1) `.filter()`/`.concat()` sobre `bullets`/`particles`/`powerUps`/`asteroids` reasignados incondicionalmente cada frame en `update()`, aun con arrays vacíos — presión de GC menor. 2) Colisión bala↔asteroide O(n·m) (doble `for` anidado), sin partición espacial — informativo, colecciones pequeñas en la práctica. 3) `ctx.save()`/`ctx.restore()` por instancia en `Asteroid.draw()`/`PowerUp.draw()` (necesario para `translate`/`rotate` individual) — hallazgo menor. | Optimizado | 2026-08-07 (corrida 2) |
| bloque-buster | Sí | Agrupado por lote | 1) Redibujo de la grilla de bloques (hasta ~60 en nivel 1) cada frame sin caché offscreen — severidad baja, menor que el caso de Tetris. 2) `this.explosions = this.explosions.filter(...)` reasignado incondicionalmente cada frame en `update()`, aun con array vacío — presión de GC menor. 3) `playSound()` hace `sound.cloneNode()` en cada rebote/rotura de bloque — asignación DOM por evento frecuente. | Optimizado | 2026-08-07 (corrida 1) |
| caida | Sí | Por-entidad (`drawBlock()`, sin cambios) | 1) `drawBlock()` fija `shadowBlur`/`shadowColor` en cada llamada dentro de 4 loops homogéneos (tablero asentado, ghost, pieza activa, preview) — candidato Categoría A evaluado en la corrida 3 y **descartado como no agrupable con garantía visual**: los bloques son casi contiguos (hueco de ~2px entre bloques adyacentes, por el inset de 1px por lado dentro de una celda de 30px) frente a un blur de 8px en skin `neon` — muy por debajo del margen que sí tenía Frogger (huecos 40-120px vs blur 6-8px). Agrupar en 2 pasadas (todos los "main" primero, todas las franjas de highlight después) reordenaría cuándo el halo de un bloque vecino contamina el borde de un bloque contiguo antes de pintar su franja blanca de highlight, con riesgo real (aunque sutil) de diferencia de píxel en skin `neon`. No se aplicó el fix — ver razonamiento completo en el historial. 2) Redibujado completo del tablero (~200 celdas) cada frame sin ninguna capa offscreen/dirty-rect — ya señalado por spec 10 como fuera de su propio alcance, Categoría B, no accionable sin pedido explícito. | Pendiente | 2026-08-07 (corrida 3) |
| ranaria | Sí | Agrupado por lote (según spec 10) | Ninguno abierto según spec 10 (pendiente de confirmación manual del usuario en el Huawei reportado, y de una corrida propia de este subagente sobre `frogger-engine.ts` para confirmarlo de primera mano) | Optimizado (según spec 10, no confirmado todavía por una corrida propia de este subagente) | Nunca (solo referenciado por spec 10) |

## Cómo leer la tabla

- **Motor real:** si el juego tiene `draw()` real bajo `components/games/engine/` (elegible) o es un placeholder de catálogo sin motor (no elegible, no aplica esta tabla).
- **Patrón shadowBlur:** `Por-entidad` = toggle/asignación de `ctx.shadowBlur`/`ctx.shadowColor` dentro de un loop o método por entidad individual (el patrón que causó el lag de Frogger); `Agrupado por lote` = ya refactorizado al patrón de `frogger-engine.ts` (fijado una vez por grupo homogéneo, con reset explícito entre grupos); `N/A` = sin motor real.
- **Estado `Pendiente` no siempre implica "aplicar el mismo fix de Frogger sin más"** — en el caso de `caida`, `Pendiente` refleja que el patrón sigue sin agrupar, pero la corrida 3 concluyó explícitamente que el fix estándar de agrupación no es seguro de aplicar a ciegas ahí por la geometría del tablero (ver nota de la fila e historial). Un futuro intento debería evaluar una estrategia distinta (p. ej. cachear el tablero asentado en un canvas offscreen, que además resolvería el hallazgo de Categoría B de redibujado estático) en vez de forzar el mismo patrón de 2 pasadas de Frogger.

## Historial de corridas

### Corrida 1 — 2026-08-07 — juego objetivo: `bloque-buster` (Arkanoid)

**Cómo se determinó el juego objetivo:** indicado directamente en la invocación del usuario ("Revisá el performance de bloque-buster"), confirmado contra `lib/games-data.ts` y `components/games/engine/bloque-buster-engine.ts` (motor real existente).

**Estado previo:** Pendiente (spec 10 solo documentó, sin auditarlo, que compartía "el mismo patrón de toggle-por-entidad" que los otros engines no tocados).

**Categoría A aplicada:** auditando `draw()` de `bloque-buster-engine.ts` se encontró que los bloques y el paddle/pelota ya fijaban `shadowBlur`/`shadowColor` una vez antes de su loop/grupo (ya bien agrupado). El único caso real era el loop de explosiones (L297-311): antes, `ctx.shadowBlur = palette.glow ? 14 : 0;` se reasignaba dentro de `for (const exp of this.explosions)` en cada iteración — mismo valor cada vez (grupo homogéneo, todas "accent"). Después: hoisteado (junto con `shadowColor`, que ya estaba fuera del loop) antes del loop, con reset explícito a 0 ya presente antes del siguiente grupo (paddle/pelota). Sin cambio de color, offset, orden ni valor de blur.

**Categoría B reportada, sin tocar:**
1. Redibujo de la grilla de bloques (hasta ~60 en nivel 1) cada frame sin caché offscreen — severidad baja, menor que el caso de Tetris.
2. `this.explosions = this.explosions.filter(...)` reasignado incondicionalmente cada frame en `update()`, aun con array vacío — presión de GC menor.
3. `playSound()` hace `sound.cloneNode()` en cada rebote/rotura de bloque — asignación DOM por evento frecuente.

**Resultado de `npm run lint` / `npm run build`:** ambos limpios, sin errores ni warnings nuevos.

**Contrato `pattern.md`:** verificado intacto — `pause()`/`resume()` no tocan `draw()` (el loop sigue llamando `draw()` incondicionalmente), `destroy()` sigue idempotente, ninguna firma pública cambió.

Archivo tocado: `components/games/engine/bloque-buster-engine.ts`.

### Corrida 2 — 2026-08-07 — juego objetivo: `asteroides`

**Cómo se determinó el juego objetivo:** indicado directamente en la invocación del usuario ("Revisá el performance de asteroides"), confirmado contra `lib/games-data.ts` (motor real en `components/games/engine/asteroids-engine.ts`, distinto del placeholder `rocas`).

**Estado previo:** Pendiente — primera corrida sobre este engine; spec 10 lo había documentado como fuera de su propio alcance ("comparte el mismo patrón de toggle-por-entidad que Frogger") sin tocarlo.

**Categoría A aplicada:** antes, cada clase de entidad (`Bullet`, `Asteroid`, `PowerUp`, `Particle`) fijaba `ctx.shadowBlur`/`ctx.shadowColor` dentro de su propio `draw()`, invocado una vez por instancia dentro de un `forEach` — un toggle completo por cada bala/asteroide/power-up/partícula individual, cada frame. Después: se removió el toggle de sombra de los 4 métodos `draw()` de entidad; el `draw()` del engine ahora fija `shadowBlur`/`shadowColor` una vez antes de cada `forEach` por grupo homogéneo (partículas → `accent`/blur 6, asteroides → `secondary`/blur 10, power-ups → `accent`/blur 12, balas → `secondary`/blur 8), con reset explícito a `0` entre grupos — mismo patrón que `frogger-engine.ts` (SPEC 10). Verificado que en `Asteroid.draw()`/`PowerUp.draw()` (que usan `ctx.save()`/`translate`/`rotate` por instancia) el hoisting es seguro: cada `save()` individual captura el valor ya fijado por el grupo y `restore()` lo devuelve sin cambios. `Ship.draw()` (instancia única, sin loop) se dejó intacta a propósito, sin redundancia que agrupar. Sin cambios de color, offset, orden de dibujo ni valor de blur.

**Categoría B reportada, sin tocar:**
1. Reasignación incondicional de `.filter()`/`.concat()` sobre `bullets`/`particles`/`powerUps`/`asteroids` cada frame en `update()`, sin chequear antes si hace falta remover algo — presión de GC menor.
2. Colisión bala↔asteroide O(n·m) (doble `for` anidado) — informativo, colecciones pequeñas en la práctica.
3. `ctx.save()`/`ctx.restore()` por instancia en `Asteroid.draw()`/`PowerUp.draw()` (necesario para `translate`/`rotate` individual) — hallazgo menor.

Sin hallazgos de `Audio.cloneNode()`: este engine no usa audio.

**Resultado de `npm run lint` / `npm run build`:** `npm run lint` limpio. `npm run build` compila sin errores TS (única advertencia preexistente y no relacionada: deprecación Node 20 en `@supabase/supabase-js`).

**Contrato `pattern.md`:** verificado intacto — `pause()`/`resume()` siguen afectando solo `update()`, `draw()` nunca se detiene, `destroy()` sigue idempotente, ninguna firma pública cambió.

Archivo tocado: `components/games/engine/asteroids-engine.ts`.

### Corrida 3 — 2026-08-07 — juego objetivo: `caida` (Tetris)

**Cómo se determinó el juego objetivo:** indicado directamente en la invocación del usuario ("Revisá el performance de caida"), confirmado contra `lib/games-data.ts` (`id: "caida"`, título "CAÍDA") y contra `components/games/engine/tetris-engine.ts` (motor real existente).

**Estado previo:** Pendiente (nunca auditado por este subagente; spec 10 solo lo menciona de pasada como "comparte el mismo patrón de toggle-por-entidad de `shadowBlur`" y "redibuja un tablero mayormente estático sin ninguna capa cacheada", sin implementar nada sobre Tetris).

**Categoría A aplicada:** ninguna. Se identificó el candidato (`drawBlock()` en `components/games/engine/tetris-engine.ts`, líneas ~221-240, invocado dentro de 4 loops homogéneos: tablero asentado con `palette.secondary`, ghost con `palette.accent`/alpha 0.25, pieza activa con `palette.primary`, preview en `drawNext()` con `palette.primary`) — cada llamada reasigna `shadowBlur`/`shadowColor` al mismo valor dentro de su loop, calificando en principio como Categoría A ("asignación redundante dentro del loop").

Antes de aplicar el fix (agrupar en 2 pasadas: todas las formas "main" con sombra, luego todas las franjas de highlight sin sombra — el mismo patrón `drawEntityGlow`/`drawEntityDetail` de Frogger), se hizo la verificación de solapamiento que exige el checklist. Resultado: **falla la verificación de seguridad.** Cada bloque se dibuja con `fillRect(x*30+1, y*30+1, 28, 28)` — un inset de 1px por lado dentro de una celda de 30px — por lo que el hueco real entre dos bloques adyacentes del mismo grupo es de solo ~2px, frente a un `shadowBlur` de 8px cuando el skin activo es `neon` (`glow: true`). Esto es lo opuesto al caso de Frogger, donde los huecos mínimos entre entidades (40-120px) superan ampliamente el blur (6-8px). Restructurar a 2 pasadas completas cambiaría el orden relativo entre el halo de un bloque vecino (dibujado en la pasada de "main") y la franja de highlight de un bloque adyacente (dibujada después, en la pasada de "highlight"): en el orden actual (main+highlight intercalados por celda), el highlight de una celda se pinta antes de que el bloque siguiente en el orden de recorrido exista; en 2 pasadas, se pintaría después de que todos los bloques del grupo ya estén dibujados, pudiendo blindarse sobre un borde ya tintado por el halo de un vecino que en el orden original todavía no se había pintado. El efecto sería sutil (mismo tono de color dentro del grupo, franja de highlight de baja opacidad) pero es una diferencia de píxel real y no descartable con confianza, y la regla del checklist es explícita: si el layout no permite garantizar la separación con confianza, no agrupar a ciegas, sino bajarlo a hallazgo reportado. Se decidió no aplicar el fix.

**Categoría B reportada (sin tocar):**
1. `drawBlock()` — mismo hallazgo de arriba, reencuadrado como reporte en vez de fix: el patrón de toggle-por-entidad existe y es candidato natural al mismo tipo de batching que Frogger, pero la geometría (bloques casi contiguos) lo hace inseguro con la técnica de 2 pasadas tal cual. Severidad: baja-media (el costo real del toggle es menor al de Frogger — ~200-210 asignaciones vs ~176 de Frogger en el peor caso, pero comparable). Sugerencia: no forzar el mismo patrón; evaluar en una spec dedicada una estrategia distinta, p. ej. cachear el tablero ya asentado (`board[][]`, que solo cambia cuando se traba una pieza o se limpia una línea, no cada frame) en un canvas offscreen, dibujado una vez por cambio en vez de recalculado cada frame — esto también resolvería el hallazgo 2 de una sola vez.
2. Redibujado completo del tablero (`draw()`, ~200 celdas iteradas cada frame vía `for r/for c`) sin ninguna capa offscreen ni dirty-rects, aunque la gran mayoría del tablero no cambia entre frames (solo cambia cuando una pieza se traba o se limpia una línea). Ya señalado explícitamente por spec 10 como fuera de su propio alcance. Severidad: media (refactor arquitectónico mayor, mismo criterio que spec 10 aplicó sobre sí misma — no se implementa sin pedido explícito). Sugerencia: canvas offscreen para las celdas asentadas del tablero + la grilla de fondo, redibujado solo cuando cambian; encima, cada frame, solo la pieza activa + ghost (que sí cambian cada frame).

**Resultado de `npm run lint` / `npm run build`:** no se modificó ningún archivo de código en esta corrida (el único candidato de Categoría A fue evaluado y descartado, no implementado) — no hizo falta correrlos.

**Nota de contexto:** `asteroides` y `bloque-buster` ya habían sido optimizados en las corridas 1 y 2 (paralelas a esta), no visible para esta corrida en el momento de ejecutarse. `ranaria` está marcado `Optimizado` solo por referencia a spec 10, sin que este subagente lo haya confirmado todavía con una corrida propia.

Archivo de código tocado: ninguno (fix evaluado y descartado).
