"use client";

import { useCallback, useEffect, useState } from "react";

type CloudUser = { userId: string; email: string; coins: number; furnitureCount: number; taskCount: number; focusCount: number; updatedAt: string };

export default function CloudAdminManager({ adminName }: { adminName: string }) {
  const [users, setUsers] = useState<CloudUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("正在讀取使用者資料…");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [clearingFurnitureId, setClearingFurnitureId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/cloud-users", { cache: "no-store" });
    const result = await response.json() as { users?: CloudUser[]; error?: string };
    if (!response.ok) return setMessage(result.error || "無法讀取使用者資料");
    const rows = result.users ?? [];
    setUsers(rows);
    setDrafts(Object.fromEntries(rows.map((user) => [user.userId, String(user.coins)])));
    setMessage(rows.length ? "" : "目前還沒有使用者上傳雲端備份。 ");
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveCoins(user: CloudUser) {
    const coins = Number(drafts[user.userId]);
    if (!Number.isSafeInteger(coins) || coins < 0 || coins > 999_999_999) return setMessage("點數必須是 0 到 999,999,999 的整數");
    setSavingId(user.userId);
    setMessage(`正在更新 ${user.email}…`);
    const response = await fetch("/api/admin/cloud-users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: user.userId, action: "set_coins", coins }) });
    const result = await response.json() as { error?: string };
    setSavingId(null);
    if (!response.ok) return setMessage(result.error || "更新失敗");
    setUsers((current) => current.map((entry) => entry.userId === user.userId ? { ...entry, coins, updatedAt: new Date().toISOString() } : entry));
    setMessage(`已將 ${user.email} 的雲端點數設為 ${coins.toLocaleString("zh-TW")}。使用者下次手動下載雲端備份後才會套用。`);
  }

  async function clearFurniture(user: CloudUser) {
    if (!window.confirm(`確定要清除 ${user.email} 雲端備份中的所有家具嗎？背包與房間家具都會歸零。`)) return;
    setClearingFurnitureId(user.userId);
    setMessage(`正在清除 ${user.email} 的雲端家具…`);
    const response = await fetch("/api/admin/cloud-users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: user.userId, action: "clear_furniture" }) });
    const result = await response.json() as { error?: string };
    setClearingFurnitureId(null);
    if (!response.ok) return setMessage(result.error || "清除家具失敗");
    setUsers((current) => current.map((entry) => entry.userId === user.userId ? { ...entry, furnitureCount: 0, updatedAt: new Date().toISOString() } : entry));
    setMessage(`已清除 ${user.email} 的所有雲端家具。使用者下次手動下載雲端備份後才會套用。`);
  }

  return <main className="cloud-page"><header className="cloud-header"><div><span className="eyebrow">FOCUS ROOM ADMIN</span><h1>雲端資料管理</h1><p>管理者：{adminName}</p></div><a href="/cloud-data">返回我的雲端資料</a></header><section className="cloud-panel"><div className="cloud-panel-heading"><div><span>CLOUD USERS</span><h2>已建立雲端備份的使用者</h2></div><strong>{users.length} 位</strong></div>{users.length ? <div className="admin-user-list">{users.map((user) => <article key={user.userId}><div><strong>{user.email}</strong><small>{user.taskCount} 項任務 · {user.focusCount} 次專注 · {user.furnitureCount} 件家具 · 更新於 {new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "short" }).format(new Date(user.updatedAt))}</small></div><label>雲端點數<input type="number" min="0" max="999999999" step="1" value={drafts[user.userId] ?? "0"} onChange={(event) => setDrafts((current) => ({ ...current, [user.userId]: event.target.value }))} /></label><div className="admin-user-actions"><button type="button" disabled={savingId === user.userId} onClick={() => saveCoins(user)}>{savingId === user.userId ? "儲存中…" : "儲存點數"}</button><button className="admin-clear-furniture" type="button" disabled={clearingFurnitureId === user.userId || user.furnitureCount === 0} onClick={() => clearFurniture(user)}>{clearingFurnitureId === user.userId ? "清除中…" : "清除所有家具"}</button></div></article>)}</div> : null}</section>{message && <p className="cloud-message" role="status">{message}</p>}</main>;
}
