# Sugerencias de juegos para el catálogo

> Este archivo lo mantiene automáticamente el subagente `game-planner`
> (`.claude/agents/game-planner.md`) — se reescribe entero en cada corrida, no
> lo edites a mano fuera de él. Es un resumen curado del estado **vigente** de
> candidatos, pensado para lectura humana directa; no es un historial. El
> detalle completo de cada corrida (incluyendo corridas pasadas y decisiones
> ya descartadas) vive en `game-planner/memory.md`.

**Última actualización:** 2026-08-04 (Entrada 2 — expansión a 20 candidatos)

**Estados posibles:** `Sugerido` · `Aceptado` · `Rechazado` · `Portado`

**Nota de reconciliación:** el catálogo real (`lib/games-data.ts`) tiene 9
juegos, no 8: además de los 5 placeholders que menciona `CLAUDE.md`
(`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`), también
existe `rocas` (SHOOTER) como placeholder sin motor.

**Nota sobre esta corrida:** el usuario pidió 20 candidatos, muy por encima de
los 6 placeholders existentes. Los primeros 6 de la lista son "terminar lo
empezado" (ya tienen entrada en `lib/games-data.ts`); los 14 restantes son
**propuestas completamente nuevas**, sin entrada de catálogo ni referencia en
`references/started-games/` — necesitan aprobación explícita del usuario
(vía `/spec`) antes de que `/port-game` tenga algo de donde partir.

---

## Tier 1 — completar placeholders existentes (prioridad por defecto)

### 1. `duelo-pixel`
- **Estado:** Sugerido · **Categoría:** VERSUS · **Complejidad:** Baja
- VERSUS es la única categoría con **cero** juegos reales; motor de Pong es
  el más simple del catálogo restante. Máxima diversidad al mínimo costo.

### 2. `serpentina`
- **Estado:** Sugerido · **Categoría:** ARCADE · **Complejidad:** Baja
- Snake clásico, grilla discreta, colisiones simples.

### 3. `invasores`
- **Estado:** Sugerido · **Categoría:** SHOOTER · **Complejidad:** Media
- Space Invaders. Formación fija + contraataque, distinto de `asteroides`.

### 4. `ranaria`
- **Estado:** Sugerido · **Categoría:** ARCADE · **Complejidad:** Media-Alta
- Frogger. Carriles con velocidades/objetos variados, más costoso que Snake.

### 5. `rocas`
- **Estado:** Sugerido (prioridad baja) · **Categoría:** SHOOTER · **Complejidad:** Baja-Media
- Clon casi idéntico de `asteroides` ya portado. Redundancia temática alta.

### 6. `gloton`
- **Estado:** Sugerido (prioridad baja) · **Categoría:** ARCADE · **Complejidad:** Alta
- Pac-Man-like: laberinto + IA de 4 fantasmas. La mecánica más costosa del
  Tier 1.

---

## Tier 2 — propuestas nuevas fuera del catálogo (requieren `/spec` primero)

Ordenadas por complejidad de motor ascendente y valor de diversidad de
categoría (PUZZLE priorizado por no tener backlog propio hoy; VERSUS por
tener 0 juegos reales).

### 7. `gemas` — Columns
- **Categoría:** PUZZLE · **Complejidad:** Baja/Media
- Grid + gravedad + match de color; arquitectura casi idéntica a `caida`.

### 8. `disco-hielo` — Air hockey
- **Categoría:** VERSUS · **Complejidad:** Baja
- Variante 2D de Pong con movimiento libre de disco y paletas.

### 9. `nocaut` — Boxeo 1v1
- **Categoría:** VERSUS · **Complejidad:** Baja-Media
- Máquina de estados de combate (ataque/bloqueo/cooldown); único "fighting".

### 10. `cascada` — Klax
- **Categoría:** PUZZLE · **Complejidad:** Media
- Cinta transportadora + paddle + match en 3 direcciones.

### 11. `cazavirus` — Dr. Mario
- **Categoría:** PUZZLE · **Complejidad:** Media
- Grid tipo `caida`, cápsulas de 2 colores, condición de victoria (virus=0).

### 12. `justa-alada` — Joust
- **Categoría:** ARCADE · **Complejidad:** Media
- Física de vuelo con aleteo, combate por altura relativa.

### 13. `custodia-orbital` — Missile Command
- **Categoría:** SHOOTER · **Complejidad:** Media
- Apuntado por cursor, explosión por radio, sin nave móvil.

### 14. `fortaleza` — Warlords
- **Categoría:** VERSUS · **Complejidad:** Media
- Breakout multijugador, hasta 4 palas defendiendo un castillo.

### 15. `blindados` — Combat (tanques)
- **Categoría:** VERSUS · **Complejidad:** Media-Alta
- Tanques con rotación libre y proyectiles con rebote.

### 16. `burbujas` — Puzzle Bobble
- **Categoría:** PUZZLE · **Complejidad:** Media/Alta
- Grid hexagonal, física de puntería, flood-fill de grupos.

### 17. `tunelero` — Dig Dug
- **Categoría:** ARCADE · **Complejidad:** Media-Alta
- Terreno destructible mutable + IA de enemigos con dos modos de movimiento.

### 18. `barriles` — Donkey Kong
- **Categoría:** ARCADE · **Complejidad:** Alta
- Física de plataformas + barriles rodantes + múltiples animaciones.

### 19. `rescate-estelar` — Defender
- **Categoría:** SHOOTER · **Complejidad:** Alta
- Scroll horizontal amplio, cámara/radar, IA variada, rescate persistente.

### 20. `excavador` — Boulder Dash
- **Categoría:** PUZZLE · **Complejidad:** Alta
- Autómata celular por tick, múltiples tipos de tile. El más costoso del lote.

---

**Trabajo en curso:** ninguno — specs 04, 06 y 07 están todas en estado
Implementado.

**Próximo paso sugerido:** para `duelo-pixel` (#1), correr `/port-game
duelo-pixel` directamente. Para cualquiera del #7 al #20, primero correr
`/spec` para agregar la entrada al catálogo antes de portar el motor.
