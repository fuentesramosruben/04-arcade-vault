export type Direction = "up" | "down" | "left" | "right";
export type EntityType = "car" | "truck" | "log" | "turtle";
export interface Entity {
  col: number;
  width: number;
  type: EntityType;
  submerged?: boolean;
}
export interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}
export interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}
