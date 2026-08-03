export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export const EXPLOSION_DURATION = 150;

export const EXPLOSION_FRAMES: Record<string, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

export const SPRITES: {
  paddle: SpriteFrame;
  ball: SpriteFrame;
  blocks: Record<string, SpriteFrame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

let spritesheetImage: HTMLCanvasElement | null = null;
let spritesheetPromise: Promise<void> | null = null;

export function loadSpritesheet(): Promise<void> {
  if (spritesheetImage) return Promise.resolve();
  if (spritesheetPromise) return spritesheetPromise;

  spritesheetPromise = new Promise((resolve, reject) => {
    const rawImg = new Image();
    rawImg.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = rawImg.width;
      offscreen.height = rawImg.height;
      const offscreenCtx = offscreen.getContext("2d");
      if (!offscreenCtx) {
        reject(new Error("Failed to get 2d context for spritesheet"));
        return;
      }
      offscreenCtx.drawImage(rawImg, 0, 0);
      spritesheetImage = offscreen;
      resolve();
    };
    rawImg.onerror = () => reject(new Error("Failed to load spritesheet"));
    rawImg.src = "/games/bloque-buster/spritesheet-breakout.png";
  });

  return spritesheetPromise;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!spritesheetImage) return;
  ctx.drawImage(spritesheetImage, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!spritesheetImage) return;
  const sprite = name.startsWith("block_")
    ? SPRITES.blocks[name.slice(6)]
    : name === "paddle" || name === "ball"
      ? SPRITES[name]
      : undefined;
  if (!sprite) return;
  ctx.drawImage(spritesheetImage, sprite.sx, sprite.sy, sprite.sw, sprite.sh, x, y, w, h);
}
