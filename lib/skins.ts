export type SkinId = "clasico" | "retro" | "neon";

export interface SkinPalette {
  id: SkinId;
  label: string; // texto para la UI, p. ej. "CLÁSICO"
  background: string;
  primary: string; // color principal de entidades (nave, pelota, piezas)
  secondary: string; // color secundario (proyectiles, bloques, UI propia del canvas)
  accent: string; // resaltes puntuales (power-ups, líneas completas, explosiones)
  glow: boolean; // si el engine debe aplicar shadowBlur/glow al dibujar
}

export const SKINS: Record<SkinId, SkinPalette> = {
  clasico: {
    id: "clasico",
    label: "CLÁSICO",
    background: "#000000",
    primary: "#33ff33",
    secondary: "#33ff33",
    accent: "#ffffff",
    glow: false,
  },
  retro: {
    id: "retro",
    label: "RETRO",
    background: "#000000",
    primary: "#55ffff",
    secondary: "#ffff55",
    accent: "#ff55ff",
    glow: false,
  },
  neon: {
    id: "neon",
    label: "NEÓN",
    background: "#0a0a0f",
    primary: "#00f5ff",
    secondary: "#ff006e",
    accent: "#f5ff00",
    glow: true,
  },
};

export const DEFAULT_SKIN: SkinId = "clasico";
