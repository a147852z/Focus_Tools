import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { cloudBackups } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const MAX_BACKUP_BYTES = 512_000;

type BackupEnvelope = {
  version: number;
  exportedAt?: string;
  data: Record<string, unknown>;
};

function isBackupEnvelope(value: unknown): value is BackupEnvelope {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<BackupEnvelope>;
  return backup.version === 1 && Boolean(backup.data) && typeof backup.data === "object" && !Array.isArray(backup.data);
}

async function authenticatedUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "請先使用 ChatGPT 登入" }, { status: 401 });

  const db = getDb();
  const [row] = await db.select().from(cloudBackups).where(eq(cloudBackups.userId, user.userId)).limit(1);
  if (!row) return Response.json({ backup: null, user: { email: user.email, displayName: user.displayName } });

  return Response.json({
    backup: {
      version: row.schemaVersion,
      updatedAt: row.updatedAt,
      data: JSON.parse(row.payload) as Record<string, unknown>,
    },
    user: { email: user.email, displayName: user.displayName },
  });
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "請先使用 ChatGPT 登入" }, { status: 401 });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) {
    return Response.json({ error: "備份資料超過 500 KB 上限" }, { status: 413 });
  }

  let backup: unknown;
  try {
    backup = JSON.parse(raw);
  } catch {
    return Response.json({ error: "備份格式不是有效的 JSON" }, { status: 400 });
  }
  if (!isBackupEnvelope(backup)) return Response.json({ error: "備份格式不正確" }, { status: 400 });

  const payload = JSON.stringify(backup.data);
  const db = getDb();
  await db.insert(cloudBackups).values({
    userId: user.userId,
    email: user.email,
    schemaVersion: backup.version,
    payload,
  }).onConflictDoUpdate({
    target: cloudBackups.userId,
    set: {
      email: user.email,
      schemaVersion: backup.version,
      payload,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  });

  return Response.json({ ok: true, updatedAt: new Date().toISOString() });
}

export async function DELETE() {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "請先使用 ChatGPT 登入" }, { status: 401 });

  const db = getDb();
  await db.delete(cloudBackups).where(eq(cloudBackups.userId, user.userId));
  return Response.json({ ok: true });
}
