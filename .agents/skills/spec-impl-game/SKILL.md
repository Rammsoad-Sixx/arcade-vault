---
name: spec-impl-game
description: Implementa un spec de juego aprobado (típicamente producido por /port-game o game-jam) igual que /spec-impl — mismas 4 fases, misma fuente — y al terminar la implementación dispara automáticamente skin-designer y luego mobile-porter, en secuencia y nunca en paralelo, sobre el juego que se acaba de portar.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git diff:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de specs de juego + skins + auditoría mobile

Este comando es una **envoltura de `/spec-impl`**, del mismo modo que
`/port-game` es una variante especializada de `/spec`: no reimplementa la
lógica de implementación por su cuenta, lee y sigue la fuente original. La
única diferencia es lo que pasa **después** de terminar de implementar: si
el spec introduce o completa un juego del catálogo, dispara automáticamente
`skin-designer` y después `mobile-porter` sobre ese juego, uno después del
otro.

## Fase 0 — Cargar el comportamiento de /spec-impl

Antes de nada, leé `.agents/skills/spec-impl/SKILL.md` completo. Ese archivo
define las Fases 1 a 4 (identificar el spec, validar que el estado
signifique "Aprobado", crear/cambiar de rama, e implementar paso a paso con
pausas para revisar cada diff). Seguilas exactamente como están escritas
ahí, con `$ARGUMENTS` = lo recibido por este comando. No las repitas de
memoria ni las reinventes — son la misma fuente que usa `/spec-impl`, para
que ambos comandos no puedan desalinearse con el tiempo.

**Única diferencia dentro de esas fases:** al identificar y leer el spec
(Fase 1 de spec-impl), fijate también, en la sección `## Data model` del
spec, si define una entrada nueva o editada de `GAMES` (`lib/games-data.ts`)
— es decir, si este spec agrega un juego nuevo al catálogo o completa un
placeholder existente. Si la encontrás, anotá el `id` de esa entrada; lo
necesitás para la Fase 5.

Si el spec **no** define ninguna entrada de `GAMES` nueva ni editada — no es
un spec de "portar/agregar un juego" — avisá al usuario en una línea que
este spec no tiene un juego asociado, y ejecutá igual las Fases 1 a 4 sin
ningún otro cambio (comportamiento idéntico a `/spec-impl` puro). En ese
caso **no hay Fase 5**: terminá exactamente donde termina `/spec-impl`.

## Fase 5 — Skins + auditoría mobile (automática, solo specs de juego)

Se dispara apenas termina la Fase 4 de spec-impl (el mensaje "✅ All steps of
the plan are implemented"), **sin pedir confirmación aparte** — es el
comportamiento por defecto de este comando, no una sugerencia. No reemplaza
el recordatorio de spec-impl de verificar los criterios de aceptación:
agregalo *después* de esta fase, no en su lugar.

1. Confirmá el `id` de catálogo que anotaste en la Fase 0.
   - Fallback si no lo tenés claro (spec ambiguo, o Fase 0 no lo pudo
     determinar con certeza): corré `git diff main...HEAD -- lib/games-data.ts`
     para ver qué entrada de `GAMES` se agregó o modificó en esta rama, y
     usá ese `id`.
2. Avisá al usuario, en una línea: "Implementación terminada. Ahora ejecuto
   skin-designer y mobile-porter sobre `<id>`, uno después del otro."
3. Lanzá el subagente `skin-designer` con la herramienta Agent, **en primer
   plano** (`run_in_background: false`). En el prompt nombrá el juego
   explícitamente por su `id`/título de catálogo (p. ej. "usa skin-designer
   para el juego `<id>`, aplicá las 3 skins clasico/retro/neon") — nunca lo
   dejes preguntar cuál, vos ya lo sabés por el spec.
4. Esperá el resultado de skin-designer antes de seguir. Relayá al usuario
   un resumen breve: qué archivos tocó, si corrió `npm run lint` sin
   errores, y si quedó algo bloqueado.
5. Recién ahí, lanzá el subagente `mobile-porter`, también en primer plano
   (`run_in_background: false`), con el mismo `id` explícito en el prompt
   ("revisá el mobile de `<id>`") para que audite ese juego puntual sin
   preguntar cuál.
6. Esperá su resultado y relayá al usuario el veredicto tal como lo reporta
   (`Completo` / `Parcial: ...` / `Sin soporte táctil: ...`) y los
   hallazgos, sin resumir de más los que sean `Bloqueante`.
7. Cerrá con el recordatorio original de spec-impl: verificar los criterios
   de aceptación uno por uno, actualizar el estado del spec a "Implemented"
   (o equivalente), y hacer el commit final antes de mergear la rama. Eso
   sigue siendo responsabilidad manual del usuario — ninguno de los dos
   subagentes lo hace por vos.

## Reglas duras

- **Nunca lances skin-designer y mobile-porter en paralelo.** Primero uno,
  esperá su resultado completo, después el otro. El orden (skins primero,
  mobile después) es fijo — no lo invirtás ni lo hagas condicional.
- **Nunca dejes que skin-designer o mobile-porter elijan el juego por su
  cuenta.** Siempre pasales el `id`/nombre explícito en el prompt.
- **Nunca corras la Fase 5 si el spec no es de tipo "juego"** (no agrega ni
  completa una entrada de `GAMES`). En ese caso el comando se comporta
  exactamente igual que `/spec-impl` puro, sin ninguna fase extra.
- **Nunca saltees, reordenes ni reimplementes las Fases 1-4 de spec-impl**
  — este comando las reutiliza tal cual desde su fuente, no mantiene una
  copia propia.
- **Si `skin-designer` o `mobile-porter` reportan un bloqueo o hallazgos
  bloqueantes, no los corrijas vos en este comando.** Quedan para que el
  usuario los pida explícitamente después, igual que en el uso normal de
  esos subagentes.

## Arguments

Igual que `/spec-impl`: `$ARGUMENTS` es el nombre (completo, número o slug)
del spec a implementar. Ver `.agents/skills/spec-impl/SKILL.md` para las
reglas exactas de resolución de nombre y el mensaje de error cuando el
estado no significa "Aprobado".
