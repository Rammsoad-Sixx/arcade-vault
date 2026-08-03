const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NEXT_BLOCK = 30;
const NEXT_CANVAS_SIZE = 120;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const PREVENTED_CODES = new Set(["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"]);

type Board = number[][];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

export interface TetrisEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onLinesChange: (lines: number) => void;
  onGameOver: (finalScore: number) => void;
}

type GameState = "playing" | "gameover";

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private nextCtx: CanvasRenderingContext2D;
  private callbacks: TetrisEngineCallbacks;

  private board: Board = [];
  private current: Piece;
  private next: Piece;

  private score = 0;
  private lines = 0;
  private level = 1;
  private dropInterval = 1000;
  private dropAccum = 0;
  private state: GameState = "playing";

  private paused = false;
  private destroyed = false;
  private lastTime: number | null = null;
  private rafId: number | null = null;

  constructor(
    boardCanvas: HTMLCanvasElement,
    nextCanvas: HTMLCanvasElement,
    callbacks: TetrisEngineCallbacks,
  ) {
    const ctx = boardCanvas.getContext("2d");
    const nextCtx = nextCanvas.getContext("2d");
    if (!ctx || !nextCtx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.nextCtx = nextCtx;
    this.callbacks = callbacks;
    this.board = this.createBoard();
    this.next = this.randomPiece();
    this.current = this.randomPiece();
    this.initGame();
  }

  private notify(fn: () => void) {
    if (this.destroyed) return;
    fn();
  }

  private notifyAll() {
    this.notify(() => {
      this.callbacks.onScoreChange(this.score);
      this.callbacks.onLivesChange(this.state === "gameover" ? 0 : 1);
      this.callbacks.onLevelChange(this.level);
      this.callbacks.onLinesChange(this.lines);
    });
  }

  private createBoard(): Board {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  private randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  private collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  private rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  private tryRotate() {
    const rotated = this.rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collide(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] = this.current.shape[r][c];
  }

  private clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
      this.notify(() => {
        this.callbacks.onScoreChange(this.score);
        this.callbacks.onLinesChange(this.lines);
        this.callbacks.onLevelChange(this.level);
      });
    }
  }

  private ghostY(): number {
    let gy = this.current.y;
    while (!this.collide(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.notify(() => this.callbacks.onScoreChange(this.score));
    this.lockPiece();
  }

  private softDrop() {
    if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
      this.notify(() => this.callbacks.onScoreChange(this.score));
    } else {
      this.lockPiece();
    }
  }

  private lockPiece() {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  private spawn() {
    this.current = this.next;
    this.next = this.randomPiece();
    if (this.collide(this.current.shape, this.current.x, this.current.y)) {
      this.endGame();
    }
    this.drawNext();
  }

  private drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha?: number,
  ) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex];
    context.globalAlpha = alpha ?? 1;
    context.fillStyle = color ?? "#fff";
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle =
      typeof document !== "undefined"
        ? getComputedStyle(document.body).getPropertyValue("--line").trim() || "rgba(0,245,255,0.18)"
        : "rgba(0,245,255,0.18)";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    this.drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) this.drawBlock(ctx, c, r, this.board[r][c], BLOCK);

    const gy = this.ghostY();
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.drawBlock(ctx, this.current.x + c, gy + r, this.current.shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        this.drawBlock(ctx, this.current.x + c, this.current.y + r, this.current.shape[r][c], BLOCK);
  }

  private drawNext() {
    const ctx = this.nextCtx;
    ctx.clearRect(0, 0, NEXT_CANVAS_SIZE, NEXT_CANVAS_SIZE);
    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        this.drawBlock(ctx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
  }

  private endGame() {
    this.state = "gameover";
    this.notify(() => {
      this.callbacks.onLivesChange(0);
      this.callbacks.onGameOver(this.score);
    });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENTED_CODES.has(e.code)) e.preventDefault();
    if (this.paused || this.state === "gameover") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!this.collide(this.current.shape, this.current.x - 1, this.current.y)) this.current.x--;
        break;
      case "ArrowRight":
        if (!this.collide(this.current.shape, this.current.x + 1, this.current.y)) this.current.x++;
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
        break;
    }
  };

  private initGame() {
    this.board = this.createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.state = "playing";
    this.next = this.randomPiece();
    this.spawn();
  }

  private update(dt: number) {
    this.dropAccum += dt;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : ts - this.lastTime;
    this.lastTime = ts;
    if (!this.paused && this.state === "playing") this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  start() {
    if (this.destroyed || this.rafId !== null) return;
    this.paused = false;
    window.addEventListener("keydown", this.handleKeyDown);
    this.notifyAll();
    this.drawNext();
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
    if (this.destroyed || this.state === "gameover") return;
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
  }
}
