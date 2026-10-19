import {
  COLS,
  GOAL_STARTS,
  GOAL_WIDTH,
  HITBOX_MARGIN,
  LANE_LOOP,
  LEVEL_SPEED_FACTOR,
  MIN_ROUND_TIME_MS,
  ROUND_TIME_MS,
  ROUND_TIME_STEP_MS,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
} from "./constants";
export type Direction = "up" | "down" | "left" | "right";
export type EntityType = "car" | "truck" | "log" | "turtle";
export interface Entity {
  col: number;
  width: number;
  type: EntityType;
  submerged?: boolean;
  phase?: number; // ms dentro del ciclo de inmersión (solo tortugas)
}
export interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}
interface LaneSpec {
  row: number;
  type: EntityType;
  width: number;
  count: number; // entidades repartidas a partes iguales en LANE_LOOP
  speed: number; // celdas/s en el nivel 1
  dir: 1 | -1;
  offset: number; // desfase del primer elemento, en celdas
}
// Carretera (filas 8–12): velocidades de 1,5 a 4 celdas/s
const ROAD_LANES: LaneSpec[] = [
  { row: 8, type: "car", width: 1, count: 4, speed: 2, dir: 1, offset: 0 },
  { row: 9, type: "truck", width: 3, count: 3, speed: 1.5, dir: -1, offset: 2 },
  { row: 10, type: "car", width: 2, count: 4, speed: 3, dir: 1, offset: 1 },
  {
    row: 11,
    type: "truck",
    width: 3,
    count: 3,
    speed: 2.2,
    dir: -1,
    offset: 4,
  },
  { row: 12, type: "car", width: 1, count: 5, speed: 4, dir: 1, offset: 3 },
];
// Río (filas 1–6): velocidades de 1 a 3 celdas/s, huecos de ≥ 1 celda
const RIVER_LANES: LaneSpec[] = [
  { row: 1, type: "log", width: 3, count: 3, speed: 1.5, dir: 1, offset: 0 },
  { row: 2, type: "turtle", width: 2, count: 4, speed: 1, dir: -1, offset: 2 },
  { row: 3, type: "log", width: 4, count: 3, speed: 2.5, dir: 1, offset: 3 },
  { row: 4, type: "log", width: 2, count: 4, speed: 1.2, dir: -1, offset: 1 },
  { row: 5, type: "turtle", width: 3, count: 3, speed: 2, dir: -1, offset: 5 },
  { row: 6, type: "log", width: 3, count: 3, speed: 3, dir: 1, offset: 2 },
];
function buildLane(spec: LaneSpec, speedFactor: number): Lane {
  const period = LANE_LOOP / spec.count;
  const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
  const entities: Entity[] = [];
  for (let i = 0; i < spec.count; i++) {
    const entity: Entity = {
      col: ((spec.offset + i * period) % LANE_LOOP) - (LANE_LOOP - COLS),
      width: spec.width,
      type: spec.type,
    };
    if (spec.type === "turtle") {
      // Cada grupo arranca en un punto distinto del ciclo
      entity.phase = (i * cycle) / spec.count;
      entity.submerged = entity.phase >= TURTLE_VISIBLE_MS;
    }
    entities.push(entity);
  }
  return {
    row: spec.row,
    speed: spec.speed * speedFactor,
    dir: spec.dir,
    entities,
  };
}
// Cada nivel sube todas las velocidades un 15 %
export function buildLanes(level: number): Lane[] {
  const speedFactor = 1 + LEVEL_SPEED_FACTOR * (level - 1);
  return [...RIVER_LANES, ...ROAD_LANES].map((spec) =>
    buildLane(spec, speedFactor),
  );
}
export interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}
export function roundTimeFor(level: number): number {
  return Math.max(
    MIN_ROUND_TIME_MS,
    ROUND_TIME_MS - (level - 1) * ROUND_TIME_STEP_MS,
  );
}
export function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}
export function laneAt(lanes: Lane[], row: number): Lane | undefined {
  return lanes.find((lane) => lane.row === row);
}
// Entidad del río que sostiene a la rana (por su centro), o null. Una tortuga
// sumergida no sostiene.
export function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  const lane = laneAt(lanes, frog.row);
  if (!lane || !isRiverRow(frog.row)) return null;
  const center = frog.col + 0.5;
  for (const entity of lane.entities) {
    if (entity.submerged) continue;
    if (center >= entity.col && center < entity.col + entity.width) {
      return entity;
    }
  }
  return null;
}
// Vehículo que toca a la rana en su fila (hitbox algo más estrecha que la celda)
export function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (frog.row < ROW_ROAD_TOP || frog.row > ROW_ROAD_BOT) return false;
  const lane = laneAt(lanes, frog.row);
  if (!lane) return false;
  const left = frog.col + HITBOX_MARGIN;
  const right = frog.col + 1 - HITBOX_MARGIN;
  return lane.entities.some(
    (entity) => left < entity.col + entity.width && right > entity.col,
  );
}
// Rana quieta en el río sin tronco ni tortuga visible debajo
export function isInWater(frog: Frog, lanes: Lane[]): boolean {
  return (
    !frog.animating && isRiverRow(frog.row) && getSupport(frog, lanes) === null
  );
}
// El río arrastró a la rana fuera de la rejilla (su centro pasó un borde lateral)
export function isOffScreen(frog: Frog): boolean {
  const center = frog.col + 0.5;
  return center < 0 || center > COLS;
}
// Índice de la boca libre bajo la rana, o -1 si no está en una boca o ya
// está ocupada (en ambos casos la rana muere)
export function checkGoal(frog: Frog, goals: boolean[]): number {
  if (frog.row !== ROW_GOALS) return -1;
  const center = frog.col + 0.5;
  const index = GOAL_STARTS.findIndex(
    (start) => center >= start && center < start + GOAL_WIDTH,
  );
  return index !== -1 && !goals[index] ? index : -1;
}
// Mueve las entidades de cada carril y avanza el ciclo de las tortugas. Una
// entidad que sale por un borde reaparece LANE_LOOP celdas atrás, fuera de pantalla.
export function advanceLanes(lanes: Lane[], dtMs: number): void {
  const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
  for (const lane of lanes) {
    const delta = (lane.speed * lane.dir * dtMs) / 1000;
    for (const entity of lane.entities) {
      entity.col += delta;
      if (lane.dir === 1 && entity.col >= COLS) entity.col -= LANE_LOOP;
      if (lane.dir === -1 && entity.col + entity.width <= 0) {
        entity.col += LANE_LOOP;
      }
      if (entity.type === "turtle") {
        entity.phase = ((entity.phase ?? 0) + dtMs) % cycle;
        entity.submerged = entity.phase >= TURTLE_VISIBLE_MS;
      }
    }
  }
}
