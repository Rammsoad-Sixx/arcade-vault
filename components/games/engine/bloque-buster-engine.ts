import { BLOQUE_BUSTER_LEVELS } from "@/lib/bloque-buster-levels";
import {
  drawFrame,
  drawSprite,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  loadSpritesheet,
} from "./bloque-buster-sprites";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const PADDLE_W = 81;
const PADDLE_H = 14;
const PADDLE_Y = 560;
const BALL_SIZE = 16;
const LIVES_START = 3;

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
}

export interface BloqueBusterEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

type GameState = "playing" | "over";

export class BloqueBusterEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private callbacks: BloqueBusterEngineCallbacks;

  private paddle: Paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  private ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];

  private score = 0;
  private lives = LIVES_START;
  private level = 1;
  private state: GameState = "playing";

  private keys: Record<string, boolean> = {};

  private bounceSound: HTMLAudioElement;
  private breakSound: HTMLAudioElement;

  private paused = false;
  private destroyed = false;
  private lastTime: number | null = null;
  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: BloqueBusterEngineCallbacks) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.canvas = canvas;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.bounceSound = new Audio("/games/bloque-buster/sounds/ball-bounce.mp3");
    this.breakSound = new Audio("/games/bloque-buster/sounds/break-sound.mp3");
    this.initGame();
  }

  private notify(fn: () => void) {
    if (this.destroyed) return;
    fn();
  }

  private notifyAll() {
    this.notify(() => {
      this.callbacks.onScoreChange(this.score);
      this.callbacks.onLivesChange(this.lives);
      this.callbacks.onLevelChange(this.level);
    });
  }

  private playSound(sound: HTMLAudioElement) {
    const clone = sound.cloneNode() as HTMLAudioElement;
    clone.play().catch(() => {});
  }

  private initPaddle() {
    this.paddle.x = (W - this.paddle.w) / 2;
  }

  private initBall(speed: number) {
    this.ball.x = this.paddle.x + (this.paddle.w - this.ball.w) / 2;
    this.ball.y = this.paddle.y - this.ball.h;
    this.ball.vx = BASE_BALL_VX * speed;
    this.ball.vy = BASE_BALL_VY * speed;
  }

  private loadLevel(n: number) {
    this.level = n;
    const level = BLOQUE_BUSTER_LEVELS[n - 1];
    this.blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    this.explosions = [];
    this.initBall(level.speed);
    this.notify(() => this.callbacks.onLevelChange(this.level));
  }

  private collideAABB(block: Block) {
    return (
      this.ball.x < block.x + block.w &&
      this.ball.x + this.ball.w > block.x &&
      this.ball.y < block.y + block.h &&
      this.ball.y + this.ball.h > block.y
    );
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      this.keys[e.key] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      this.keys[e.key] = false;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    this.paddle.x = Math.max(0, Math.min(W - this.paddle.w, mouseX - this.paddle.w / 2));
  };

  private initGame() {
    this.score = 0;
    this.lives = LIVES_START;
    this.state = "playing";
    this.initPaddle();
    this.loadLevel(1);
  }

  private endGame() {
    if (this.state === "over") return;
    this.state = "over";
    this.notify(() => this.callbacks.onGameOver(this.score));
  }

  private update(dt: number) {
    if (this.state !== "playing") return;

    if (this.keys["ArrowLeft"]) this.paddle.x = Math.max(0, this.paddle.x - PADDLE_SPEED * dt);
    if (this.keys["ArrowRight"]) this.paddle.x = Math.min(W - this.paddle.w, this.paddle.x + PADDLE_SPEED * dt);

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    if (this.ball.x <= 0) {
      this.ball.x = 0;
      this.ball.vx = Math.abs(this.ball.vx);
      this.playSound(this.bounceSound);
    }
    if (this.ball.x + this.ball.w >= W) {
      this.ball.x = W - this.ball.w;
      this.ball.vx = -Math.abs(this.ball.vx);
      this.playSound(this.bounceSound);
    }
    if (this.ball.y <= 0) {
      this.ball.y = 0;
      this.ball.vy = Math.abs(this.ball.vy);
      this.playSound(this.bounceSound);
    }

    if (
      this.ball.vy > 0 &&
      this.ball.x + this.ball.w > this.paddle.x &&
      this.ball.x < this.paddle.x + this.paddle.w &&
      this.ball.y + this.ball.h >= this.paddle.y &&
      this.ball.y + this.ball.h <= this.paddle.y + this.paddle.h + 8
    ) {
      this.ball.y = this.paddle.y - this.ball.h;
      this.ball.vy = -Math.abs(this.ball.vy);
      this.playSound(this.bounceSound);
    }

    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (this.collideAABB(block)) {
        block.alive = false;
        this.explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
        this.score += 10;
        this.notify(() => this.callbacks.onScoreChange(this.score));
        this.ball.vy = -this.ball.vy;
        this.playSound(this.breakSound);
        if (this.blocks.every((b) => !b.alive)) {
          if (this.level < BLOQUE_BUSTER_LEVELS.length) {
            this.loadLevel(this.level + 1);
          } else {
            this.endGame();
          }
        }
        break; // un bloque por frame
      }
    }

    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (this.ball.y > H) {
      this.lives--;
      this.notify(() => this.callbacks.onLivesChange(this.lives));
      if (this.lives <= 0) {
        this.lives = 0;
        this.endGame();
      } else {
        this.initBall(BLOQUE_BUSTER_LEVELS[this.level - 1].speed);
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of this.blocks) {
      if (block.alive) drawSprite(ctx, "block_" + block.color, block.x, block.y, block.w, block.h);
    }

    for (const exp of this.explosions) {
      const frames = EXPLOSION_FRAMES[exp.color];
      const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * frames.length), frames.length - 1);
      drawFrame(ctx, frames[frameIndex], exp.x, exp.y, exp.w, exp.h);
    }

    drawSprite(ctx, "paddle", this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    drawSprite(ctx, "ball", this.ball.x, this.ball.y, this.ball.w, this.ball.h);
  }

  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;
    if (!this.paused) this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  async start() {
    if (this.destroyed || this.rafId !== null) return;
    await loadSpritesheet();
    if (this.destroyed) return;
    this.paused = false;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.notifyAll();
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.destroyed) return;
    this.paused = true;
  }

  resume() {
    if (this.destroyed) return;
    this.paused = false;
  }

  reset() {
    if (this.destroyed) return;
    this.initGame();
    this.paused = false;
    this.notifyAll();
  }

  forceGameOver() {
    if (this.destroyed) return;
    this.endGame();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
  }
}
