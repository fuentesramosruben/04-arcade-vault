import type {
  GameEngine,
  GameEngineCallbacks,
  GameEngineFactory,
  GameStats,
} from "../types";
import {
  BG_COLOR,
  BG_VAR,
  CELL,
  COLOR_VARS,
  COLS,
  DEFAULT_COLORS,
  DEFAULT_GLOW,
  GLOW_VAR,
  GOAL_POINTS,
  GOAL_STARTS,
  GOAL_WIDTH,
  H,
  JUMP_MS,
  LIVES,
  MAX_DT,
  ROUND_POINTS,
  ROWS,
  ROW_POINTS,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_START,
  START_COL,
  TIME_BONUS_PER_SECOND,
  W,
  type ColorKey,
  type Colors,
} from "./constants";
import {
  advanceLanes,
  buildLanes,
  checkGoal,
  checkRoadCollision,
  getSupport,
  isInWater,
  isOffScreen,
  isRiverRow,
  laneAt,
  roundTimeFor,
  type Direction,
  type Entity,
  type Frog,
  type Lane,
} from "./entities";
type State = "playing" | "gameover";
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
const DELTA: Record<Direction, { col: number; row: number }> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const ZONE_ALPHA = 0.14; // relleno de las zonas con el color del tema
const TIME_BAR_H = 6; // px, en el borde inferior del canvas
function readColors(canvas: HTMLCanvasElement): Colors {
  const style = getComputedStyle(canvas);
  const colors = { ...DEFAULT_COLORS };
  for (const key of Object.keys(COLOR_VARS) as ColorKey[]) {
    colors[key] =
      style.getPropertyValue(COLOR_VARS[key]).trim() || DEFAULT_COLORS[key];
  }
  return colors;
}
function readBg(canvas: HTMLCanvasElement): string {
  return getComputedStyle(canvas).getPropertyValue(BG_VAR).trim() || BG_COLOR;
}
function readGlow(canvas: HTMLCanvasElement): number {
  const n = parseFloat(getComputedStyle(canvas).getPropertyValue(GLOW_VAR));
  return Number.isFinite(n) ? n : DEFAULT_GLOW;
}
// No se previene el comportamiento por defecto si el foco está en un control
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("button, input, textarea, select, a") !== null
  );
}
function newFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: START_COL,
    targetRow: ROW_START,
  };
}
export const createFroggerEngine: GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngine => {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Frogger: no se pudo obtener el contexto 2D");
  const ctx: CanvasRenderingContext2D = context;
  // ── Estado de la instancia ─────────────────────────────────────────────────
  let colors: Colors = DEFAULT_COLORS;
  let bg = BG_COLOR;
  let glow = DEFAULT_GLOW;
  let lanes: Lane[] = [];
  let frog: Frog = newFrog();
  let facing: Direction = "up";
  let pendingDir: Direction | null = null;
  let goals: boolean[] = [];
  let bestRow = ROW_START; // fila más alta alcanzada por la rana actual
  let timeLeft = 0;
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let state: State = "playing";
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
      lastStats.lives === lives &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lives, level };
    callbacks.onStats({ ...lastStats });
  }
  // ── Reglas ─────────────────────────────────────────────────────────────────
  function gameOver() {
    if (state === "gameover") return;
    state = "gameover";
    pendingDir = null;
    emitStats();
    callbacks.onGameOver(score);
  }
  function initGame() {
    lanes = buildLanes(1);
    frog = newFrog();
    facing = "up";
    pendingDir = null;
    bestRow = ROW_START;
    goals = GOAL_STARTS.map(() => false);
    timeLeft = roundTimeFor(1);
    score = 0;
    lives = LIVES;
    level = 1;
    state = "playing";
    lastStats = null;
    emitStats();
  }
  // Rana en la salida, entrada descartada y temporizador de la ronda a tope
  function resetFrog() {
    frog = newFrog();
    facing = "up";
    pendingDir = null;
    bestRow = ROW_START;
    timeLeft = roundTimeFor(level);
  }
  // Las 5 bocas llenas: +200, siguiente nivel con carriles más rápidos
  function completeRound() {
    score += ROUND_POINTS;
    level++;
    goals = GOAL_STARTS.map(() => false);
    lanes = buildLanes(level);
    resetFrog();
    emitStats();
  }
  // Una vida menos; sin vidas termina la partida (onStats con lives 0 va antes)
  function killFrog() {
    lives--;
    if (lives <= 0) {
      lives = 0;
      gameOver();
      return;
    }
    resetFrog();
    emitStats();
  }
  // Puntos por filas nuevas y, en la fila de metas, boca libre u ocupada
  function resolveLanding() {
    if (frog.row < bestRow) {
      score += (bestRow - frog.row) * ROW_POINTS;
      bestRow = frog.row;
    }
    if (frog.row !== ROW_GOALS) return;
    const index = checkGoal(frog, goals);
    if (index === -1) return killFrog();
    goals[index] = true;
    score += GOAL_POINTS + Math.floor(timeLeft / 1000) * TIME_BONUS_PER_SECOND;
    if (goals.every(Boolean)) return completeRound();
    resetFrog();
    emitStats();
  }
  // Vehículo, agua o arrastre fuera de la rejilla; true si la rana murió
  function checkHazards(): boolean {
    if (
      !checkRoadCollision(frog, lanes) &&
      !isInWater(frog, lanes) &&
      !isOffScreen(frog)
    )
      return false;
    killFrog();
    return true;
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  function startJump(dir: Direction) {
    const col = frog.col + DELTA[dir].col;
    const row = frog.row + DELTA[dir].row;
    facing = dir;
    // Ni por los bordes laterales ni fuera del mapa
    if (col < 0 || col > COLS - 1 || row < 0 || row >= ROWS) return;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = col;
    frog.targetRow = row;
  }
  // Sobre un tronco o tortuga, la rana viaja con ellos
  function ride(dtMs: number) {
    if (!isRiverRow(frog.row)) return;
    const lane = laneAt(lanes, frog.row);
    if (!lane || !getSupport(frog, lanes)) return;
    frog.col += (lane.speed * lane.dir * dtMs) / 1000;
  }
  function update(dtMs: number) {
    if (state !== "playing") return;
    advanceLanes(lanes, dtMs);
    if (frog.animating) {
      frog.animT += dtMs;
      if (frog.animT >= JUMP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        frog.animT = 0;
        resolveLanding();
      }
    } else if (pendingDir) {
      const dir = pendingDir;
      pendingDir = null;
      startJump(dir);
    } else {
      ride(dtMs);
    }
    if (state !== "playing") return;
    if (!frog.animating && checkHazards()) return;
    timeLeft -= dtMs;
    if (timeLeft <= 0) killFrog();
    emitStats();
  }
  // ── Draw (sin HUD ni overlays: los pinta la plataforma) ────────────────────
  function fillZone(row: number, rows: number, color: string, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, row * CELL, W, rows * CELL);
    ctx.globalAlpha = 1;
  }
  function drawGoals() {
    GOAL_STARTS.forEach((start, i) => {
      const x = start * CELL;
      const y = ROW_GOALS * CELL;
      const w = GOAL_WIDTH * CELL;
      ctx.fillStyle = bg;
      ctx.fillRect(x, y + 2, w, CELL - 4);
      ctx.strokeStyle = colors.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 3, w - 2, CELL - 6);
      if (goals[i]) drawFrogShape(x + w / 2, y + CELL / 2, 1, "up", false);
    });
  }
  function drawEntity(entity: Entity, lane: Lane) {
    const x = entity.col * CELL;
    const y = lane.row * CELL;
    const w = entity.width * CELL;
    ctx.save();
    switch (entity.type) {
      case "car": {
        ctx.fillStyle = colors.road;
        ctx.fillRect(x + 3, y + 8, w - 6, CELL - 16);
        ctx.fillStyle = bg;
        ctx.fillRect(x + w * 0.3, y + 12, w * 0.4, CELL - 24);
        ctx.fillStyle = colors.ink;
        for (const wx of [x + 8, x + w - 8]) {
          ctx.beginPath();
          ctx.arc(wx, y + CELL - 8, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "truck": {
        ctx.fillStyle = colors.ink;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x + 3, y + 6, w - 6, CELL - 12);
        ctx.globalAlpha = 1;
        // Cabina en el extremo hacia el que avanza
        const cab = CELL * 0.8;
        ctx.fillStyle = colors.road;
        ctx.fillRect(
          lane.dir === 1 ? x + w - 3 - cab : x + 3,
          y + 6,
          cab,
          CELL - 12,
        );
        ctx.fillStyle = bg;
        for (const wx of [x + 10, x + w - 10]) {
          ctx.beginPath();
          ctx.arc(wx, y + CELL - 6, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "log": {
        ctx.fillStyle = colors.gold;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x + 1, y + 7, w - 2, CELL - 14);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = bg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let lx = x + CELL; lx < x + w - 4; lx += CELL) {
          ctx.moveTo(lx, y + 9);
          ctx.lineTo(lx, y + CELL - 9);
        }
        ctx.stroke();
        break;
      }
      case "turtle": {
        // Un caparazón por celda; sumergidas, solo el contorno tenue
        for (let i = 0; i < entity.width; i++) {
          const cx = x + i * CELL + CELL / 2;
          const cy = y + CELL / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
          if (entity.submerged) {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = colors.frog;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = colors.frog;
            ctx.fill();
            ctx.strokeStyle = bg;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        break;
      }
    }
    ctx.restore();
  }
  // `stretch` > 1 durante el salto; `eyes` pinta los ojos
  function drawFrogShape(
    cx: number,
    cy: number,
    stretch: number,
    dir: Direction,
    eyes: boolean,
  ) {
    ctx.save();
    ctx.fillStyle = colors.frog;
    ctx.shadowColor = colors.frog;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14 * stretch, 12 * stretch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!eyes) return;
    const d = DELTA[dir];
    const horizontal = d.col !== 0;
    ctx.fillStyle = colors.ink;
    for (const side of [-6, 6]) {
      ctx.beginPath();
      ctx.arc(
        cx + (horizontal ? d.col * 7 : side),
        cy + (horizontal ? side : d.row * 7),
        3.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = bg;
    for (const side of [-6, 6]) {
      ctx.beginPath();
      ctx.arc(
        cx + (horizontal ? d.col * 8.5 : side),
        cy + (horizontal ? side : d.row * 8.5),
        1.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  function drawFrog() {
    let col = frog.col;
    let row = frog.row;
    let stretch = 1;
    if (frog.animating) {
      const t = Math.min(frog.animT / JUMP_MS, 1);
      col += (frog.targetCol - frog.col) * t;
      row += (frog.targetRow - frog.row) * t;
      stretch = 1 + 0.25 * Math.sin(Math.PI * t);
    }
    drawFrogShape(
      col * CELL + CELL / 2,
      row * CELL + CELL / 2,
      stretch,
      facing,
      true,
    );
  }
  function drawTimeBar() {
    const ratio = Math.max(0, timeLeft) / roundTimeFor(level);
    ctx.fillStyle =
      ratio > 0.5 ? colors.frog : ratio > 0.25 ? colors.gold : colors.road;
    ctx.fillRect(0, H - TIME_BAR_H, W * ratio, TIME_BAR_H);
  }
  function draw() {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // Zonas: metas, río, franja segura, carretera (fondo) y salida
    fillZone(ROW_GOALS, 1, colors.frog, ZONE_ALPHA);
    fillZone(
      ROW_RIVER_TOP,
      ROW_RIVER_BOT - ROW_RIVER_TOP + 1,
      colors.river,
      ZONE_ALPHA,
    );
    fillZone(ROW_RIVER_BOT + 1, 1, colors.frog, ZONE_ALPHA);
    fillZone(ROW_ROAD_BOT + 1, 1, colors.frog, ZONE_ALPHA);
    // Líneas discontinuas entre carriles de carretera
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(W, r * CELL + 0.5);
    }
    ctx.stroke();
    ctx.restore();
    drawGoals();
    for (const lane of lanes) {
      for (const entity of lane.entities) drawEntity(entity, lane);
    }
    drawFrog();
    drawTimeBar();
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
    pendingDir = dir;
  }
  function clearInput() {
    pendingDir = null;
  }
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (started || destroyed) return;
      started = true;
      colors = readColors(canvas);
      bg = readBg(canvas);
      glow = readGlow(canvas);
      canvas.width = W;
      canvas.height = H;
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
    refreshPalette() {
      if (destroyed) return;
      colors = readColors(canvas);
      bg = readBg(canvas);
      glow = readGlow(canvas);
      // En pausa o fin de partida no hay bucle: se repinta el fotograma
      if (started && rafId === null) draw();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", clearInput);
    },
  };
};
