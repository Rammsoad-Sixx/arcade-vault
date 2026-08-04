# Memoria de game-planner

Este archivo es la memoria persistente interna del subagente `game-planner`
(`.claude/agents/game-planner.md`). Como el subagente arranca en frío en cada
invocación, este documento es su única forma de recordar qué juegos ya
sugirió, con qué estado quedaron y por qué — para no repetir propuestas ya
hechas y poder evolucionar sugerencias anteriores en vez de reabrirlas desde
cero.

El resumen curado y legible para lectura humana directa vive en
`references/games-references.md` (se reescribe entero cada corrida). Este
archivo, en cambio, es el detalle completo que el propio agente usa para
razonar: no lo pienses como documentación para vos, sino como el estado
interno del agente.

**Regla de uso (para el propio agente):** leé este archivo completo al
iniciar, en el orden descrito en `.claude/agents/game-planner.md`. Al terminar
cada corrida, actualizá la tabla "Estado actual de candidatos" si corresponde
y agregá una entrada nueva al final de "Historial de corridas" reescribiendo
el archivo completo — nunca borres ni reescribas entradas de historial ya
escritas, solo agregá.

**Estados válidos por candidato:** `Sugerido`, `Aceptado`, `Rechazado`,
`Portado`.

---

## Estado actual de candidatos

Tabla resumen, mutable — refleja el estado más reciente conocido de cada
candidato que se haya sugerido alguna vez. El detalle y la justificación de
cada sugerencia vive en el historial de abajo; esta tabla es solo un índice
rápido.

| Candidato | Origen | Categoría | Estado | Última mención |
|---|---|---|---|---|
| `duelo-pixel` | placeholder | VERSUS | Sugerido | Entrada 2 (2026-08-04) |
| `serpentina` | placeholder | ARCADE | Sugerido | Entrada 2 (2026-08-04) |
| `invasores` | placeholder | SHOOTER | Sugerido | Entrada 2 (2026-08-04) |
| `ranaria` | placeholder | ARCADE | Sugerido | Entrada 2 (2026-08-04) |
| `rocas` | placeholder | SHOOTER | Sugerido | Entrada 2 (2026-08-04) |
| `gloton` | placeholder | ARCADE | Sugerido | Entrada 2 (2026-08-04) |
| `gemas` (Columns) | propuesta nueva | PUZZLE | Sugerido | Entrada 2 (2026-08-04) |
| `disco-hielo` (air hockey) | propuesta nueva | VERSUS | Sugerido | Entrada 2 (2026-08-04) |
| `nocaut` (boxeo 1v1) | propuesta nueva | VERSUS | Sugerido | Entrada 2 (2026-08-04) |
| `cascada` (Klax) | propuesta nueva | PUZZLE | Sugerido | Entrada 2 (2026-08-04) |
| `cazavirus` (Dr. Mario) | propuesta nueva | PUZZLE | Sugerido | Entrada 2 (2026-08-04) |
| `justa-alada` (Joust) | propuesta nueva | ARCADE | Sugerido | Entrada 2 (2026-08-04) |
| `custodia-orbital` (Missile Command) | propuesta nueva | SHOOTER | Sugerido | Entrada 2 (2026-08-04) |
| `fortaleza` (Warlords) | propuesta nueva | VERSUS | Sugerido | Entrada 2 (2026-08-04) |
| `blindados` (Combat) | propuesta nueva | VERSUS | Sugerido | Entrada 2 (2026-08-04) |
| `burbujas` (Puzzle Bobble) | propuesta nueva | PUZZLE | Sugerido | Entrada 2 (2026-08-04) |
| `tunelero` (Dig Dug) | propuesta nueva | ARCADE | Sugerido | Entrada 2 (2026-08-04) |
| `barriles` (Donkey Kong) | propuesta nueva | ARCADE | Sugerido | Entrada 2 (2026-08-04) |
| `rescate-estelar` (Defender) | propuesta nueva | SHOOTER | Sugerido | Entrada 2 (2026-08-04) |
| `excavador` (Boulder Dash) | propuesta nueva | PUZZLE | Sugerido | Entrada 2 (2026-08-04) |

---

## Historial de corridas

Log append-only, una entrada por invocación del subagente que produjo una
recomendación (no hace falta registrar corridas abortadas antes de generar
salida). Orden cronológico ascendente — la entrada más reciente queda al
final del archivo.

## Entrada 1 — 2026-08-04

**Disparador/contexto:** El usuario pidió explícitamente "usa game-planner" y
una recomendación de próximo juego. Primera corrida del subagente (memoria
vacía hasta este momento).

**Estado del catálogo al momento de la corrida:** `lib/games-data.ts` tiene
**9** entradas en `GAMES` (no 8 — la nota de `CLAUDE.md` e
`implemented-games/implemented-games.md` que habla de "8 juegos" y lista solo
5 placeholders está desactualizada: omite `rocas`, que también es placeholder
sin motor). 3 juegos con motor real: `asteroides` (SHOOTER),
`caida`/Tetris (PUZZLE), `bloque-buster`/Arkanoid (ARCADE). 6 placeholders sin
motor real: `serpentina` (ARCADE), `gloton` (ARCADE), `invasores` (SHOOTER),
`rocas` (SHOOTER), `ranaria` (ARCADE), `duelo-pixel` (VERSUS). Cobertura real
por categoría: ARCADE 1, PUZZLE 1, SHOOTER 1, **VERSUS 0**. Specs 04/06/07
están todas en `Status: Implementado`, ninguna en curso. `references/started-games/`
solo tiene `02-asteroids`, `03-tetris`, `04-arkanoid` — las tres ya portadas,
ninguna carpeta libre; cualquier candidato de esta corrida se portaría desde
cero (sin `game.js` de referencia).

### Candidatos sugeridos

1. **`duelo-pixel`** — Estado: Sugerido
   - Origen: completar placeholder `duelo-pixel`
   - Categoría: VERSUS
   - Complejidad de motor estimada: Baja — Pong clásico: 1 canvas, entidades
     como objetos planos (2 paletas + 1 pelota), CPU simple (sigue el eje Y de
     la pelota), sin assets externos, pausa/HUD triviales de adaptar al
     contrato de `pattern.md`.
   - Referencia disponible: No (se portaría desde cero)
   - Justificación: VERSUS es la única categoría con **cero** juegos reales
     hoy, y `duelo-pixel` es a la vez el placeholder de menor complejidad de
     motor de todo el catálogo restante. Máxima diversidad de categoría al
     mínimo costo técnico — mejor combinación posible ahora mismo.
   - Relación con entradas previas: nueva (primera corrida)

2. **`serpentina`** — Sugerido
   - Origen: completar placeholder `serpentina`
   - Categoría: ARCADE
   - Complejidad de motor estimada: Baja — grilla discreta, snake como array
     de segmentos, colisión simple contra bordes/cuerpo propio, sin assets.
   - Referencia disponible: No
   - Justificación: segundo candidato por simplicidad técnica; ARCADE ya
     tiene un juego real (`bloque-buster`), así que pesa menos en diversidad
     que `duelo-pixel`, pero sigue siendo "terminar lo empezado" muy barato.
   - Relación con entradas previas: nueva

3. **`invasores`** — Sugerido
   - Origen: completar placeholder `invasores`
   - Categoría: SHOOTER
   - Complejidad de motor estimada: Media — formación de enemigos que se
     mueve en bloque y acelera a medida que quedan menos, múltiples
     proyectiles simultáneos, dibujo vectorial (sin assets).
   - Referencia disponible: No
   - Justificación: SHOOTER ya tiene `asteroides`, pero la mecánica
     (formación fija descendente vs. campo abierto con física) es lo bastante
     distinta como para no ser redundante.
   - Relación con entradas previas: nueva

4. **`ranaria`** — Sugerido
   - Origen: completar placeholder `ranaria`
   - Categoría: ARCADE
   - Complejidad de motor estimada: Media — múltiples carriles con objetos y
     velocidades distintas (autos, troncos), lógica de "ir montado sobre el
     tronco", temporizador de nivel.
   - Referencia disponible: No
   - Justificación: cubre ARCADE con una mecánica bien distinta de
     `bloque-buster` y `serpentina`; algo más compleja que `serpentina` por la
     variedad de carriles a simular.
   - Relación con entradas previas: nueva

5. **`rocas`** — Sugerido (prioridad baja)
   - Origen: completar placeholder `rocas`
   - Categoría: SHOOTER
   - Complejidad de motor estimada: Media — conceptualmente el mismo motor
     que `asteroides` (nave + rocas que se fragmentan), reimplementado con
     datos propios de catálogo.
   - Referencia disponible: No (la carpeta `02-asteroids` ya se consumió al
     portar `asteroides`)
   - Justificación: temáticamente casi idéntico a `asteroides`, ya portado.
     Hay precedente de spec 04 de mantenerlos como entradas de catálogo
     distintas por decisión del usuario, pero sigue siendo la propuesta más
     redundante del lote y SHOOTER ya tiene cobertura real. Se rankea bajo por
     duplicación temática, no por dificultad técnica.
   - Relación con entradas previas: nueva

6. **`gloton`** — Sugerido (prioridad baja)
   - Origen: completar placeholder `gloton`
   - Categoría: ARCADE
   - Complejidad de motor estimada: Alta — laberinto fijo, 4 fantasmas con IA
     de persecución/evasión, estado de "píldora" que invierte los roles,
     colisiones en grilla más finas que Snake.
   - Referencia disponible: No
   - Justificación: la mecánica más costosa del lote (IA de enemigos +
     laberinto), sin ninguna referencia disponible; ARCADE ya tiene cobertura
     real. Último en el ranking pese a ser un juego atractivo, por costo de
     motor.
   - Relación con entradas previas: nueva

**Trabajo en curso detectado:** ninguno — specs 04 (Asteroides), 06 (Tetris) y
07 (Arkanoid) están todas en `Status: Implementado`. No hay specs en
`Draft`/`In review`/`Approved` pendientes.

**Próximo paso sugerido:** Para avanzar con `duelo-pixel`, correr
`/port-game duelo-pixel` manualmente.

## Entrada 2 — 2026-08-04

**Disparador/contexto:** El usuario pidió expandir la recomendación a 20
juegos, en la misma conversación que la Entrada 1. Pidió explícitamente
paralelizar el trabajo ("lanza a la gente en paralelo"). Como el subagente
`game-planner` no está registrado como `subagent_type` invocable en esta
sesión (falla `Agent type 'game-planner' not found`), la corrida se ejecutó
manualmente siguiendo estas instrucciones al pie de la letra, apoyándose en 4
sub-agentes de exploración de solo lectura en paralelo (uno por bloque:
placeholders existentes, nuevas propuestas PUZZLE, nuevas propuestas
ARCADE/SHOOTER, nuevas propuestas VERSUS) para acelerar el brainstorming.
La síntesis final y la única escritura a estos dos archivos de memoria las
hizo el orquestador (no los 4 sub-agentes), precisamente para evitar
condición de carrera por escrituras concurrentes sobre el mismo archivo
(cada corrida de `game-planner` reescribe el archivo entero con `Write`, así
que 20 escrituras paralelas se habrían pisado entre sí).

**Estado del catálogo al momento de la corrida:** sin cambios respecto a la
Entrada 1 (mismo día, ningún port nuevo desde entonces): 9 juegos en
`lib/games-data.ts`, 3 con motor real (`asteroides` SHOOTER, `caida` PUZZLE,
`bloque-buster` ARCADE), 6 placeholders (`serpentina`, `gloton`, `invasores`,
`rocas`, `ranaria`, `duelo-pixel`). Cobertura real por categoría sin cambios:
ARCADE 1, PUZZLE 1, SHOOTER 1, VERSUS 0. Dato nuevo relevante para esta
corrida: **PUZZLE es la única categoría sin ningún placeholder adicional**
más allá del juego ya portado (`caida`) — a diferencia de ARCADE/SHOOTER/VERSUS
que ya tienen backlog propio en el catálogo.

**Nota sobre el alcance de esta corrida:** pedir 20 candidatos obliga a
superar largamente los 6 placeholders existentes (única fuente "legítima" por
defecto según las reglas de este agente) y proponer 14 juegos completamente
nuevos fuera del catálogo. Se marca explícitamente cada uno como "propuesta
nueva" — ninguno tiene entrada todavía en `lib/games-data.ts` ni carpeta en
`references/started-games/`, así que todos se portarían desde cero y
requieren que el usuario apruebe agregarlos al catálogo (vía `/spec` o
`/port-game`) antes de poder correr `/port-game` sobre ellos.

### Candidatos sugeridos (ranking completo de 20, más al menos recomendado)

**Tier 1 — completar placeholders ya comprometidos en el catálogo** (mismo
ranking y justificación que la Entrada 1, sin cambios):

1. `duelo-pixel` (Pong) — VERSUS — Baja — placeholder — ver Entrada 1
2. `serpentina` (Snake) — ARCADE — Baja — placeholder — ver Entrada 1
3. `invasores` (Space Invaders) — SHOOTER — Media — placeholder — ver Entrada 1
4. `ranaria` (Frogger) — ARCADE — Media-Alta — placeholder — ver Entrada 1
5. `rocas` (clon de Asteroids) — SHOOTER — Baja-Media, alta redundancia con
   `asteroides` — placeholder — ver Entrada 1
6. `gloton` (Pac-Man-like) — ARCADE — Alta — placeholder — ver Entrada 1

**Tier 2 — propuestas nuevas fuera del catálogo**, ordenadas por complejidad
de motor ascendente y valor de diversidad de categoría (PUZZLE priorizado por
no tener ningún placeholder propio hoy; VERSUS priorizado por tener 0 juegos
reales):

7. **`gemas`** (Columns) — PUZZLE — Baja/Media — grid + gravedad + match de
   color, arquitectura casi idéntica a `caida`. Sin referencia. Llena el
   backlog de PUZZLE (hoy inexistente más allá de `caida`).
8. **`disco-hielo`** (air hockey) — VERSUS — Baja — variante 2D de Pong,
   colisión círculo-círculo, motor casi tan simple como `duelo-pixel`. Sin
   referencia. Segundo VERSUS, mecánica de movimiento libre en vez de 1D.
9. **`nocaut`** (boxeo 1v1) — VERSUS — Baja-Media — máquina de estados de
   combate (ataque/bloqueo/cooldown), sin física de partículas. Sin
   referencia. Único "fighting" del lote.
10. **`cascada`** (Klax) — PUZZLE — Media — cinta transportadora + paddle +
    match en 3 direcciones. Sin referencia.
11. **`cazavirus`** (Dr. Mario) — PUZZLE — Media — grid tipo `caida` con
    cápsulas de 2 colores y condición de victoria (virus = 0). Sin
    referencia.
12. **`justa-alada`** (Joust) — ARCADE — Media — física de vuelo con
    gravedad/aleteo, combate por altura relativa. Sin referencia.
13. **`custodia-orbital`** (Missile Command) — SHOOTER — Media — apuntado por
    cursor, colisión por radio de explosión, sin nave móvil. Sin referencia.
14. **`fortaleza`** (Warlords) — VERSUS — Media — breakout multijugador
    (hasta 4 palas defendiendo un castillo). Sin referencia.
15. **`blindados`** (Combat, modo tanques) — VERSUS — Media-Alta — tanques
    con rotación libre, proyectiles con rebote, más estado que Pong/Warlords.
    Sin referencia.
16. **`burbujas`** (Puzzle Bobble) — PUZZLE — Media/Alta — grid hexagonal,
    física de puntería, flood-fill para grupos y burbujas colgantes. Sin
    referencia.
17. **`tunelero`** (Dig Dug) — ARCADE — Media-Alta — terreno destructible
    mutable + IA de enemigos con dos modos de movimiento. Sin referencia.
18. **`barriles`** (Donkey Kong) — ARCADE — Alta — física de plataformas,
    barriles rodantes con física propia, múltiples estados de animación. Sin
    referencia.
19. **`rescate-estelar`** (Defender) — SHOOTER — Alta — mundo con scroll
    horizontal más ancho que el viewport, cámara/radar, IA variada, mecánica
    de rescate persistente entre pausas. Sin referencia.
20. **`excavador`** (Boulder Dash) — PUZZLE — Alta — autómata celular por
    tick (rocas/diamantes cayendo), múltiples tipos de tile, enemigos con
    patrón propio. El más costoso del lote completo. Sin referencia.

**Trabajo en curso detectado:** ninguno — sin cambios respecto a la Entrada 1.

**Próximo paso sugerido:** Para avanzar con el candidato #1 (`duelo-pixel`),
correr `/port-game duelo-pixel`. Para cualquiera de los 14 candidatos nuevos
(#7 a #20), el paso previo es que el usuario decida agregarlo formalmente al
catálogo (`/spec` para la entrada en `lib/games-data.ts`, luego `/port-game`
para el motor) — no son placeholders existentes, así que `/port-game` sobre
ellos hoy no tendría entrada de catálogo de la cual partir.
