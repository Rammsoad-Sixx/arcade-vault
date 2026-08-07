"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getServerSnapshot() {
  return false;
}

/**
 * SSR-safe: arranca en `false` en el server y se actualiza al montar
 * vía `matchMedia`, re-evaluando en cada resize del viewport.
 * Mismo breakpoint que ya usa `.av-nav` para el menú hamburguesa (840px).
 */
export function useIsMobileViewport(breakpoint = 840): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
    getServerSnapshot
  );
}
