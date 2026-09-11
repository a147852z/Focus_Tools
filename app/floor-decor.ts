export const floorCatalog = [
  { id: "original", name: "原木地板", price: 0, description: "溫暖原木色，房間的原始地板。" },
  { id: "walnut", name: "胡桃木拼板", price: 180, description: "深淺木紋交錯，打造沉穩的閱讀角落。" },
  { id: "cream", name: "奶油棋盤", price: 260, description: "奶油白與焦糖交織的復古方磚。" },
  { id: "sage", name: "森林馬賽克", price: 340, description: "鼠尾草綠搭配小巧金色菱花。" },
] as const;

export type FloorId = typeof floorCatalog[number]["id"];
export type FloorDecor = { owned: FloorId[]; active: FloorId };
export const initialFloorDecor: FloorDecor = { owned: [], active: "original" };

export function normalizeFloorDecor(value: unknown): FloorDecor {
  const data = value && typeof value === "object" ? value as Partial<FloorDecor> : {};
  const owned = floorCatalog.filter((floor) => floor.price > 0 && Array.isArray(data.owned) && data.owned.includes(floor.id)).map((floor) => floor.id);
  return { owned, active: data.active && owned.includes(data.active) ? data.active : "original" };
}

export function purchaseFloor(coins: number, decor: FloorDecor, id: FloorId) {
  const floor = floorCatalog.find((item) => item.id === id);
  if (!floor || floor.price === 0 || decor.owned.includes(id)) return { ok: false as const, reason: "owned" };
  if (!Number.isFinite(coins) || coins < floor.price) return { ok: false as const, reason: "funds" };
  return { ok: true as const, coins: coins - floor.price, decor: { owned: [...decor.owned, id], active: id } };
}

export function equipFloor(decor: FloorDecor, id: FloorId): FloorDecor {
  return id === "original" || decor.owned.includes(id) ? { ...decor, active: id } : decor;
}
