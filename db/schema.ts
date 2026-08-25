import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cloudBackups = sqliteTable("cloud_backups", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
