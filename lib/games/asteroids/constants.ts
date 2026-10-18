export const W = 800;
export const H = 600;
// Índices por tamaño de asteroide: 1 (pequeño), 2 (mediano), 3 (grande)
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32]; // px/s base
export const POINTS = [0, 100, 50, 20];
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const BULLET_RADIUS = 2;
export const SHIP_RADIUS = 12;
export const SHIP_ROT = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_NOSE = 21;
export const SHOOT_COOLDOWN = 0.2;
export const INVINCIBLE_TIME = 3;
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_GUARANTEED_KILLS = 5;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_RADIUS = 12;
export const TRIPLE_SPREAD = 0.18;
export const RESPAWN_DELAY = 2;
export const MAX_DT = 0.05;
export const SAFE_DIST = 130;
export const INITIAL_LIVES = 3;
export const INITIAL_ASTEROIDS = 4;
export interface Palette {
  ship: string;
  bullet: string;
  asteroid: string;
  powerUp: string;
  flame: string;
  bg: string;
  glow: number; // shadowBlur de nave, bala y power-up
  asteroidGlow: number; // shadowBlur de asteroides y partículas
}
// Valores por defecto si faltan las variables CSS del tema
export const DEFAULT_PALETTE: Palette = {
  ship: "#00f5ff",
  bullet: "#f5ff00",
  asteroid: "#e6e9ff",
  powerUp: "#ff006e",
  flame: "rgba(255, 130, 0, 0.85)",
  bg: "#000",
  glow: 10,
  asteroidGlow: 0,
};
// Variables CSS del tema de las que se derivan los colores
export const PALETTE_VARS = {
  ship: "--cyan",
  bullet: "--yellow",
  asteroid: "--ink",
  powerUp: "--magenta",
  flame: "--game-flame",
  bg: "--game-bg",
} as const;
// Tokens numéricos (px, sin unidad)
export const GLOW_VARS = {
  glow: "--game-glow",
  asteroidGlow: "--game-glow-asteroid",
} as const;
