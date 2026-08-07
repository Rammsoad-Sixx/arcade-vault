"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type DPadDirection = "up" | "down" | "left" | "right";

export interface TouchActionButton {
  code: string; // el "código de tecla virtual" que simula, ej. "Space"
  label: string; // texto/ícono visible en el botón
}

export interface TouchControlsProps {
  directions: Partial<Record<DPadDirection, string>>;
  actions: TouchActionButton[];
  onPress: (code: string) => void;
  onRelease: (code: string) => void;
  // Direcciones sostenidas que auto-repiten mientras el botón sigue presionado.
  // Opcional — si se omite, usa el mismo default de siempre (["left","right","down"]).
  // Pasar [] desactiva el auto-repeat por completo (ej. Ranaria: un toque = un salto).
  repeatDirections?: DPadDirection[];
}

const DPAD_ORDER: DPadDirection[] = ["up", "down", "left", "right"];
const DPAD_LABELS: Record<DPadDirection, string> = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
};

// Default de direcciones sostenidas que necesitan auto-repeat propio por intervalo
// (el touch no tiene el repeat nativo del teclado del SO). "up" queda afuera a
// propósito: en Caída dispara rotación (una sola vez por toque); en Asteroides
// acelerar ya se mantiene solo mientras la tecla virtual sigue "presionada" (no
// necesita repeat). Cada juego puede sobreescribir esto vía `repeatDirections`.
const DEFAULT_REPEAT_DIRECTIONS: DPadDirection[] = ["left", "right", "down"];
const REPEAT_DELAY_MS = 220;
const REPEAT_INTERVAL_MS = 90;

type Timer = { timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> };

export function TouchControls({
  directions,
  actions,
  onPress,
  onRelease,
  repeatDirections,
}: TouchControlsProps) {
  const timersRef = useRef<Record<string, Timer>>({});
  const repeatSet = new Set<DPadDirection>(repeatDirections ?? DEFAULT_REPEAT_DIRECTIONS);

  const clearTimers = useCallback((code: string) => {
    const t = timersRef.current[code];
    if (!t) return;
    if (t.timeout) clearTimeout(t.timeout);
    if (t.interval) clearInterval(t.interval);
    delete timersRef.current[code];
  }, []);

  // Cleanup al desmontar: ningún intervalo de auto-repeat debe seguir corriendo.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const code of Object.keys(timers)) {
        if (timers[code].timeout) clearTimeout(timers[code].timeout);
        if (timers[code].interval) clearInterval(timers[code].interval);
      }
    };
  }, []);

  const handlePress = (code: string, repeat: boolean) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onPress(code);
    if (!repeat) return;
    clearTimers(code);
    timersRef.current[code] = {
      timeout: setTimeout(() => {
        timersRef.current[code] = {
          ...timersRef.current[code],
          interval: setInterval(() => onPress(code), REPEAT_INTERVAL_MS),
        };
      }, REPEAT_DELAY_MS),
    };
  };

  const handleRelease = (code: string) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    clearTimers(code);
    onRelease(code);
  };

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {DPAD_ORDER.map((dir) => {
          const code = directions[dir];
          if (!code) return null;
          return (
            <button
              key={dir}
              type="button"
              className={`touch-dpad-btn touch-dpad-${dir}`}
              aria-label={dir}
              onPointerDown={handlePress(code, repeatSet.has(dir))}
              onPointerUp={handleRelease(code)}
              onPointerLeave={handleRelease(code)}
              onPointerCancel={handleRelease(code)}
            >
              {DPAD_LABELS[dir]}
            </button>
          );
        })}
      </div>
      <div className="touch-actions">
        {actions.map((action) => (
          <button
            key={action.code}
            type="button"
            className="touch-action-btn"
            onPointerDown={handlePress(action.code, false)}
            onPointerUp={handleRelease(action.code)}
            onPointerLeave={handleRelease(action.code)}
            onPointerCancel={handleRelease(action.code)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
