import type {
  GameEngine,
  GameEngineCallbacks,
  GameEngineFactory,
  GameStats,
} from "../types";
import {
  ARR,
  BLOCK,
  BOARD_H,
  BOARD_W,
  COLS,
  DAS,
  DEFAULT_PALETTE,
  H,
  HARD_DROP_POINTS,
  MAX_DT,
  NEXT_BLOCK,
  PALETTE_VARS,
  PIECE_COLOR_KEYS,
  ROWS,
  SIDE_W,
  SOFT_DROP_POINTS,
  W,
  type Palette,
} from "./constants";
import {
  clearLines,
  collide,
  createBoard,
  dropInterval,
  ghostY,
  levelFor,
  lineScore,
  merge,
  randomPiece,
  tryRotate,
  type Board,
  type Piece,
} from "./entities";
type State = "playing" | "gameover";
type RepeatKey = "ArrowLeft" | "ArrowRight" | "ArrowDown";
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const REPEAT_KEYS = new Set<string>(["ArrowLeft", "ArrowRight", "ArrowDown"]);
function readPalette(canvas: HTMLCanvasElement): Palette {
  const style = getComputedStyle(canvas);
  const palette = { ...DEFAULT_PALETTE };
  for (const key of Object.keys(PALETTE_VARS) as (keyof Palette)[]) {
    palette[key] =
      style.getPropertyValue(PALETTE_VARS[key]).trim() || DEFAULT_PALETTE[key];
  }
  return palette;
}
// No se previene el comportamiento por defecto si el foco está en un control
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("button, input, textarea, select, a") !== null
  );
}
export const createTetrisEngine: GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngine => {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tetris: no se pudo obtener el contexto 2D");
  const ctx: CanvasRenderingContext2D = context;
  // ── Estado de la instancia ─────────────────────────────────────────────────
  let palette: Palette = DEFAULT_PALETTE;
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let state: State = "playing";
  let dropAccum = 0;
  // Reloj de juego en ms: solo avanza con el bucle, así la pausa no cuenta
  let clock = 0;
  // Teclas ← → ↓ mantenidas: cuándo toca su próxima repetición
  const held = new Map<RepeatKey, number>();
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let started = false;
  let paused = false;
  let destroyed = false;
  let lastStats: GameStats | null = null;
  // ── Stats ──────────────────────────────────────────────────────────────────
  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.level === level &&
      lastStats.lines === lines
    )
      return;
    lastStats = { score, level, lines };
    callbacks.onStats({ ...lastStats });
  }
  // ── Reglas ─────────────────────────────────────────────────────────────────
  function gameOver() {
    if (state === "gameover") return;
    state = "gameover";
    held.clear();
    emitStats();
    callbacks.onGameOver(score);
  }
  function spawn() {
    current = next;
    next = randomPiece();
    dropAccum = 0;
    if (collide(board, current.shape, current.x, current.y)) gameOver();
  }
  function lockPiece() {
    board = merge(board, current);
    const result = clearLines(board);
    board = result.board;
    if (result.cleared) {
      score += lineScore(result.cleared, level);
      lines += result.cleared;
      level = levelFor(lines);
    }
    emitStats();
    spawn();
  }
  function move(dx: number) {
    if (!collide(board, current.shape, current.x + dx, current.y))
      current = { ...current, x: current.x + dx };
  }
  // Devuelve true si la pieza se bloqueó
  function softDrop(): boolean {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current = { ...current, y: current.y + 1 };
      score += SOFT_DROP_POINTS;
      emitStats();
      return false;
    }
    lockPiece();
    return true;
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * HARD_DROP_POINTS;
    current = { ...current, y: gy };
    lockPiece();
  }
  function rotate() {
    const rotated = tryRotate(board, current);
    if (rotated) current = rotated;
  }
  // Devuelve true si ↓ bloqueó la pieza: la tecla deja de repetirse hasta una pulsación nueva
  function act(key: RepeatKey): boolean {
    if (key === "ArrowLeft") move(-1);
    else if (key === "ArrowRight") move(1);
    else return softDrop();
    return false;
  }
  function initGame() {
    board = createBoard();
    next = randomPiece();
    score = 0;
    lines = 0;
    level = 1;
    state = "playing";
    clock = 0;
    held.clear();
    lastStats = null;
    spawn();
    emitStats();
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") return;
    clock += dt;
    for (const [key, at] of [...held]) {
      let nextAt = at;
      while (state === "playing" && held.has(key) && clock >= nextAt) {
        if (act(key)) held.delete(key);
        nextAt += ARR;
      }
      if (held.has(key)) held.set(key, nextAt);
    }
    if (state !== "playing") return;
    dropAccum += dt;
    if (dropAccum >= dropInterval(level)) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1))
        current = { ...current, y: current.y + 1 };
      else lockPiece();
    }
  }
  // ── Draw (sin HUD ni overlays: los pinta la plataforma) ────────────────────
  function colorOf(type: number) {
    return palette[PIECE_COLOR_KEYS[type]];
  }
  function drawCell(
    px: number,
    py: number,
    size: number,
    color: string,
    alpha = 1,
    glow = 0,
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    ctx.restore();
  }
  function drawPiece(piece: Piece, y: number, alpha: number, glow: number) {
    const color = colorOf(piece.type);
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c])
          drawCell(
            (piece.x + c) * BLOCK,
            (y + r) * BLOCK,
            BLOCK,
            color,
            alpha,
            glow,
          );
  }
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = palette.cyan;
    ctx.globalAlpha = 0.07;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * BLOCK + 0.5, 0);
      ctx.lineTo(c * BLOCK + 0.5, BOARD_H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * BLOCK + 0.5);
      ctx.lineTo(BOARD_W, r * BLOCK + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
  function drawSide() {
    ctx.save();
    ctx.strokeStyle = palette.cyan;
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BOARD_W + 0.5, 0);
    ctx.lineTo(BOARD_W + 0.5, BOARD_H);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.globalAlpha = 0.7;
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SIGUIENTE", BOARD_W + SIDE_W / 2, 32);
    ctx.restore();
    // Pieza siguiente centrada en un recuadro de 4×4 bloques
    const box = 4 * NEXT_BLOCK;
    const boxX = BOARD_W + (SIDE_W - box) / 2;
    const boxY = 56;
    ctx.save();
    ctx.strokeStyle = palette.magenta;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX - 6.5, boxY - 6.5, box + 12, box + 12);
    ctx.restore();
    const { shape, type } = next;
    const offX = (4 - shape[0].length) / 2;
    const offY = (4 - shape.length) / 2;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c])
          drawCell(
            boxX + (offX + c) * NEXT_BLOCK,
            boxY + (offY + r) * NEXT_BLOCK,
            NEXT_BLOCK,
            colorOf(type),
            1,
            6,
          );
  }
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    // Bloques fijados: relleno simple, sin brillo
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c])
          drawCell(c * BLOCK, r * BLOCK, BLOCK, colorOf(board[r][c]), 0.85);
    if (state === "playing") {
      drawPiece(current, ghostY(board, current), 0.22, 8);
      drawPiece(current, current.y, 1, 14);
    }
    drawSide();
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
  function clearInput() {
    held.clear();
  }
  function onKeyDown(e: KeyboardEvent) {
    const active = !paused && state === "playing";
    if (GAME_KEYS.has(e.code) && active && !isInteractive(e.target))
      e.preventDefault();
    // Rotar y caer actúan solo en la pulsación; las repeticiones las gestiona el motor
    if (!active || e.repeat) return;
    if (isInteractive(e.target) && e.code === "Space") return;
    if (REPEAT_KEYS.has(e.code)) {
      const key = e.code as RepeatKey;
      if (held.has(key)) return;
      const locked = act(key);
      if (!locked && state === "playing") held.set(key, clock + DAS);
    } else if (e.code === "ArrowUp" || e.code === "KeyX") rotate();
    else if (e.code === "Space") hardDrop();
  }
  function onKeyUp(e: KeyboardEvent) {
    held.delete(e.code as RepeatKey);
  }
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (started || destroyed) return;
      started = true;
      palette = readPalette(canvas);
      canvas.width = W;
      canvas.height = H;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
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
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
    },
  };
};
