import type {
  GameEngine,
  GameEngineCallbacks,
  GameEngineFactory,
  GameStats,
} from "../types";
import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_POINTS,
  DEFAULT_PALETTE,
  EXPLOSION_MS,
  H,
  LEVELS,
  LEVEL_COUNT,
  MAX_DT,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  PALETTE_VARS,
  SOUND_BOUNCE,
  SOUND_BREAK,
  START_LIVES,
  W,
  type Palette,
  type ThemeKey,
} from "./constants";
import {
  buildBlocks,
  collideAABB,
  type Ball,
  type Block,
  type Explosion,
  type Rect,
} from "./entities";
type State = "playing" | "gameover";
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
function readPalette(canvas: HTMLCanvasElement): Palette {
  const style = getComputedStyle(canvas);
  const palette = { ...DEFAULT_PALETTE };
  for (const key of Object.keys(PALETTE_VARS) as ThemeKey[]) {
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
export const createArkanoidEngine: GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngine => {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Arkanoid: no se pudo obtener el contexto 2D");
  const ctx: CanvasRenderingContext2D = context;
  // ── Estado de la instancia ─────────────────────────────────────────────────
  let palette: Palette = DEFAULT_PALETTE;
  const paddle: Rect = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let state: State = "playing";
  const keys = { left: false, right: false };
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let started = false;
  let paused = false;
  let destroyed = false;
  let lastStats: GameStats | null = null;
  // ── Sonido ─────────────────────────────────────────────────────────────────
  let bounceSound: HTMLAudioElement | null = null;
  let breakSound: HTMLAudioElement | null = null;
  const playing = new Set<HTMLAudioElement>();
  function play(base: HTMLAudioElement | null) {
    if (!base || paused || destroyed) return;
    try {
      const clone = base.cloneNode() as HTMLAudioElement;
      const release = () => playing.delete(clone);
      clone.addEventListener("ended", release);
      clone.addEventListener("error", release);
      playing.add(clone);
      clone.play().catch(release);
    } catch {
      // Audio bloqueado o no disponible: la partida sigue sin sonido
    }
  }
  function stopSounds() {
    for (const clone of playing) clone.pause();
    playing.clear();
  }
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
    keys.left = keys.right = false;
    emitStats();
    callbacks.onGameOver(score);
  }
  // La pelota aparece centrada sobre la pala y se mueve de inmediato
  function resetBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    level = n;
    blocks = buildBlocks(n);
    explosions = [];
    resetBall();
  }
  function initGame() {
    score = 0;
    lives = START_LIVES;
    state = "playing";
    keys.left = keys.right = false;
    lastStats = null;
    paddle.x = (W - paddle.w) / 2;
    loadLevel(1);
    emitStats();
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  function update(dtMs: number) {
    if (state !== "playing") return;
    const dt = dtMs / 1000;
    if (keys.left) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.right)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Paredes izquierda, derecha y techo
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }
    // Pala
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }
    // Bloques: como máximo uno por frame
    for (const block of blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      play(breakSound);
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVEL_COUNT) {
          loadLevel(level + 1);
          emitStats();
        } else {
          emitStats();
          gameOver();
        }
      } else emitStats();
      break;
    }
    for (const exp of explosions) exp.elapsed += dtMs;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_MS);
    // Pelota perdida
    if (state === "playing" && ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameOver();
      } else {
        resetBall();
        emitStats();
      }
    }
  }
  // ── Draw (sin HUD ni overlays: los pinta la plataforma) ────────────────────
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    // Bloques: relleno simple, sin brillo
    for (const b of blocks) {
      if (!b.alive) continue;
      ctx.fillStyle = palette[b.color];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    }
    ctx.globalAlpha = 1;
    // Explosiones: el bloque se expande y se desvanece
    for (const exp of explosions) {
      const t = Math.min(exp.elapsed / EXPLOSION_MS, 1);
      const grow = t * 10;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = palette[exp.color];
      ctx.shadowColor = palette[exp.color];
      ctx.shadowBlur = 16;
      ctx.fillRect(
        exp.x - grow,
        exp.y - grow / 2,
        exp.w + grow * 2,
        exp.h + grow,
      );
      ctx.restore();
    }
    // Pala
    ctx.save();
    ctx.fillStyle = palette.cyan;
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = 14;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.restore();
    // Pelota
    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.shadowColor = palette.ink;
    ctx.shadowBlur = 12;
    ctx.fillRect(ball.x, ball.y, ball.w, ball.h);
    ctx.restore();
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
    keys.left = keys.right = false;
  }
  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    const active = !paused && state === "playing";
    if (!active) return;
    if (isInteractive(e.target)) return;
    e.preventDefault();
    if (e.code === "ArrowLeft") keys.left = true;
    else keys.right = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") keys.left = false;
    else if (e.code === "ArrowRight") keys.right = false;
  }
  // El ratón fija la posición de la pala (centrada en el cursor)
  function onMouseMove(e: MouseEvent) {
    if (paused || state !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    paddle.x = Math.min(W - paddle.w, Math.max(0, x - paddle.w / 2));
  }
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (started || destroyed) return;
      started = true;
      palette = readPalette(canvas);
      canvas.width = W;
      canvas.height = H;
      bounceSound = new Audio(SOUND_BOUNCE);
      breakSound = new Audio(SOUND_BREAK);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", clearInput);
      canvas.addEventListener("mousemove", onMouseMove);
      initGame();
      startLoop();
    },
    pause() {
      if (!started || paused || destroyed) return;
      paused = true;
      stopLoop();
      clearInput();
      stopSounds();
    },
    resume() {
      if (!started || !paused || destroyed) return;
      paused = false;
      startLoop();
    },
    restart() {
      if (!started || destroyed) return;
      paused = false;
      stopSounds();
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
      canvas.removeEventListener("mousemove", onMouseMove);
      stopSounds();
      bounceSound = null;
      breakSound = null;
    },
  };
};
