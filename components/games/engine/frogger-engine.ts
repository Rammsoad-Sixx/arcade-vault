import { SKINS, DEFAULT_SKIN, type SkinId, type SkinPalette } from "@/lib/skins";

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
export const CANVAS_W = COLS * CELL; // 640
export const CANVAS_H = ROWS * CELL; // 560
const START_COL = Math.floor(COLS / 2); // 8, columna central de la fila de inicio

// Zonas (fila 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const LIVES_START = 3;
const ROUND_TIME_START = 15; // segundos
const JUMP_DURATION = 120; // ms
const GOAL_COUNT = 5;

type Direction = "up" | "down" | "left" | "right";

// Compartido entre el teclado (handleKeyDown) y el D-pad táctil (pressVirtualKey).
const KEY_DIRECTION_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

interface Lane {
  row: number;
  speed: number; // celdas por segundo
  dir: 1 | -1;
  entities: Entity[];
}

interface Entity {
  col: number; // columna fraccional (permite movimiento sub-celda)
  width: number; // en celdas
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  submergeT?: number; // acumulador del ciclo de inmersión (ms)
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
}

export interface FroggerEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onTimeChange: (secondsLeft: number) => void;
  onGameOver: (finalScore: number) => void;
}

/**
 * Construye los 11 carriles del nivel (5 de carretera + 6 de río). Cada nivel
 * escala todas las velocidades un 15% (interés compuesto sobre el nivel 1).
 */
function buildLanes(level: number): Lane[] {
  const speedMul = Math.pow(1.15, level - 1);
  const lanes: Lane[] = [];

  for (let i = 0; i < 5; i++) {
    const row = ROW_ROAD_TOP + i;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const speed = (2.5 + i * 0.9) * speedMul; // 2.5–6.1 celdas/s en nivel 1
    lanes.push({ row, speed, dir, entities: buildRoadEntities(i) });
  }

  for (let j = 0; j < 6; j++) {
    const row = ROW_RIVER_TOP + j;
    const dir: 1 | -1 = j % 2 === 0 ? -1 : 1;
    const speed = (1.5 + j * 0.5) * speedMul; // 1.5–4 celdas/s en nivel 1
    lanes.push({ row, speed, dir, entities: buildRiverEntities(j) });
  }

  return lanes;
}

/** Coches (1–2 celdas) o camiones (3 celdas), con huecos de 2–3 celdas siempre atravesables. */
function buildRoadEntities(laneIndex: number): Entity[] {
  const entities: Entity[] = [];
  const type: "car" | "truck" = laneIndex % 3 === 2 ? "truck" : "car";
  let col = laneIndex * 2 - COLS;
  while (col < COLS + 4) {
    const width = type === "truck" ? 3 : 1 + Math.floor(Math.random() * 2);
    entities.push({ col, width, type });
    const gap = 2 + Math.floor(Math.random() * 2);
    col += width + gap;
  }
  return entities;
}

/** Troncos (2–4 celdas) en carriles pares, grupos de tortugas (2–3) en impares, huecos de 1–2 celdas. */
function buildRiverEntities(laneIndex: number): Entity[] {
  const entities: Entity[] = [];
  const isTurtleLane = laneIndex % 2 === 1;
  let col = laneIndex * 3 - COLS;
  while (col < COLS + 4) {
    if (isTurtleLane) {
      const width = 2 + Math.floor(Math.random() * 2);
      entities.push({ col, width, type: "turtle", submerged: false, submergeT: Math.random() * 3000 });
      const gap = 1 + Math.floor(Math.random() * 2);
      col += width + gap;
    } else {
      const width = 2 + Math.floor(Math.random() * 3);
      entities.push({ col, width, type: "log" });
      const gap = 1 + Math.floor(Math.random() * 2);
      col += width + gap;
    }
  }
  return entities;
}

export class FroggerEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private callbacks: FroggerEngineCallbacks;
  private palette: SkinPalette;

  private lanes: Lane[] = [];
  private goals: boolean[] = new Array(GOAL_COUNT).fill(false);
  private frog: Frog = this.createFrog();
  private pendingDir: Direction | null = null;
  private bestRow = ROW_START;

  private score = 0;
  private lives = LIVES_START;
  private level = 1;
  private timeLeft = ROUND_TIME_START;
  private state: "playing" | "over" = "playing";

  private lastNotifiedScore = -1;
  private lastNotifiedLives = -1;
  private lastNotifiedLevel = -1;
  private lastNotifiedTime = -1;

  private paused = false;
  private destroyed = false;
  private lastTime: number | null = null;
  private rafId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: FroggerEngineCallbacks,
    initialSkin: SkinId = DEFAULT_SKIN,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.canvas = canvas;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.palette = SKINS[initialSkin];
    this.initGame();
  }

  setSkin(skin: SkinId) {
    this.palette = SKINS[skin];
  }

  private createFrog(): Frog {
    return {
      col: START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      fromCol: START_COL,
      fromRow: ROW_START,
      targetCol: START_COL,
      targetRow: ROW_START,
    };
  }

  private initGame() {
    this.lanes = buildLanes(1);
    this.goals = new Array(GOAL_COUNT).fill(false);
    this.frog = this.createFrog();
    this.pendingDir = null;
    this.bestRow = ROW_START;
    this.score = 0;
    this.lives = LIVES_START;
    this.level = 1;
    this.timeLeft = ROUND_TIME_START;
    this.state = "playing";
    this.lastNotifiedScore = -1;
    this.lastNotifiedLives = -1;
    this.lastNotifiedLevel = -1;
    this.lastNotifiedTime = -1;
  }

  // --- Notificaciones a React (solo cuando el valor cambia) ---

  private notify(fn: () => void) {
    if (!this.destroyed) fn();
  }

  private notifyAll() {
    this.notify(() => {
      this.callbacks.onScoreChange(this.score);
      this.callbacks.onLivesChange(this.lives);
      this.callbacks.onLevelChange(this.level);
      this.callbacks.onTimeChange(Math.ceil(this.timeLeft));
    });
    this.lastNotifiedScore = this.score;
    this.lastNotifiedLives = this.lives;
    this.lastNotifiedLevel = this.level;
    this.lastNotifiedTime = Math.ceil(this.timeLeft);
  }

  private setScore(next: number) {
    this.score = next;
    if (this.score !== this.lastNotifiedScore) {
      this.lastNotifiedScore = this.score;
      this.notify(() => this.callbacks.onScoreChange(this.score));
    }
  }

  private setLives(next: number) {
    this.lives = next;
    if (this.lives !== this.lastNotifiedLives) {
      this.lastNotifiedLives = this.lives;
      this.notify(() => this.callbacks.onLivesChange(this.lives));
    }
  }

  private setLevel(next: number) {
    this.level = next;
    if (this.level !== this.lastNotifiedLevel) {
      this.lastNotifiedLevel = this.level;
      this.notify(() => this.callbacks.onLevelChange(this.level));
    }
  }

  private tickTimeNotify() {
    const rounded = Math.ceil(this.timeLeft);
    if (rounded !== this.lastNotifiedTime) {
      this.lastNotifiedTime = rounded;
      this.notify(() => this.callbacks.onTimeChange(rounded));
    }
  }

  // --- Reglas: colisión, soporte, metas, ronda, muerte ---

  private roundTimeForLevel(level: number): number {
    return Math.max(6, ROUND_TIME_START - (level - 1));
  }

  private resetRoundTimer() {
    this.timeLeft = this.roundTimeForLevel(this.level);
    this.tickTimeNotify();
  }

  private resetFrogToStart() {
    this.frog = this.createFrog();
  }

  private collidesCell(col: number, entity: Entity): boolean {
    return col < entity.col + entity.width && col + 1 > entity.col;
  }

  private laneAt(row: number): Lane | undefined {
    return this.lanes.find((l) => l.row === row);
  }

  private isRoadRow(row: number): boolean {
    return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
  }

  private isRiverRow(row: number): boolean {
    return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
  }

  private checkRoadCollision(): boolean {
    const lane = this.laneAt(this.frog.row);
    if (!lane) return false;
    return lane.entities.some((e) => this.collidesCell(this.frog.col, e));
  }

  /** Devuelve el carril que sostiene a la rana (tronco o tortuga visible), o null si no hay soporte. */
  private getSupportLane(): Lane | null {
    const lane = this.laneAt(this.frog.row);
    if (!lane) return null;
    const supported = lane.entities.some(
      (e) => this.collidesCell(this.frog.col, e) && !(e.type === "turtle" && e.submerged),
    );
    return supported ? lane : null;
  }

  private goalIndexForCol(col: number): number {
    const rounded = Math.round(col);
    for (let i = 0; i < GOAL_COUNT; i++) {
      const start = 1 + i * 3;
      if (rounded >= start && rounded <= start + 1) return i;
    }
    return -1;
  }

  private checkGoal() {
    const idx = this.goalIndexForCol(this.frog.col);
    if (idx === -1 || this.goals[idx]) {
      this.killFrog();
      return;
    }
    this.goals[idx] = true;
    this.setScore(this.score + 50 + Math.floor(this.timeLeft) * 10);
    if (this.goals.every((g) => g)) {
      this.setScore(this.score + 200);
      this.completeRound();
    } else {
      this.resetFrogToStart();
      this.resetRoundTimer();
    }
  }

  private completeRound() {
    this.resetFrogToStart();
    this.goals = new Array(GOAL_COUNT).fill(false);
    this.bestRow = ROW_START;
    this.setLevel(this.level + 1);
    this.lanes = buildLanes(this.level);
    this.resetRoundTimer();
  }

  private killFrog() {
    if (this.state === "over") return;
    this.setLives(this.lives - 1);
    if (this.lives <= 0) {
      this.state = "over";
      this.notify(() => this.callbacks.onGameOver(this.score));
      return;
    }
    this.resetFrogToStart();
    this.resetRoundTimer();
  }

  /** Resuelto una sola vez, al completarse el salto que la trae a esta celda. */
  private handleLanding() {
    if (this.frog.row < this.bestRow) {
      this.setScore(this.score + (this.bestRow - this.frog.row) * 10);
      this.bestRow = this.frog.row;
    }
    if (this.frog.row === ROW_GOALS) {
      this.checkGoal();
    }
  }

  private tryStartJump() {
    if (!this.pendingDir) return;
    const dir = this.pendingDir;
    this.pendingDir = null;
    const col = Math.round(this.frog.col);
    const row = this.frog.row;
    let targetCol = col;
    let targetRow = row;
    if (dir === "up") targetRow -= 1;
    else if (dir === "down") targetRow += 1;
    else if (dir === "left") targetCol -= 1;
    else targetCol += 1;
    if (targetCol < 0 || targetCol > COLS - 1 || targetRow < 0 || targetRow > ROWS - 1) return;
    this.frog.animating = true;
    this.frog.animT = 0;
    this.frog.fromCol = col;
    this.frog.fromRow = row;
    this.frog.targetCol = targetCol;
    this.frog.targetRow = targetRow;
  }

  private moveEntities(dt: number) {
    for (const lane of this.lanes) {
      for (const e of lane.entities) {
        e.col += lane.speed * lane.dir * dt;
        if (lane.dir > 0 && e.col > COLS) e.col = -e.width;
        else if (lane.dir < 0 && e.col + e.width < 0) e.col = COLS;

        if (e.type === "turtle") {
          e.submergeT = (e.submergeT ?? 0) + dt * 1000;
          if (!e.submerged && e.submergeT >= 3000) {
            e.submerged = true;
            e.submergeT = 0;
          } else if (e.submerged && e.submergeT >= 1500) {
            e.submerged = false;
            e.submergeT = 0;
          }
        }
      }
    }
  }

  private update(dt: number) {
    if (this.state === "over") return;

    this.moveEntities(dt);

    if (this.frog.animating) {
      this.frog.animT += dt * 1000;
      if (this.frog.animT >= JUMP_DURATION) {
        this.frog.animating = false;
        this.frog.col = this.frog.targetCol;
        this.frog.row = this.frog.targetRow;
        this.handleLanding();
      }
    } else {
      this.tryStartJump();
    }

    if (!this.frog.animating && this.state === "playing") {
      if (this.isRoadRow(this.frog.row)) {
        if (this.checkRoadCollision()) this.killFrog();
      } else if (this.isRiverRow(this.frog.row)) {
        const lane = this.getSupportLane();
        if (!lane) {
          this.killFrog();
        } else {
          this.frog.col += lane.speed * lane.dir * dt;
          if (this.frog.col < 0 || this.frog.col > COLS - 1) this.killFrog();
        }
      }
    }

    if (this.state === "playing") {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.tickTimeNotify();
      if (this.timeLeft <= 0) this.killFrog();
    }
  }

  // --- Dibujo (sin HUD: score/vidas/nivel/tiempo van solo por callback) ---

  // Mapeo semántico de la paleta: la rana (jugador) y las ranas ya salvadas
  // en las bocas de meta usan "primary" (misma entidad, "salvada"); los
  // vehículos de carretera (hostiles) usan "secondary"; los flotadores del
  // río (troncos/tortugas, que sostienen a la rana) usan "accent", igual
  // rol que en asteroides se usa para power-ups/resaltes. Las franjas de
  // terreno (segura/río/carretera/meta) ya no son colores fijos: se pintan
  // como un lavado sutil (alpha bajo) del rol asociado sobre el fondo, para
  // conservar la lectura de zonas sin introducir colores ajenos a la
  // paleta. Detalles puramente estructurales/neutros (ruedas negras, vetas
  // de madera, ojos blancos de la rana) se mantienen fijos en los 3 skins,
  // mismo criterio que el bisel blanco de `tetris-engine.ts`.
  private draw() {
    const ctx = this.ctx;
    const palette = this.palette;
    ctx.shadowBlur = 0;

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.globalAlpha = palette.glow ? 0.18 : 0.1;
    ctx.fillStyle = palette.primary; // zonas seguras: territorio de la rana
    ctx.fillRect(0, ROW_SAFE_MID * CELL, CANVAS_W, CELL);
    ctx.fillRect(0, ROW_START * CELL, CANVAS_W, CELL);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = palette.glow ? 0.16 : 0.09;
    ctx.fillStyle = palette.accent; // río: mismo rol que troncos/tortugas
    ctx.fillRect(0, ROW_RIVER_TOP * CELL, CANVAS_W, (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = palette.glow ? 0.14 : 0.08;
    ctx.fillStyle = palette.secondary; // carretera: mismo rol que coches/camiones
    ctx.fillRect(0, ROW_ROAD_TOP * CELL, CANVAS_W, (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = palette.glow ? 0.26 : 0.16;
    ctx.fillStyle = palette.primary; // bocas destino: hogar de la rana
    ctx.fillRect(0, ROW_GOALS * CELL, CANVAS_W, CELL);
    ctx.restore();

    for (let i = 0; i < GOAL_COUNT; i++) {
      const x = (1 + i * 3) * CELL;
      const y = ROW_GOALS * CELL;
      ctx.fillStyle = palette.background;
      ctx.fillRect(x + 2, y + 2, CELL * 2 - 4, CELL - 4);
      ctx.shadowBlur = palette.glow ? 6 : 0;
      ctx.shadowColor = palette.accent;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, CELL * 2 - 4, CELL - 4);
      ctx.shadowBlur = 0;
      if (this.goals[i]) {
        ctx.shadowBlur = palette.glow ? 8 : 0;
        ctx.shadowColor = palette.primary;
        ctx.fillStyle = palette.primary;
        ctx.beginPath();
        ctx.ellipse(x + CELL, y + CELL / 2, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    for (const lane of this.lanes) {
      for (const e of lane.entities) this.drawEntity(e, lane.row);
    }

    this.drawFrog();
  }

  private drawEntity(e: Entity, row: number) {
    const ctx = this.ctx;
    const palette = this.palette;
    const x = e.col * CELL;
    const y = row * CELL;
    const w = e.width * CELL;

    if (e.type === "car") {
      ctx.shadowBlur = palette.glow ? 8 : 0;
      ctx.shadowColor = palette.secondary;
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; // ruedas: detalle neutro, no identidad
      ctx.beginPath();
      ctx.arc(x + 10, y + CELL - 10, 5, 0, Math.PI * 2);
      ctx.arc(x + w - 10, y + CELL - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "truck") {
      ctx.shadowBlur = palette.glow ? 8 : 0;
      ctx.shadowColor = palette.secondary;
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = palette.secondary; // cabina: mismo color, alpha reducido
      ctx.fillRect(x + 2, y + 6, 14, CELL - 12);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; // ruedas: detalle neutro
      ctx.beginPath();
      ctx.arc(x + 10, y + CELL - 6, 5, 0, Math.PI * 2);
      ctx.arc(x + w - 10, y + CELL - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "log") {
      ctx.shadowBlur = palette.glow ? 8 : 0;
      ctx.shadowColor = palette.accent;
      ctx.fillStyle = palette.accent;
      ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; // vetas de madera: detalle neutro
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let lx = x + 8; lx < x + w - 8; lx += 10) {
        ctx.moveTo(lx, y + 8);
        ctx.lineTo(lx, y + CELL - 8);
      }
      ctx.stroke();
    } else if (e.submerged) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      for (let i = 0; i < e.width; i++) {
        ctx.beginPath();
        ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, CELL / 2 - 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.shadowBlur = palette.glow ? 8 : 0;
      ctx.shadowColor = palette.accent;
      ctx.fillStyle = palette.accent;
      for (let i = 0; i < e.width; i++) {
        ctx.beginPath();
        ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, CELL / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; // caparazón: detalle neutro
      for (let i = 0; i < e.width; i++) {
        ctx.beginPath();
        ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, CELL / 2 - 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawFrog() {
    const ctx = this.ctx;
    const palette = this.palette;
    let x: number;
    let y: number;
    let legOffset = 0;

    if (this.frog.animating) {
      const t = this.frog.animT / JUMP_DURATION;
      const col = this.frog.fromCol + (this.frog.targetCol - this.frog.fromCol) * t;
      const row = this.frog.fromRow + (this.frog.targetRow - this.frog.fromRow) * t;
      x = col * CELL;
      y = row * CELL - Math.sin(t * Math.PI) * 10; // arco de salto
      legOffset = 6;
    } else {
      x = this.frog.col * CELL;
      y = this.frog.row * CELL;
    }

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    ctx.shadowBlur = palette.glow ? 10 : 0;
    ctx.shadowColor = palette.primary;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx - 10 - legOffset, cy + 14);
    ctx.moveTo(cx + 10, cy + 6);
    ctx.lineTo(cx + 10 + legOffset, cy + 14);
    ctx.stroke();

    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff"; // ojos: detalle biológico neutro, no identidad
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 8, 4, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 8, 2, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Loop e input ---

  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;
    if (!this.paused) this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.destroyed) return;
    const dir = KEY_DIRECTION_MAP[e.key];
    if (!dir) return;
    e.preventDefault();
    if (e.repeat) return;
    this.applyDirectionInput(dir);
  };

  /** Gate compartido: solo acepta input mientras la partida está en curso. */
  private applyDirectionInput(dir: Direction) {
    if (this.state !== "playing") return;
    this.pendingDir = dir;
  }

  // --- Contrato público (pattern.md) ---

  /** Equivalente táctil de una pulsación de teclado — edge-triggered, sin release. */
  pressVirtualKey(code: string) {
    if (this.destroyed) return;
    const dir = KEY_DIRECTION_MAP[code];
    if (!dir) return;
    this.applyDirectionInput(dir);
  }

  start() {
    if (this.destroyed || this.rafId !== null) return;
    this.paused = false;
    document.addEventListener("keydown", this.handleKeyDown);
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
    if (this.state === "over") return;
    this.state = "over";
    this.notify(() => this.callbacks.onGameOver(this.score));
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener("keydown", this.handleKeyDown);
  }
}
