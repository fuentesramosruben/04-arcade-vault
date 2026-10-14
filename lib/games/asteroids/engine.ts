import type {
  GameEngine,
  GameEngineCallbacks,
  GameEngineFactory,
  GameStats,
} from "../types";
import {
  DEFAULT_PALETTE,
  H,
  INITIAL_ASTEROIDS,
  INITIAL_LIVES,
  MAX_DT,
  PALETTE_VARS,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SAFE_DIST,
  W,
  type Palette,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
  type Keys,
} from "./entities";
type State = "playing" | "dead" | "gameover";
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
function readPalette(canvas: HTMLCanvasElement): Palette {
  const style = getComputedStyle(canvas);
  const read = (cssVar: string, fallback: string) =>
    style.getPropertyValue(cssVar).trim() || fallback;
  return {
    ...DEFAULT_PALETTE,
    ship: read(PALETTE_VARS.ship, DEFAULT_PALETTE.ship),
    bullet: read(PALETTE_VARS.bullet, DEFAULT_PALETTE.bullet),
    asteroid: read(PALETTE_VARS.asteroid, DEFAULT_PALETTE.asteroid),
    powerUp: read(PALETTE_VARS.powerUp, DEFAULT_PALETTE.powerUp),
  };
}
// No se previene el comportamiento por defecto si el foco está en un control
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("button, input, textarea, select, a") !== null
  );
}
export const createAsteroidsEngine: GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Asteroides: no se pudo obtener el contexto 2D");
  // ── Estado de la instancia ─────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  let palette: Palette = DEFAULT_PALETTE;
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
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
  // ── Setup de partida ───────────────────────────────────────────────────────
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    state = "playing";
    spawnAsteroids(INITIAL_ASTEROIDS);
    clearInput();
    emitStats();
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      emitStats();
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = RESPAWN_DELAY;
      emitStats();
    }
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }
  function update(dt: number) {
    if (state === "gameover") {
      // Solo se animan las partículas de la explosión final
      updateParticles(dt);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      // Un disparo pulsado mientras la nave está destruida no se acumula
      justPressed["Space"] = false;
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar solo en la pulsación (no en ráfaga continua)
    if (justPressed["Space"]) {
      justPressed["Space"] = false;
      bullets.push(...ship.tryShoot());
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    emitStats();
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (state === "playing" && asteroids.length === 0) {
      nextLevel();
      emitStats();
    }
  }
  // ── Draw (sin HUD ni overlays: los pinta la plataforma) ────────────────────
  function draw() {
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);
    const c = ctx!;
    particles.forEach((p) => p.draw(c, palette));
    asteroids.forEach((a) => a.draw(c, palette));
    const now = performance.now();
    powerUps.forEach((p) => p.draw(c, palette, now));
    bullets.forEach((b) => b.draw(c, palette));
    ship.draw(c, palette);
  }
  // ── Bucle ──────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
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
    for (const k of Object.keys(keys)) delete keys[k];
    for (const k of Object.keys(justPressed)) delete justPressed[k];
  }
  function onKeyDown(e: KeyboardEvent) {
    if (
      GAME_KEYS.has(e.code) &&
      !paused &&
      state !== "gameover" &&
      !isInteractive(e.target)
    )
      e.preventDefault();
    if (paused) return;
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
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
      state = "gameover";
      callbacks.onGameOver(score);
      // Si estaba en pausa se pinta un último fotograma estático
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
