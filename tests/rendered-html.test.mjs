import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Focus Room application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>專注房間<\/title>/);
  assert.match(html, /FOCUS ROOM/);
  assert.match(html, /今日完成/);
  assert.match(html, /專注/);
  assert.match(html, /房間/);
  assert.match(html, /我的/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("includes calendar, focus progression, and room persistence", async () => {
  const [page, css, manifest, serviceWorker, adminRoute, adminPage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/cloud-users/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cloud-admin/cloud-admin-manager.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function dateKey\(date: Date\)/);
  assert.match(page, /function changeMonth\(offset: number\)/);
  assert.match(page, /function openEditTask\(task: Task\)/);
  assert.match(page, /function deleteTask\(\)/);
  assert.match(page, /type TimerMode = "countdown" \| "stopwatch"/);
  assert.match(page, /function settleFocus\(\)/);
  assert.match(page, /rewardPoints/);
  assert.match(page, /taskId\?: number/);
  assert.match(page, /taskId: focusTask\.id/);
  assert.match(page, /const taskReward = sourceTask && !sourceTask\.done/);
  assert.match(page, /const focusRecordTitle=/);
  assert.match(page, /setFocusHistory\(\(current\) => current\.map/);
  assert.match(page, /<TodayScreen tasks=\{todayTasks\} completed=\{completed\} progress=\{progress\} readingMinutes=\{readingMinutes\}/);
  assert.match(page, /從今天的閱讀任務開始計時，結算後會累計/);
  assert.match(page, /task\.category === "閱讀" \? " · 計入閱讀累計"/);
  assert.match(page, /完成任務獎勵點數/);
  assert.match(page, /自訂分鐘數/);
  assert.match(page, /function changeFocusDuration\(minutes: number\)/);
  assert.match(page, /focusHistory/);
  assert.match(page, /正向計時/);
  assert.match(page, /function moveFurniture\(uid: string/);
  assert.match(page, /function furnitureFootprint/);
  assert.match(page, /function canPlaceFurniture/);
  assert.match(page, /className="furniture-layer"/);
  assert.match(page, /dragOffset/);
  assert.match(page, /const achievements=/);
  assert.match(page, /function exportBackup\(\)/);
  assert.match(page, /async function importBackup/);
  assert.match(page, /function resetAllData\(\)/);
  assert.match(page, /focus-room-backup-/);
  assert.match(page, /const timerAnchor = useRef/);
  assert.match(page, /Date\.now\(\) - anchor\.startedAt/);
  assert.match(page, /localStorage\.setItem\("focus-room-state"/);
  assert.match(page, /const initialPlacedFurniture: PlacedFurniture\[\] = \[\]/);
  assert.match(page, /chair: 0, lamp: 0/);
  assert.match(adminRoute, /clear_furniture/);
  assert.match(adminRoute, /data\.placedFurniture = \[\]/);
  assert.match(adminPage, /清除所有家具/);
  assert.match(css, /\.calendar-grid \.is-today/);
  assert.match(css, /\.danger-action/);
  assert.match(manifest, /"display"\s*:\s*"standalone"/);
  assert.match(manifest, /"shortcuts"/);
  assert.match(serviceWorker, /focus-room-v2/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
});
