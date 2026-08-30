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
  const [page, css, manifest, serviceWorker, adminRoute, adminPage, calibrations, developerPage, wallAsset] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/cloud-users/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cloud-admin/cloud-admin-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/furniture-calibration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/developer/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/furniture/wall-panel-game.png", import.meta.url)),
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
  assert.match(page, /task\.category === "閱讀" \? " · 計入閱讀累計"/);
  assert.match(page, /function ReadingRewardGuide\(\)/);
  assert.match(page, /將分類設為「閱讀」/);
  assert.match(page, /計時結束後按「結算」/);
  assert.match(page, /只勾選任務完成不會增加閱讀時間/);
  assert.equal(page.match(/<ReadingRewardGuide \/>/g)?.length, 3);
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
  assert.match(page, /id: "wallPanel", name: "森林木牆"/);
  assert.match(page, /wallPanel: 0/);
  assert.match(calibrations, /wallPanel: \{ width: 53, mobileWidth: 70, anchorX: 50\.33, anchorY: 106\.81, flipOriginX: 50\.88, flipOriginY: 97\.27/);
  assert.match(calibrations, /footprintX: 1, footprintY: 1/);
  assert.match(developerPage, /id: "wallPanel", name: "森林木牆"/);
  assert.ok(wallAsset.byteLength > 1000);
  assert.match(adminRoute, /clear_furniture/);
  assert.match(adminRoute, /data\.placedFurniture = \[\]/);
  assert.match(adminPage, /清除所有家具/);
  assert.match(css, /\.calendar-grid \.is-today/);
  assert.match(css, /\.furniture\{padding:0;line-height:0\}/);
  assert.match(css, /\.reading-reward-guide/);
  assert.match(css, /\.danger-action/);
  assert.match(manifest, /"display"\s*:\s*"standalone"/);
  assert.match(manifest, /"shortcuts"/);
  assert.match(serviceWorker, /focus-room-v2/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
});
