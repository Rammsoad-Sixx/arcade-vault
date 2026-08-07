# Estado de soporte táctil por juego

> Mantenido automáticamente por el subagente `mobile-porter`. No se edita a mano
> fuera de ese subagente — se reescribe entero en cada corrida.
>
> Última actualización: 2026-08-07 (corrida sobre `ranaria`).
>
> Alcance: solo juegos con motor jugable real bajo `components/games/engine/`
> (hoy 4: `asteroides`, `caida`, `bloque-buster`, `ranaria`). Los juegos
> placeholder del catálogo (`serpentina`, `gloton`, `invasores`, `duelo-pixel`,
> `rocas`) no tienen motor real todavía — no hay teclado/mouse que portar a
> touch, así que no aparecen en esta tabla hasta que se les corra `/port-game`.

| id | Juego | Motor real | Veredicto | Hallazgos abiertos (resumen) |
|---|---|---|---|---|
| asteroides | ASTEROIDES | Sí | Sin revisar | `mobile-porter` no corrió todavía sobre este juego. Ya tiene soporte táctil implementado por spec 08 (D-pad izq/der/arriba + botón DISPARAR), pendiente de auditoría formal de código. |
| caida | CAÍDA | Sí | Sin revisar | `mobile-porter` no corrió todavía sobre este juego. Ya tiene soporte táctil implementado por spec 08 (D-pad + auto-repeat en izq/der/abajo + botón CAER), pendiente de auditoría formal de código. |
| bloque-buster | BLOQUE BUSTER | Sí | Sin revisar | `mobile-porter` no corrió todavía sobre este juego. Ya tiene soporte táctil implementado por spec 08 (arrastre directo sobre el canvas), pendiente de auditoría formal de código. |
| ranaria | RANARIA | Sí | Sin soporte táctil | El juego (motor recién portado, controlado por flechas/WASD vía `keydown`) no tiene ningún control táctil: `FroggerEngine` no expone ningún método público equivalente a `pressVirtualKey`, y `FroggerGame.tsx` no usa `<TouchControls>` ni `useIsMobileViewport()`. Injugable hoy en viewport móvil (≤840px). Esperado: su spec de port (`specs/game-jam/frogger/01-frogger-core.md`) declaró explícitamente que el soporte táctil se audita después, vía este mismo subagente. |

## Cómo leer esta tabla

- **Sin revisar**: el juego tiene motor real jugable, pero `mobile-porter` todavía no le dedicó una corrida de auditoría — no implica que esté mal, solo que no hay veredicto de código todavía.
- **Sin soporte táctil**: auditoría de código ya corrida, y el/los inputs core del juego no tienen ningún camino táctil funcional — el juego no es jugable en touch.
- **Completo / Parcial**: se usan cuando una corrida encuentra que el soporte táctil existe total o parcialmente. Ver `mobile-porter/memory.md` para el detalle completo de hallazgos, archivos y severidad de cada corrida.
- **Bloqueado: sin motor real**: categoría reservada para juegos placeholder señalados explícitamente como objetivo de una corrida — no aparecen en esta tabla salvo que eso ocurra.

Para pedir la próxima auditoría, invocar `mobile-porter` nombrando el juego objetivo (p. ej. "revisá el mobile de asteroides").
