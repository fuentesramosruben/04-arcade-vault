export const SKINS = ["clasico", "neon", "retro", "pastel"] as const;
export type SkinId = (typeof SKINS)[number];
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
  pastel: "PASTEL",
};
// Skins implementadas por juego (la primera es siempre clásico)
export const GAME_SKINS: Record<string, SkinId[]> = {
  asteroides: ["clasico", "neon", "retro"],
  tetris: ["clasico"],
  arkanoid: ["clasico"],
  snake: ["clasico"],
};
export function getGameSkins(gameId: string): SkinId[] {
  return GAME_SKINS[gameId] ?? [DEFAULT_SKIN];
}
const storageKey = (gameId: string) => `av_skin_${gameId}`;
export function getStoredSkin(gameId: string): SkinId {
  try {
    const value = localStorage.getItem(storageKey(gameId));
    const allowed: readonly string[] = getGameSkins(gameId);
    if (value && allowed.includes(value)) return value as SkinId;
  } catch {
    // sin persistencia (modo privado)
  }
  return DEFAULT_SKIN;
}
export function storeSkin(gameId: string, skin: SkinId) {
  try {
    localStorage.setItem(storageKey(gameId), skin);
  } catch {
    // sin persistencia (modo privado)
  }
}
