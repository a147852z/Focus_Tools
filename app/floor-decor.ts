export const floorCatalog = [
  { id: "original", name: "原木地板", price: 0, description: "拆下圖案退回庫存，恢復原木地板。" },
  { id: "walnut", name: "胡桃木拼板", price: 5, description: "深淺木紋交錯的溫暖拼板。" },
  { id: "cream", name: "奶油棋盤", price: 8, description: "奶油白與焦糖交織的復古方磚。" },
  { id: "sage", name: "森林馬賽克", price: 10, description: "鼠尾草綠搭配金色菱花。" },
] as const;
export type FloorId = typeof floorCatalog[number]["id"];
export type FloorDecor = { version: 2; stock: Partial<Record<FloorId, number>>; tiles: Record<string, FloorId> };
export type FloorRect = { x: number; y: number; width: number; height: number };
export const initialFloorDecor: FloorDecor = { version: 2, stock: {}, tiles: {} };
const validId = (id: unknown): id is FloorId => floorCatalog.some((floor) => floor.id === id);
export function normalizeFloorDecor(value: unknown, roomSize = 6): FloorDecor {
  const size = Number.isInteger(roomSize) && roomSize >= 6 && roomSize <= 8 ? roomSize : 6;
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: FloorDecor = { version: 2, stock: {}, tiles: {} };
  if (data.version !== 2) {
    // Preserve old purchases as one full room of physical tiles per skin.
    for (const floor of floorCatalog) {
      if (floor.price && Array.isArray(data.owned) && data.owned.includes(floor.id)) {
        if (data.active === floor.id) {
          for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) result.tiles[`${x},${y}`] = floor.id;
        } else result.stock[floor.id] = size * size;
      }
    }
    return result;
  }
  if (data.stock && typeof data.stock === "object") for (const floor of floorCatalog) {
    const count = (data.stock as Record<string, unknown>)[floor.id];
    if (floor.price && typeof count === "number" && Number.isSafeInteger(count) && count > 0) result.stock[floor.id] = Math.min(count, 999999);
  }
  if (data.tiles && typeof data.tiles === "object") for (const [key, id] of Object.entries(data.tiles)) {
    if (/^[0-7],[0-7]$/.test(key) && validId(id) && id !== "original") {
      const [x, y] = key.split(",").map(Number);
      if (x < size && y < size) result.tiles[key] = id;
      else result.stock[id] = (result.stock[id] ?? 0) + 1;
    }
  }
  return result;
}
export function purchaseFloor(coins: number, decor: FloorDecor, id: FloorId, width = 1, height = 1) {
  const floor = floorCatalog.find((item) => item.id === id);
  if (!floor || !floor.price || ![width, height].every((n) => Number.isInteger(n) && n >= 1 && n <= 8)) return { ok: false as const, reason: "invalid" };
  const count = width * height, cost = count * floor.price;
  if (!Number.isFinite(coins) || coins < cost) return { ok: false as const, reason: "funds" };
  return { ok: true as const, coins: coins - cost, decor: { ...decor, stock: { ...decor.stock, [id]: (decor.stock[id] ?? 0) + count } } };
}
export function floorRectKeys(rect: FloorRect, size: number): string[] {
  const { x, y, width, height } = rect;
  if (![x, y, width, height, size].every(Number.isInteger) || size < 6 || size > 8 || x < 0 || y < 0 || width < 1 || height < 1 || x + width > size || y + height > size) return [];
  return Array.from({ length: width * height }, (_, i) => `${x + i % width},${y + Math.floor(i / width)}`);
}
export function layFloor(decor: FloorDecor, id: FloorId, rect: FloorRect, size: number) {
  const keys = floorRectKeys(rect, size);
  if (!validId(id) || !keys.length) return { ok: false as const, reason: "bounds" };
  const changed = keys.filter((key) => (decor.tiles[key] ?? "original") !== id);
  if (id !== "original" && (decor.stock[id] ?? 0) < changed.length) return { ok: false as const, reason: "stock" };
  const stock = { ...decor.stock }, tiles = { ...decor.tiles };
  for (const key of changed) {
    const previous = tiles[key];
    if (previous) stock[previous] = (stock[previous] ?? 0) + 1;
    if (id === "original") delete tiles[key];
    else { stock[id] = (stock[id] ?? 0) - 1; tiles[key] = id; }
  }
  return { ok: true as const, decor: { version: 2 as const, stock, tiles }, used: changed.length };
}
