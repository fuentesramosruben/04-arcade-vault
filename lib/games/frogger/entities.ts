import {
  COLS,
  LANE_LOOP,
  LEVEL_SPEED_FACTOR,
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
