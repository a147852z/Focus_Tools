"use client";

import { useCallback, useEffect, useState } from "react";
import { floorCatalog, normalizeFloorDecor } from "../floor-decor";

type Task = { id?: number; title?: string; date?: string; minutes?: number; category?: string; done?: boolean };
type FocusRecord = { id?: number; taskTitle?: string; minutes?: number; completedAt?: string };
type BackupData = {
  tasks?: Task[];
  coins?: number;
  roomSize?: number;
  inventory?: Record<string, number>;
  placedFurniture?: unknown[];
  focusHistory?: FocusRecord[];
  readingMinutes?: number;
  floorDecor?: unknown;
};
type CloudBackup = { version: number; updatedAt: string; data: BackupData };

export default function CloudDataManager({ displayName, email, isAdmin, signOutHref }: { displayName: string; email: string; isAdmin: boolean; signOutHref: string }) {
  const [backup, setBackup] = useState<CloudBackup | null | undefined>(undefined);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/cloud-backup", { cache: "no-store" });
      const result = await response.json() as { backup?: CloudBackup | null; error?: string };
      if (!response.ok) throw new Error(result.error || "無法讀取雲端資料");
      setBackup(result.backup ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "無法讀取雲端資料");
      setBackup(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function downloadFile() {
    if (!backup) return;
    const blob = new Blob([JSON.stringify({ version: backup.version, exportedAt: backup.updatedAt, data: backup.data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `focus-room-cloud-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteBackup() {
    if (!window.confirm("確定要永久刪除你的雲端備份嗎？這不會刪除各裝置上的本機資料。")) return;
    setMessage("正在刪除…");
    const response = await fetch("/api/cloud-backup", { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "刪除失敗");
    setBackup(null);
    setMessage("雲端資料已刪除；裝置上的本機資料仍保留。 ");
  }

  const tasks = backup?.data.tasks ?? [];
  const history = backup?.data.focusHistory ?? [];
  const completedTasks = tasks.filter((task) => task.done).length;
  const floorDecor = normalizeFloorDecor(backup?.data.floorDecor);
  const totalFocus = history.reduce((sum, record) => sum + (Number(record.minutes) || 0), 0);
  const furnitureCount = Object.values(backup?.data.inventory ?? {}).reduce((sum, count) => sum + (Number(count) || 0), 0) + (backup?.data.placedFurniture?.length ?? 0);

  return <main className="cloud-page">
    <header className="cloud-header"><div><span className="eyebrow">FOCUS ROOM CLOUD</span><h1>我的雲端資料</h1><p>{displayName} · {email}</p></div><nav><a href="/?screen=me">返回專注房間</a>{isAdmin && <a href="/cloud-admin">管理使用者點數</a>}<a className="signout-link" href={signOutHref}>登出</a></nav></header>
    {backup === undefined ? <section className="cloud-panel"><p>正在讀取你的雲端備份…</p></section> : backup ? <>
      <section className="cloud-panel cloud-overview"><div><span>最後上傳</span><strong>{new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(backup.updatedAt))}</strong></div><div><span>任務</span><strong>{completedTasks} / {tasks.length} 完成</strong></div><div><span>專注紀錄</span><strong>{history.length} 次 · {totalFocus} 分鐘</strong></div><div><span>資產</span><strong>{Number(backup.data.coins ?? 0).toLocaleString("zh-TW")} 金幣</strong></div><div><span>閱讀</span><strong>{Number(backup.data.readingMinutes ?? 0)} 分鐘</strong></div><div><span>房間</span><strong>{backup.data.roomSize ?? 6}×{backup.data.roomSize ?? 6} · {furnitureCount} 件家具</strong></div></section>
      <section className="cloud-panel"><div className="cloud-panel-heading"><div><span>FLOOR COLLECTION</span><h2>雲端地板收藏</h2></div><strong>{floorDecor.owned.length} 款已購買</strong></div><p>目前鋪設：{floorCatalog.find((floor)=>floor.id===floorDecor.active)?.name}</p><p>{floorDecor.owned.length?floorCatalog.filter((floor)=>floorDecor.owned.includes(floor.id)).map((floor)=>floor.name).join("、"):"尚未購買地板圖案，使用原木地板。"}</p><small>包含在完整備份內；永久刪除雲端資料時會一併刪除。</small></section>
      <section className="cloud-panel"><div className="cloud-panel-heading"><div><span>BACKUP CONTENT</span><h2>雲端任務資料</h2></div><strong>{tasks.length} 筆</strong></div>{tasks.length ? <div className="cloud-task-list">{tasks.map((task, index) => <article key={task.id ?? index}><div><strong>{task.title || "未命名任務"}</strong><small>{task.date || "無日期"} · {task.category || "未分類"}</small></div><span>{task.minutes ?? 0} 分鐘</span><b>{task.done ? "已完成" : "未完成"}</b></article>)}</div> : <p className="cloud-empty">備份中沒有任務。</p>}</section>
      <section className="cloud-panel cloud-danger"><div><h2>備份管理</h2><p>下載會取得一份 JSON 副本；刪除只會移除雲端備份，不影響裝置上的本機資料。</p></div><div><button type="button" onClick={downloadFile}>下載 JSON</button><button className="danger-action" type="button" onClick={deleteBackup}>永久刪除雲端資料</button></div></section>
    </> : <section className="cloud-panel cloud-empty"><h2>目前沒有雲端資料</h2><p>回到「我的」頁面，按下「上傳目前資料」後，備份才會儲存在雲端。</p></section>}
    {message && <p className="cloud-message" role="status">{message}</p>}
  </main>;
}
