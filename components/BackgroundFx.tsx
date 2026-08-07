"use client";

import { usePathname } from "next/navigation";

/**
 * Fondo decorativo global (grid con perspectiva + noise). Vive en RootLayout,
 * por lo tanto persiste durante toda la partida en /juegos/[id]/jugar,
 * compitiendo por frame budget con el canvas del juego. Mientras se juega,
 * se pausa la animación del grid (misma detección de ruta que Nav.tsx) sin
 * desmontar el nodo, para no reiniciar el keyframe con un salto visible.
 * Ver SPEC 10.
 */
export default function BackgroundFx() {
  const pathname = usePathname();
  const isPlaying = pathname.startsWith("/juegos/") && pathname.endsWith("/jugar");

  return (
    <>
      <div className={"av-bg" + (isPlaying ? " is-playing" : "")} />
      <div className="av-noise" />
    </>
  );
}
