import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { cloudBackups } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isCloudAdmin } from "../../../cloud-admin-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "請先登入" }, { status: 401 }) };
  if (!isCloudAdmin(user)) return { error: Response.json({ error: "你沒有管理權限" }, { status: 403 }) };
  return { user };
}

function safePayload(payload: string) {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function furnitureCount(data: Record<string, unknown>) {
  const inventory = data.inventory && typeof data.inventory === "object" && !Array.isArray(data.inventory) ? data.inventory as Record<string, unknown> : {};
  const stored = Object.values(inventory).reduce<number>((sum, count) => sum + (typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0), 0);
  return stored + (Array.isArray(data.placedFurniture) ? data.placedFurniture.length : 0);
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const rows = await getDb().select().from(cloudBackups).orderBy(asc(cloudBackups.email));
  return Response.json({ users: rows.map((row) => {
    const data = safePayload(row.payload);
    return {
      userId: row.userId,
      email: row.email,
      coins: typeof data.coins === "number" ? Math.max(0, Math.floor(data.coins)) : 0,
      furnitureCount: furnitureCount(data),
      taskCount: Array.isArray(data.tasks) ? data.tasks.length : 0,
      focusCount: Array.isArray(data.focusHistory) ? data.focusHistory.length : 0,
      updatedAt: row.updatedAt,
    };
  }) });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json() as { userId?: string; action?: "set_coins" | "clear_furniture"; coins?: number };
  if (!body.userId) return Response.json({ error: "缺少使用者識別資料" }, { status: 400 });

  const db = getDb();
  const [row] = await db.select().from(cloudBackups).where(eq(cloudBackups.userId, body.userId)).limit(1);
  if (!row) return Response.json({ error: "找不到這位使用者的雲端備份" }, { status: 404 });

  const data = safePayload(row.payload);
  if (body.action === "clear_furniture") {
    const inventory = data.inventory && typeof data.inventory === "object" && !Array.isArray(data.inventory) ? data.inventory as Record<string, unknown> : {};
    data.inventory = Object.fromEntries(Object.keys(inventory).map((key) => [key, 0]));
    data.placedFurniture = [];
  } else {
    const coins = Number(body.coins);
    if (!Number.isSafeInteger(coins) || coins < 0 || coins > 999_999_999) {
      return Response.json({ error: "點數必須是 0 到 999,999,999 的整數" }, { status: 400 });
    }
    data.coins = coins;
  }
  await db.update(cloudBackups).set({ payload: JSON.stringify(data), updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(cloudBackups.userId, row.userId));
  return Response.json({ ok: true, coins: data.coins, furnitureCount: furnitureCount(data) });
}
