import type {
  GameEngine,
  GameEngineCallbacks,
  GameEngineFactory,
  GameStats,
} from "../types";
import {
  BG_COLOR,
  CELL,
  COLOR_VARS,
  COLS,
  DEFAULT_COLORS,
  FRUIT_KEYS,
  FRUIT_SHEET_URL,
  FRUIT_SPRITES,
  GRID_ALPHA,
  H,
  MAX_DT,
  MAX_TURN_QUEUE,
  ROWS,
  SPRITE_MARGIN,
  START_COL,
  START_LENGTH,
  START_ROW,
  W,
  type ColorKey,
  type Colors,
} from "./constants";
import {
  hitsBody,
  hitsWall,
  isOpposite,
  levelFor,
  nextHead,
  pickFreeCell,
  pointsFor,
  stepMsFor,
  type Cell,
  type Direction,
} from "./entities";
type State = "playing" | "gameover";
// Ojos de la cabeza (px dentro de la celda de 40)
const EYE_SIZE = 5;
const EYE_FRONT = 27; // distancia del borde trasero al ojo, mirando a derecha o abajo
const EYE_SIDE = [8, 27]; // posiciones a lo ancho de la cabeza
const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
function readColors(canvas: HTMLCanvasElement): Colors {
  const style = getComputedStyle(canvas);
  const colors = { ...DEFAULT_COLORS };
  for (const key of Object.keys(COLOR_VARS) as ColorKey[]) {
    colors[key] =
      style.getPropertyValue(COLOR_VARS[key]).trim() || DEFAULT_COLORS[key];
  }
  return colors;
}
// No se previene el comportamiento por defecto si el foco está en un control
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("button, input, textarea, select, a") !== null
  );
}
export const createSnakeEngine: GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngine => {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Snake: no se pudo obtener el contexto 2D");
  const ctx: CanvasRenderingContext2D = context;
  // ── Estado de la instancia ─────────────────────────────────────────────────
  let colors: Colors = DEFAULT_COLORS;
  let body: Cell[] = []; // body[0] es la cabeza
  let direction: Direction = "right";
  let turnQueue: Direction[] = [];
  let fruit: Cell | null = null;
  let fruitKey = FRUIT_KEYS[0];
  let eaten = 0;
  let score = 0;
  let level = 1;
  let accumulator = 0;
  let state: State = "playing";
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let started = false;
  let paused = false;
  let destroyed = false;
  let lastStats: GameStats | null = null;
  let sheet: HTMLImageElement | null = null;
  let sheetReady = false;
  // ── Stats ──────────────────────────────────────────────────────────────────
  function emitStats() {
    if (lastStats && lastStats.score === score && lastStats.level === level)
      return;
    lastStats = { score, level };
    callbacks.onStats({ ...lastStats });
  }
  // ── Reglas ─────────────────────────────────────────────────────────────────
  function gameOver() {
    if (state === "gameover") return;
    state = "gameover";
    turnQueue = [];
    emitStats();
    callbacks.onGameOver(score);
  }
  // Devuelve false si no quedan celdas libres (tablero lleno)
  function spawnFruit(): boolean {
    fruit = pickFreeCell(body);
    if (!fruit) return false;
    const options = FRUIT_KEYS.filter((k) => k !== fruitKey);
    fruitKey = options[Math.floor(Math.random() * options.length)];
    return true;
  }
  function initGame() {
    body = [];
    for (let i = 0; i < START_LENGTH; i++) {
      body.push({ col: START_COL - i, row: START_ROW });
    }
    direction = "right";
    turnQueue = [];
    eaten = 0;
    score = 0;
    level = 1;
    accumulator = 0;
    state = "playing";
    lastStats = null;
    spawnFruit();
    emitStats();
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  function step() {
    const next = turnQueue.shift();
    if (next) direction = next;
    const head = nextHead(body[0], direction);
    if (hitsWall(head)) return gameOver();
    const grows =
      fruit !== null && head.col === fruit.col && head.row === fruit.row;
    // Si no come, la cola se libera en este paso
    if (hitsBody(head, body, !grows)) return gameOver();
    body.unshift(head);
    if (!grows) {
      body.pop();
      return;
    }
    score += pointsFor(level);
    eaten++;
    level = levelFor(eaten);
    emitStats();
    if (!spawnFruit()) gameOver();
  }
  // Como máximo un paso por frame
  function update(dtMs: number) {
    if (state !== "playing") return;
    accumulator += dtMs;
    const interval = stepMsFor(level);
    if (accumulator < interval) return;
    accumulator = Math.min(accumulator - interval, interval - 1);
    step();
  }
  // ── Draw (sin HUD ni overlays: los pinta la plataforma) ────────────────────
  function drawFruit(cell: Cell) {
    const x = cell.col * CELL;
    const y = cell.row * CELL;
    if (sheet && sheetReady) {
      const s = FRUIT_SPRITES[fruitKey];
      const box = CELL - SPRITE_MARGIN * 2;
      const scale = Math.min(box / s.w, box / s.h);
      const dw = s.w * scale;
      const dh = s.h * scale;
      ctx.drawImage(
        sheet,
        s.x,
        s.y,
        s.w,
        s.h,
        x + (CELL - dw) / 2,
        y + (CELL - dh) / 2,
        dw,
        dh,
      );
      return;
    }
    // Respaldo mientras el PNG carga o si falla
    ctx.fillStyle = colors.fruit;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 6, 0, Math.PI * 2);
    ctx.fill();
  }
  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    // Rejilla tenue
    ctx.save();
    ctx.globalAlpha = GRID_ALPHA;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(W, r * CELL + 0.5);
    }
    ctx.stroke();
    ctx.restore();
    if (fruit) drawFruit(fruit);
    // Cuerpo: relleno simple, algo más tenue que la cabeza
    ctx.fillStyle = colors.snake;
    ctx.globalAlpha = 0.7;
    for (let i = 1; i < body.length; i++) {
      ctx.fillRect(
        body[i].col * CELL + 3,
        body[i].row * CELL + 3,
        CELL - 6,
        CELL - 6,
      );
    }
    ctx.globalAlpha = 1;
    // Cabeza: única con brillo
    const head = body[0];
    ctx.save();
    ctx.fillStyle = colors.snake;
    ctx.shadowColor = colors.snake;
    ctx.shadowBlur = 14;
    ctx.fillRect(head.col * CELL + 1, head.row * CELL + 1, CELL - 2, CELL - 2);
    ctx.restore();
    // Ojos: dos puntos junto al borde delantero, según la dirección
    ctx.fillStyle = BG_COLOR;
    const hx = head.col * CELL;
    const hy = head.row * CELL;
    for (const side of EYE_SIDE) {
      const front =
        direction === "right" || direction === "down"
          ? EYE_FRONT
          : CELL - EYE_FRONT - EYE_SIZE;
      const horizontal = direction === "left" || direction === "right";
      ctx.fillRect(
        hx + (horizontal ? front : side),
        hy + (horizontal ? side : front),
        EYE_SIZE,
        EYE_SIZE,
      );
    }
  }
  // ── Bucle ──────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = null;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    // Tras el fin de partida se deja el último fotograma y se para el bucle
    if (state === "playing" && !destroyed) rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (rafId !== null || destroyed) return;
    lastTime = null; // evita el salto de dt tras pausar o reiniciar
    rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    if (paused || state !== "playing") return;
    if (isInteractive(e.target)) return;
    e.preventDefault();
    if (turnQueue.length >= MAX_TURN_QUEUE) return;
    // Se descarta si es igual u opuesta a la última encolada (o a la actual)
    const last = turnQueue.length ? turnQueue[turnQueue.length - 1] : direction;
    if (dir === last || isOpposite(dir, last)) return;
    turnQueue.push(dir);
  }
  function clearInput() {
    turnQueue = [];
  }
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (started || destroyed) return;
      started = true;
      colors = readColors(canvas);
      canvas.width = W;
      canvas.height = H;
      // La partida no espera al PNG: mientras tanto se usa el círculo de respaldo
      const img = new Image();
      img.onload = () => {
        sheetReady = true;
      };
      img.onerror = () => {
        sheetReady = false;
      };
      img.src = FRUIT_SHEET_URL;
      sheet = img;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("blur", clearInput);
      initGame();
      startLoop();
    },
    pause() {
      if (!started || paused || destroyed) return;
      paused = true;
      stopLoop();
      clearInput();
    },
    resume() {
      if (!started || !paused || destroyed) return;
      paused = false;
      startLoop();
    },
    restart() {
      if (!started || destroyed) return;
      paused = false;
      initGame();
      stopLoop();
      startLoop();
    },
    end() {
      if (!started || destroyed || state === "gameover") return;
      gameOver();
      // El bucle se detiene solo; si estaba en pausa se pinta un último fotograma
      if (paused) draw();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", clearInput);
      if (sheet) {
        sheet.onload = null;
        sheet.onerror = null;
      }
      sheet = null;
      sheetReady = false;
    },
  };
};
