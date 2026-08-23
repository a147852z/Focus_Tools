"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { defaultFurnitureCalibrations, furnitureCalibrationEvent, furnitureCalibrationStorageKey, mergeFurnitureCalibrations, type FurnitureCalibration, type FurnitureId } from "./furniture-calibration";

type Screen = "today" | "calendar" | "focus" | "room" | "me";
type Task = { id: number; title: string; date: string; minutes: number; category: string; done: boolean };
type FurnitureDefinition = { id: FurnitureId; name: string; src: string; className: string; price: number; footprintX: number; footprintY: number };
type Inventory = Record<FurnitureId, number>;
type PlacedFurniture = { uid: string; furnitureId: FurnitureId; rotation: number; gridX: number; gridY: number };
type TimerMode = "countdown" | "stopwatch";
type FocusRecord = { id: number; taskTitle: string; category?: string; minutes: number; coins: number; readingBonus?: number; completedAt: string };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type FurnitureCalibrationMap = Partial<Record<FurnitureId, FurnitureCalibration>>;

const furnitureCatalog: FurnitureDefinition[] = [
  { id: "bed", name: "橡木床", src: "/assets/furniture/bed-grid-v6.png", className: "bed", price: 520, footprintX: 2, footprintY: 3 },
  { id: "desk", name: "書桌", src: "/assets/furniture/desk-grid-v3.png", className: "desk", price: 360, footprintX: 2, footprintY: 1 },
  { id: "chair", name: "木椅", src: "/assets/furniture/chair-grid-v3.png", className: "chair", price: 180, footprintX: 1, footprintY: 1 },
  { id: "lamp", name: "青綠檯燈", src: "/assets/furniture/lamp-grid-v3.png", className: "lamp", price: 240, footprintX: 1, footprintY: 1 },
  { id: "plant", name: "葉片盆栽", src: "/assets/furniture/plant-grid-v3.png", className: "plant", price: 220, footprintX: 1, footprintY: 1 },
  { id: "rug", name: "青綠地毯", src: "/assets/furniture/rug-grid-v3.png", className: "rug", price: 300, footprintX: 2, footprintY: 2 },
  { id: "bookshelf", name: "橡木書櫃", src: "/assets/furniture/bookshelf-grid-v3.png", className: "bookshelf", price: 460, footprintX: 2, footprintY: 1 },
  { id: "cabinet", name: "收納櫃", src: "/assets/furniture/cabinet-grid-v3.png", className: "cabinet", price: 420, footprintX: 2, footprintY: 1 },
  { id: "sofa", name: "青綠雙人沙發", src: "/assets/furniture/sofa-game.png", className: "sofa", price: 680, footprintX: 2, footprintY: 2 },
  { id: "coffeeTable", name: "花茶矮桌", src: "/assets/furniture/coffee-table-game.png", className: "coffee-table", price: 430, footprintX: 2, footprintY: 1 },
  { id: "wardrobe", name: "青綠橡木衣櫃", src: "/assets/furniture/wardrobe-game.png", className: "wardrobe", price: 760, footprintX: 2, footprintY: 1 },
  { id: "daybed", name: "森林單人床", src: "/assets/furniture/daybed-game.png", className: "daybed", price: 560, footprintX: 2, footprintY: 3 },
  { id: "diningTable", name: "圓形餐桌", src: "/assets/furniture/dining-table-game.png", className: "dining-table", price: 520, footprintX: 2, footprintY: 2 },
  { id: "stool", name: "青綠軟凳", src: "/assets/furniture/stool-game.png", className: "stool", price: 190, footprintX: 1, footprintY: 1 },
  { id: "floorLamp", name: "青綠落地燈", src: "/assets/furniture/floor-lamp-game.png", className: "floor-lamp", price: 320, footprintX: 1, footprintY: 1 },
  { id: "lowBookcase", name: "矮書架", src: "/assets/furniture/low-bookcase-game.png", className: "low-bookcase", price: 490, footprintX: 2, footprintY: 1 },
];

function furnitureFootprint(furnitureId: FurnitureId, rotation: number, calibrations: FurnitureCalibrationMap = {}) {
  const item = furnitureCatalog.find((entry) => entry.id === furnitureId)!;
  const calibration = calibrations[furnitureId];
  const footprintX = calibration && Number.isFinite(calibration.footprintX) ? Math.max(1, Math.round(calibration.footprintX)) : item.footprintX;
  const footprintY = calibration && Number.isFinite(calibration.footprintY) ? Math.max(1, Math.round(calibration.footprintY)) : item.footprintY;
  return rotation === 0 ? { width: footprintX, depth: footprintY } : { width: footprintY, depth: footprintX };
}

function furnitureOverlaps(a: PlacedFurniture, b: PlacedFurniture, calibrations: FurnitureCalibrationMap = {}) {
  const aSize = furnitureFootprint(a.furnitureId, a.rotation, calibrations);
  const bSize = furnitureFootprint(b.furnitureId, b.rotation, calibrations);
  return a.gridX < b.gridX + bSize.width && a.gridX + aSize.width > b.gridX && a.gridY < b.gridY + bSize.depth && a.gridY + aSize.depth > b.gridY;
}

function canPlaceFurniture(candidate: PlacedFurniture, placed: PlacedFurniture[], roomSize: number, calibrations: FurnitureCalibrationMap = {}) {
  const size = furnitureFootprint(candidate.furnitureId, candidate.rotation, calibrations);
  if (candidate.gridX < 0 || candidate.gridY < 0 || candidate.gridX + size.width > roomSize || candidate.gridY + size.depth > roomSize) return false;
  return !placed.some((item) => item.uid !== candidate.uid && furnitureOverlaps(candidate, item, calibrations));
}

function normalizePlacedFurniture(items: PlacedFurniture[], roomSize: number, calibrations: FurnitureCalibrationMap = {}) {
  const normalized: PlacedFurniture[] = [];
  items.forEach((item) => {
    const rotation = item.rotation === 0 ? 0 : 90;
    const normalizedFootprint = furnitureFootprint(item.furnitureId, rotation, calibrations);
    const candidate = { ...item, rotation, gridX: Math.max(0, Math.min(roomSize - normalizedFootprint.width, item.gridX)), gridY: Math.max(0, Math.min(roomSize - normalizedFootprint.depth, item.gridY)) };
    if (canPlaceFurniture(candidate, normalized, roomSize, calibrations)) { normalized.push(candidate); return; }
    const openCell = Array.from({ length: roomSize * roomSize }, (_, index) => ({ gridX: index % roomSize, gridY: Math.floor(index / roomSize) })).find((cell) => canPlaceFurniture({ ...candidate, ...cell }, normalized, roomSize, calibrations));
    if (openCell) normalized.push({ ...candidate, ...openCell });
  });
  return normalized;
}

const initialInventory: Inventory = { bed: 0, desk: 0, chair: 2, lamp: 1, plant: 0, rug: 0, bookshelf: 1, cabinet: 0, sofa: 0, coffeeTable: 0, wardrobe: 0, daybed: 0, diningTable: 0, stool: 0, floorLamp: 0, lowBookcase: 0 };
const defaultFurniturePositions: Record<FurnitureId, { gridX: number; gridY: number }> = {
  bed: { gridX: 0, gridY: 3 }, desk: { gridX: 3, gridY: 1 }, chair: { gridX: 3, gridY: 3 }, lamp: { gridX: 5, gridY: 3 },
  plant: { gridX: 5, gridY: 5 }, rug: { gridX: 3, gridY: 4 }, bookshelf: { gridX: 4, gridY: 0 }, cabinet: { gridX: 0, gridY: 0 },
  sofa: { gridX: 2, gridY: 2 }, coffeeTable: { gridX: 3, gridY: 4 }, wardrobe: { gridX: 4, gridY: 0 }, daybed: { gridX: 0, gridY: 3 },
  diningTable: { gridX: 2, gridY: 3 }, stool: { gridX: 4, gridY: 4 }, floorLamp: { gridX: 5, gridY: 2 }, lowBookcase: { gridX: 1, gridY: 0 },
};
const initialPlacedFurniture: PlacedFurniture[] = [
  { uid: "placed-bed", furnitureId: "bed", rotation: 0, ...defaultFurniturePositions.bed },
  { uid: "placed-desk", furnitureId: "desk", rotation: 0, ...defaultFurniturePositions.desk },
  { uid: "placed-plant", furnitureId: "plant", rotation: 0, ...defaultFurniturePositions.plant },
  { uid: "placed-rug", furnitureId: "rug", rotation: 0, ...defaultFurniturePositions.rug },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftedDateKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

const todayKey = dateKey(new Date());
const starterTasks: Task[] = [
  { id: 1, title: "整理今日課堂筆記", date: todayKey, minutes: 25, category: "學習", done: true },
  { id: 2, title: "完成英文作業", date: todayKey, minutes: 45, category: "學習", done: false },
  { id: 3, title: "閱讀第三章", date: todayKey, minutes: 25, category: "閱讀", done: false },
  { id: 4, title: "整理書桌", date: todayKey, minutes: 15, category: "生活", done: false },
  { id: 5, title: "複習單字", date: shiftedDateKey(2), minutes: 20, category: "學習", done: false },
];

const screenNames: Record<Screen, string> = { today: "今天", calendar: "日曆", focus: "專注計時", room: "我的房間", me: "我的" };
const navItems: { id: Screen; icon: string; label: string }[] = [
  { id: "today", icon: "✓", label: "今天" }, { id: "calendar", icon: "▦", label: "日曆" },
  { id: "focus", icon: "◷", label: "專注" }, { id: "room", icon: "◇", label: "房間" }, { id: "me", icon: "○", label: "我的" },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("today");
  const [tasks, setTasks] = useState<Task[]>(starterTasks);
  const [coins, setCoins] = useState(1240);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(todayKey.slice(0, 7));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState(25);
  const [newCategory, setNewCategory] = useState("一般");
  const [focusTask, setFocusTask] = useState<Task>(starterTasks[1]);
  const [secondsLeft, setSecondsLeft] = useState(starterTasks[1].minutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");
  const [timerRunning, setTimerRunning] = useState(false);
  const [focusSettled, setFocusSettled] = useState(false);
  const [focusHistory, setFocusHistory] = useState<FocusRecord[]>([]);
  const [readingMinutes, setReadingMinutes] = useState(0);
  const [roomSize, setRoomSize] = useState(6);
  const [roomZoom, setRoomZoom] = useState(1);
  const [inventory, setInventory] = useState<Inventory>(initialInventory);
  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>(initialPlacedFurniture);
  const [furnitureCalibrations, setFurnitureCalibrations] = useState<Partial<Record<FurnitureId, FurnitureCalibration>>>(defaultFurnitureCalibrations);
  const [selectedFurnitureUid, setSelectedFurnitureUid] = useState<string | null>("placed-bed");
  const [shopOpen, setShopOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const hydrated = useRef(false);
  const timerAnchor = useRef<{ startedAt: number; startSeconds: number } | null>(null);

  useEffect(() => {
    const requestedScreen = new URLSearchParams(window.location.search).get("screen");
    if (requestedScreen && requestedScreen in screenNames) setScreen(requestedScreen as Screen);
    let startupCalibrations: FurnitureCalibrationMap = defaultFurnitureCalibrations;
    try {
      const savedCalibrations = localStorage.getItem(furnitureCalibrationStorageKey);
      if (savedCalibrations) startupCalibrations = mergeFurnitureCalibrations(JSON.parse(savedCalibrations));
      setFurnitureCalibrations(startupCalibrations);
    } catch { startupCalibrations = defaultFurnitureCalibrations; }
    const saved = localStorage.getItem("focus-room-state");
    if (saved) {
      try {
        const data = JSON.parse(saved) as { tasks?: Task[]; coins?: number; roomSize?: number; roomZoom?: number; inventory?: Inventory; placedFurniture?: PlacedFurniture[]; focusHistory?: FocusRecord[]; readingMinutes?: number };
        const savedRoomSize = typeof data.roomSize === "number" ? Math.max(6, Math.min(8, data.roomSize)) : 6;
        if (data.tasks) setTasks(data.tasks);
        if (typeof data.coins === "number") setCoins(data.coins);
        if (typeof data.roomSize === "number") setRoomSize(savedRoomSize);
        if (typeof data.roomZoom === "number") setRoomZoom(Math.max(.7, Math.min(1.35, data.roomZoom)));
        if (data.inventory) setInventory({ ...initialInventory, ...data.inventory });
        if (data.placedFurniture) setPlacedFurniture(normalizePlacedFurniture(data.placedFurniture.map((item) => ({
          ...item,
          gridX: typeof item.gridX === "number" ? item.gridX : defaultFurniturePositions[item.furnitureId].gridX,
          gridY: typeof item.gridY === "number" ? item.gridY : defaultFurniturePositions[item.furnitureId].gridY,
        })), savedRoomSize, startupCalibrations));
        if (data.focusHistory) setFocusHistory(data.focusHistory);
        if (typeof data.readingMinutes === "number") setReadingMinutes(Math.max(0, Math.floor(data.readingMinutes)));
        else if (data.focusHistory) setReadingMinutes(data.focusHistory.reduce((sum, record) => sum + (record.category === "閱讀" ? record.minutes : 0), 0));
      } catch { localStorage.removeItem("focus-room-state"); setToast("儲存資料損壞，已安全恢復預設資料"); }
    }
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      else navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => undefined);
    }
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    localStorage.setItem("focus-room-state", JSON.stringify({ tasks, coins, roomSize, roomZoom, inventory, placedFurniture, focusHistory, readingMinutes }));
  }, [tasks, coins, roomSize, roomZoom, inventory, placedFurniture, focusHistory, readingMinutes]);

  useEffect(() => {
    const loadCalibrations = () => {
      try {
        const saved = localStorage.getItem(furnitureCalibrationStorageKey);
        setFurnitureCalibrations(saved ? mergeFurnitureCalibrations(JSON.parse(saved)) : defaultFurnitureCalibrations);
      } catch {
        setFurnitureCalibrations(defaultFurnitureCalibrations);
      }
    };
    const timer = window.setTimeout(loadCalibrations, 0);
    const onStorage = (event: StorageEvent) => { if (event.key === furnitureCalibrationStorageKey) loadCalibrations(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(furnitureCalibrationEvent, loadCalibrations);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(furnitureCalibrationEvent, loadCalibrations);
    };
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const updateTimer = () => {
      const anchor = timerAnchor.current;
      if (!anchor) return;
      const elapsed = Math.floor((Date.now() - anchor.startedAt) / 1000);
      if (timerMode === "stopwatch") { setElapsedSeconds(anchor.startSeconds + elapsed); return; }
      const remaining = Math.max(0, anchor.startSeconds - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) { timerAnchor.current = null; setTimerRunning(false); notify("專注完成！可以領取本次獎勵"); }
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 500);
    return () => window.clearInterval(timer);
  }, [timerRunning, timerMode]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  const todayTasks = tasks.filter((task) => task.date === todayKey);
  const completed = todayTasks.filter((task) => task.done).length;
  const progress = todayTasks.length ? Math.round(completed / todayTasks.length * 100) : 0;

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task;
      setCoins((value) => Math.max(0, value + (task.done ? -10 : 10)));
      notify(task.done ? "已取消完成" : "任務完成，獲得 10 金幣");
      return { ...task, done: !task.done };
    }));
  }

  function startFocus(task: Task) {
    timerAnchor.current = null; setFocusTask(task); setSecondsLeft(task.minutes * 60); setElapsedSeconds(0); setFocusSettled(false); setTimerRunning(false); setScreen("focus");
  }

  function toggleFocusTimer() {
    if (focusSettled) return;
    if (timerRunning) { timerAnchor.current = null; setTimerRunning(false); return; }
    timerAnchor.current = { startedAt: Date.now(), startSeconds: timerMode === "countdown" ? secondsLeft : elapsedSeconds };
    setTimerRunning(true);
  }

  function resetFocusTimer() {
    timerAnchor.current = null; setTimerRunning(false); setSecondsLeft(focusTask.minutes * 60); setElapsedSeconds(0); setFocusSettled(false);
  }

  function changeTimerMode(mode: TimerMode) {
    timerAnchor.current = null; setTimerRunning(false); setTimerMode(mode); setSecondsLeft(focusTask.minutes * 60); setElapsedSeconds(0); setFocusSettled(false);
  }

  function openAddTask(date = selectedDate) {
    setEditingTask(null); setSelectedDate(date); setNewTitle(""); setNewMinutes(25); setNewCategory("一般"); setDialogOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task); setSelectedDate(task.date); setNewTitle(task.title); setNewMinutes(task.minutes); setNewCategory(task.category); setDialogOpen(true);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    if (editingTask) {
      setTasks((current) => current.map((task) => task.id === editingTask.id ? { ...task, title: newTitle.trim(), date: selectedDate, minutes: newMinutes, category: newCategory } : task));
      notify("任務已更新");
    } else {
      setTasks((current) => [...current, { id: Date.now(), title: newTitle.trim(), date: selectedDate, minutes: newMinutes, category: newCategory, done: false }]);
      notify("任務已加入日曆");
    }
    setVisibleMonth(selectedDate.slice(0, 7));
    setNewTitle(""); setNewMinutes(25); setNewCategory("一般"); setEditingTask(null); setDialogOpen(false);
  }

  function deleteTask() {
    if (!editingTask || !window.confirm(`確定要刪除「${editingTask.title}」嗎？`)) return;
    setTasks((current) => current.filter((task) => task.id !== editingTask.id));
    setDialogOpen(false); setEditingTask(null); notify("任務已刪除");
  }

  function settleFocus() {
    if (focusSettled) return notify("這次專注已經結算過了");
    const focusedSeconds = timerMode === "countdown" ? focusTask.minutes * 60 - secondsLeft : elapsedSeconds;
    if (focusedSeconds < 60) return notify("專注滿 1 分鐘後才能結算");
    const focusedMinutes = Math.max(1, Math.floor(focusedSeconds / 60));
    const completedReadingHours = Math.floor(readingMinutes / 60);
    const newReadingHours = focusTask.category === "閱讀" ? Math.floor((readingMinutes + focusedMinutes) / 60) : completedReadingHours;
    const readingBonus = Math.max(0, newReadingHours - completedReadingHours) * 100;
    const earned = focusedMinutes + readingBonus;
    const record: FocusRecord = { id: Date.now(), taskTitle: focusTask.title, category: focusTask.category, minutes: focusedMinutes, coins: earned, readingBonus, completedAt: new Date().toISOString() };
    if (focusTask.category === "閱讀") setReadingMinutes((value) => value + focusedMinutes);
    timerAnchor.current = null; setCoins((value) => value + earned); setFocusHistory((current) => [record, ...current].slice(0, 100)); setFocusSettled(true); setTimerRunning(false);
    notify(readingBonus > 0 ? `閱讀累計滿 ${newReadingHours} 小時，獲得 ${focusedMinutes} 金幣與 ${readingBonus} 點閱讀獎勵` : `專注 ${focusedMinutes} 分鐘，獲得 ${earned} 金幣`);
  }

  function buyFurniture(furnitureId: FurnitureId) {
    const item = furnitureCatalog.find((entry) => entry.id === furnitureId);
    if (!item) return;
    if (coins < item.price) return notify(`還需要 ${item.price - coins} 金幣`);
    setCoins((value) => value - item.price);
    setInventory((current) => ({ ...current, [furnitureId]: current[furnitureId] + 1 }));
    notify(`已購買${item.name}，放入背包`);
  }

  function placeFurniture(furnitureId: FurnitureId) {
    if (inventory[furnitureId] < 1) return notify("背包中沒有這件家具");
    if (placedFurniture.some((item) => item.furnitureId === furnitureId)) return notify("試用版同款家具一次只能擺放一件");
    const uid = `${furnitureId}-${Date.now()}`;
    const preferred = defaultFurniturePositions[furnitureId];
    const preferredCandidate: PlacedFurniture = { uid, furnitureId, rotation: 0, ...preferred };
    const openCells = [preferred, ...Array.from({ length: roomSize * roomSize }, (_, index) => ({ gridX: index % roomSize, gridY: Math.floor(index / roomSize) }))];
    const target = openCells.find((cell) => canPlaceFurniture({ ...preferredCandidate, ...cell }, placedFurniture, roomSize, furnitureCalibrations));
    if (!target) return notify("房間沒有足夠的連續空格，請先收納其他家具");
    setInventory((current) => ({ ...current, [furnitureId]: current[furnitureId] - 1 }));
    setPlacedFurniture((current) => [...current, { ...preferredCandidate, ...target }]);
    setSelectedFurnitureUid(uid); notify("家具已放入房間");
  }

  function moveFurniture(uid: string, gridX: number, gridY: number) {
    setPlacedFurniture((current) => {
      const moving = current.find((item) => item.uid === uid);
      if (!moving) return current;
      const footprint = furnitureFootprint(moving.furnitureId, moving.rotation, furnitureCalibrations);
      const candidate = { ...moving, gridX: Math.max(0, Math.min(roomSize - footprint.width, gridX)), gridY: Math.max(0, Math.min(roomSize - footprint.depth, gridY)) };
      if (!canPlaceFurniture(candidate, current, roomSize, furnitureCalibrations)) return current;
      return current.map((item) => item.uid === uid ? candidate : item);
    });
  }

  function rotateFurniture(facing: "left" | "right") {
    if (!selectedFurnitureUid) return notify("請先選取房間裡的家具");
    const selected = placedFurniture.find((item) => item.uid === selectedFurnitureUid);
    if (!selected) return;
    const rotation = facing === "left" ? 90 : 0;
    if (selected.rotation === rotation) return;
    const oldFootprint = furnitureFootprint(selected.furnitureId, selected.rotation, furnitureCalibrations);
    const newFootprint = furnitureFootprint(selected.furnitureId, rotation, furnitureCalibrations);
    const anchoredCandidate = {
      ...selected,
      rotation,
      gridX: selected.gridX + oldFootprint.width - newFootprint.width,
      gridY: selected.gridY + oldFootprint.depth - newFootprint.depth,
    };
    let candidate = anchoredCandidate;
    if (!canPlaceFurniture(candidate, placedFurniture, roomSize, furnitureCalibrations)) {
      const oldAnchorX = selected.gridX + oldFootprint.width;
      const oldAnchorY = selected.gridY + oldFootprint.depth;
      const nearestCell = Array.from({ length: roomSize * roomSize }, (_, index) => ({ gridX: index % roomSize, gridY: Math.floor(index / roomSize) }))
        .filter((cell) => canPlaceFurniture({ ...selected, ...cell, rotation }, placedFurniture, roomSize, furnitureCalibrations))
        .sort((a, b) => {
          const aDistance = Math.abs(a.gridX + newFootprint.width - oldAnchorX) + Math.abs(a.gridY + newFootprint.depth - oldAnchorY);
          const bDistance = Math.abs(b.gridX + newFootprint.width - oldAnchorX) + Math.abs(b.gridY + newFootprint.depth - oldAnchorY);
          return aDistance - bDistance;
        })[0];
      if (!nearestCell) return notify("房間沒有足夠空間轉向，請先收納其他家具");
      candidate = { ...selected, ...nearestCell, rotation };
      notify("已轉向，並微調到最近的可用格子");
    }
    setPlacedFurniture((current) => current.map((item) => item.uid === selectedFurnitureUid ? candidate : item));
  }

  function storeFurniture() {
    const selected = placedFurniture.find((item) => item.uid === selectedFurnitureUid);
    if (!selected) return notify("請先選取房間裡的家具");
    const definition = furnitureCatalog.find((item) => item.id === selected.furnitureId);
    setPlacedFurniture((current) => current.filter((item) => item.uid !== selected.uid));
    setInventory((current) => ({ ...current, [selected.furnitureId]: current[selected.furnitureId] + 1 }));
    setSelectedFurnitureUid(null); notify(`${definition?.name ?? "家具"}已收回背包`);
  }

  function expandRoom() {
    const cost = roomSize === 6 ? 800 : 2000;
    if (roomSize >= 8) return notify("目前已達試用版最大房間");
    if (coins < cost) return notify(`還需要 ${cost - coins} 金幣`);
    setCoins((value) => value - cost); setRoomSize((value) => value + 1); notify("擴建完成！新格子已永久保存");
  }

  async function installApp() {
    if (!installPrompt) return notify("請使用 Android Chrome 選單的「加到主畫面」");
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function exportBackup() {
    const backup = { version: 1, exportedAt: new Date().toISOString(), data: { tasks, coins, roomSize, roomZoom, inventory, placedFurniture, focusHistory, readingMinutes } };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `focus-room-backup-${todayKey}.json`; anchor.click();
    URL.revokeObjectURL(url); notify("備份檔已下載");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as { version?: number; data?: Record<string, unknown> };
      const data = backup.data;
      if (backup.version !== 1 || !data || !Array.isArray(data.tasks) || typeof data.coins !== "number" || typeof data.roomSize !== "number") throw new Error("invalid backup");
      if (!window.confirm("匯入備份會覆蓋目前的任務、金幣、家具與專注紀錄，確定繼續嗎？")) return;
      const validIds = new Set(furnitureCatalog.map((item) => item.id));
      const restoredRoomSize = Math.max(6, Math.min(8, Math.floor(data.roomSize)));
      const restoredRoomZoom = typeof data.roomZoom === "number" ? Math.max(.7, Math.min(1.35, data.roomZoom)) : 1;
      const restoredTasks = (data.tasks as Task[]).filter((task) => typeof task.id === "number" && typeof task.title === "string" && typeof task.date === "string" && typeof task.minutes === "number").map((task) => ({ ...task, minutes: Math.max(1, Math.min(480, task.minutes)), category: typeof task.category === "string" ? task.category : "一般", done: Boolean(task.done) }));
      const restoredInventory = { ...initialInventory };
      if (data.inventory && typeof data.inventory === "object") furnitureCatalog.forEach((item) => { const count = (data.inventory as Partial<Inventory>)[item.id]; if (typeof count === "number") restoredInventory[item.id] = Math.max(0, Math.floor(count)); });
      const restoredPlacedRaw = Array.isArray(data.placedFurniture) ? (data.placedFurniture as PlacedFurniture[]).filter((item) => typeof item.uid === "string" && validIds.has(item.furnitureId)).map((item) => ({ ...item, rotation: [0,90,180,270].includes(item.rotation) ? item.rotation : 0, gridX: Math.max(0, Math.min(restoredRoomSize-1, Number(item.gridX)||0)), gridY: Math.max(0, Math.min(restoredRoomSize-1, Number(item.gridY)||0)) })) : initialPlacedFurniture;
      const restoredPlaced = normalizePlacedFurniture(restoredPlacedRaw, restoredRoomSize, furnitureCalibrations);
      const restoredHistory = Array.isArray(data.focusHistory) ? (data.focusHistory as FocusRecord[]).filter((record) => typeof record.id === "number" && typeof record.taskTitle === "string" && typeof record.minutes === "number" && typeof record.completedAt === "string").map((record) => ({ ...record, category: typeof record.category === "string" ? record.category : undefined, readingBonus: typeof record.readingBonus === "number" ? Math.max(0, record.readingBonus) : 0 })).slice(0,100) : [];
      const restoredReadingMinutes = typeof data.readingMinutes === "number" ? Math.max(0, Math.floor(data.readingMinutes)) : restoredHistory.reduce((sum, record) => sum + (record.category === "閱讀" ? record.minutes : 0), 0);
      setTasks(restoredTasks); setCoins(Math.max(0,Math.floor(data.coins))); setRoomSize(restoredRoomSize); setRoomZoom(restoredRoomZoom); setInventory(restoredInventory); setPlacedFurniture(restoredPlaced); setFocusHistory(restoredHistory); setReadingMinutes(restoredReadingMinutes); setSelectedFurnitureUid(restoredPlaced[0]?.uid ?? null); notify("備份已成功匯入");
    } catch {
      notify("無法匯入：這不是有效的專注房間備份檔");
    }
  }

  function resetAllData() {
    if (!window.confirm("確定要清除所有任務、金幣、家具與專注紀錄嗎？此動作無法復原。")) return;
    hydrated.current = false; localStorage.removeItem("focus-room-state"); window.location.reload();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">FOCUS ROOM</span><h1>{screenNames[screen]}</h1></div>
        <div className="coins" aria-label={`${coins} 金幣`}><span>◆</span>{coins.toLocaleString("zh-TW")}</div>
      </header>

      {screen === "today" && <TodayScreen tasks={todayTasks} completed={completed} progress={progress} onToggle={toggleTask} onStart={startFocus} onEdit={openEditTask} onAdd={() => openAddTask(todayKey)} />}
      {screen === "calendar" && <CalendarScreen tasks={tasks} selectedDate={selectedDate} visibleMonth={visibleMonth} onMonthChange={setVisibleMonth} onSelect={setSelectedDate} onAdd={() => openAddTask()} onStart={startFocus} onEdit={openEditTask} />}
      {screen === "focus" && <FocusScreen task={focusTask} readingMinutes={readingMinutes} mode={timerMode} seconds={timerMode === "countdown" ? secondsLeft : elapsedSeconds} running={timerRunning} settled={focusSettled} onModeChange={changeTimerMode} onToggle={toggleFocusTimer} onReset={resetFocusTimer} onFinish={settleFocus} />}
      {screen === "room" && <RoomScreen size={roomSize} zoom={roomZoom} inventory={inventory} placed={placedFurniture} calibrations={furnitureCalibrations} selectedUid={selectedFurnitureUid} onSelect={setSelectedFurnitureUid} onPlace={placeFurniture} onMove={moveFurniture} onRotate={rotateFurniture} onZoomChange={setRoomZoom} onStore={storeFurniture} onExpand={expandRoom} onShop={() => setShopOpen(true)} />}
      {screen === "me" && <ProfileScreen tasks={tasks} coins={coins} readingMinutes={readingMinutes} roomSize={roomSize} inventory={inventory} placed={placedFurniture} focusHistory={focusHistory} onExport={exportBackup} onImport={importBackup} onReset={resetAllData} onInstall={installApp} />}

      <nav className="bottom-nav" aria-label="主要導覽">
        {navItems.map((item) => <button type="button" key={item.id} className={screen === item.id ? "is-active" : ""} onClick={() => setScreen(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>

      {dialogOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}><form className="task-dialog" onSubmit={addTask} onMouseDown={(event) => event.stopPropagation()}><div className="dialog-heading"><div><span className="eyebrow">{editingTask ? "EDIT TASK" : "NEW TASK"}</span><h2>{editingTask ? "編輯任務" : "新增任務"}</h2></div><button type="button" onClick={() => setDialogOpen(false)} aria-label="關閉">×</button></div><label>任務名稱<input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="例如：完成報告第一章" /></label><label>日期<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label>分類<select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}><option>一般</option><option>學習</option><option>工作</option><option>閱讀</option><option>生活</option><option>運動</option></select></label><label>預計專注時間<select value={newMinutes} onChange={(event) => setNewMinutes(Number(event.target.value))}><option value={15}>15 分鐘</option><option value={20}>20 分鐘</option><option value={25}>25 分鐘</option><option value={45}>45 分鐘</option><option value={60}>60 分鐘</option></select></label><div className="dialog-actions">{editingTask && <button className="danger-action" type="button" onClick={deleteTask}>刪除任務</button>}<button className="primary-action" type="submit">{editingTask ? "儲存修改" : "儲存任務"}</button></div></form></div>}
      {shopOpen && <ShopDialog coins={coins} inventory={inventory} onBuy={buyFurniture} onClose={() => setShopOpen(false)} />}
      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}

function TodayScreen({ tasks, completed, progress, onToggle, onStart, onEdit, onAdd }: { tasks: Task[]; completed: number; progress: number; onToggle: (id: number) => void; onStart: (task: Task) => void; onEdit: (task: Task) => void; onAdd: () => void }) {
  const today = new Date(`${todayKey}T12:00:00`);
  const dateLabel = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(today);
  const weekdayLabel = new Intl.DateTimeFormat("zh-TW", { weekday: "long" }).format(today);
  return <section className="screen today-screen"><div className="date-row"><div><strong>{dateLabel}</strong><span>{weekdayLabel}</span></div><button type="button" onClick={onAdd} aria-label="新增任務">＋</button></div><div className="progress-copy"><span><strong>{completed} / {tasks.length}</strong> 今日完成</span><span>{progress}%</span></div><div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><div className="section-heading"><h2>接下來</h2><button type="button" onClick={onAdd}>新增任務</button></div><div className="task-list">{tasks.map((task) => <article className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}><button className="task-check" type="button" onClick={() => onToggle(task.id)} aria-label={`${task.done ? "取消完成" : "完成"}${task.title}`}>{task.done ? "✓" : ""}</button><div><strong>{task.title}</strong><span>{task.category} · {task.minutes} 分鐘</span></div><div className="task-actions">{task.done ? <span className="reward">完成</span> : <button className="start-button" type="button" onClick={() => onStart(task)}>開始</button>}<button className="edit-button" type="button" onClick={() => onEdit(task)} aria-label={`編輯${task.title}`}>編輯</button></div></article>)}</div><aside className="room-hint"><span className="room-mark">◇</span><div><strong>再完成 2 項即可解鎖新地板</strong><p>完成任務，把進度變成房間裡看得見的收藏。</p></div></aside></section>;
}

function CalendarScreen({ tasks, selectedDate, visibleMonth, onMonthChange, onSelect, onAdd, onStart, onEdit }: { tasks: Task[]; selectedDate: string; visibleMonth: string; onMonthChange: (month: string) => void; onSelect: (date: string) => void; onAdd: () => void; onStart: (task: Task) => void; onEdit: (task: Task) => void }) {
  const [year, month] = visibleMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const selectedTasks = tasks.filter((task) => task.date === selectedDate);
  const monthLabel = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" }).format(new Date(year, month - 1, 1));
  const selectedLabel = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(new Date(`${selectedDate}T12:00:00`));
  function changeMonth(offset: number) {
    const next = new Date(year, month - 1 + offset, 1);
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    onMonthChange(nextMonth); onSelect(`${nextMonth}-01`);
  }
  return <section className="screen"><div className="month-row"><button type="button" aria-label="上個月" onClick={() => changeMonth(-1)}>‹</button><strong>{monthLabel}</strong><button type="button" aria-label="下個月" onClick={() => changeMonth(1)}>›</button></div><div className="weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div className="calendar-grid">{Array.from({ length: leadingBlanks }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}{days.map((day) => { const key=`${visibleMonth}-${String(day).padStart(2,"0")}`; const hasTask=tasks.some((task)=>task.date===key); return <button type="button" key={key} className={`${selectedDate===key?"is-selected":""} ${key===todayKey?"is-today":""} ${hasTask?"has-task":""}`} onClick={()=>onSelect(key)}>{day}</button>; })}</div><div className="agenda-heading"><div><span>已選日期</span><h2>{selectedLabel}的任務</h2></div><button type="button" onClick={onAdd}>＋ 這天新增</button></div><div className="agenda-list">{selectedTasks.length ? selectedTasks.map((task)=><article key={task.id}><span>{task.minutes} 分</span><div><strong>{task.title}</strong><small>{task.category}</small></div><div className="agenda-actions"><button type="button" onClick={()=>onStart(task)}>開始</button><button type="button" onClick={()=>onEdit(task)}>編輯</button></div></article>) : <div className="empty-state"><span>○</span><strong>這天沒有任務</strong><p>安排一件想完成的事吧。</p></div>}</div></section>;
}

function FocusScreen({ task, readingMinutes, mode, seconds, running, settled, onModeChange, onToggle, onReset, onFinish }: { task: Task; readingMinutes:number; mode:TimerMode; seconds:number; running:boolean; settled:boolean; onModeChange:(mode:TimerMode)=>void; onToggle:()=>void; onReset:()=>void; onFinish:()=>void }) {
  const total=task.minutes*60; const ratio=mode==="countdown"?Math.max(0,Math.min(1,seconds/total)):Math.max(0,Math.min(1,seconds/total)); const value=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  const estimatedCoins = mode === "countdown" ? Math.max(0, task.minutes - Math.ceil(seconds / 60)) : Math.floor(seconds / 60);
  const projectedReadingMinutes = readingMinutes + (task.category === "閱讀" ? estimatedCoins : 0);
  const projectedReadingBonus = Math.max(0, Math.floor(projectedReadingMinutes / 60) - Math.floor(readingMinutes / 60)) * 100;
  const minutesUntilReadingReward = 60 - (readingMinutes % 60);
  return <section className="screen focus-screen"><div className="focus-task"><span>目前任務 · {task.category}</span><strong>{task.title}</strong></div><div className="mode-switch"><button className={mode==="countdown"?"is-selected":""} type="button" onClick={()=>onModeChange("countdown")}>倒數專注</button><button className={mode==="stopwatch"?"is-selected":""} type="button" onClick={()=>onModeChange("stopwatch")}>正向計時</button></div><div className="timer-dial" style={{"--timer-progress":`${ratio*360}deg`} as React.CSSProperties}><div><strong>{value}</strong><span>{settled?"已結算":running?"專注中":mode==="countdown"&&seconds===0?"本次完成":"準備開始"}</span></div></div><div className="timer-actions"><button type="button" onClick={onReset}>重設</button><button className="primary-action" type="button" onClick={onToggle} disabled={settled}>{running?"暫停":settled?"已完成":"開始專注"}</button><button type="button" onClick={onFinish} disabled={settled}>結算</button></div><aside className="focus-tip"><span>✦</span>目前可結算約 <strong>{estimatedCoins} 金幣</strong>；每專注 1 分鐘獲得 1 金幣與經驗。</aside>{task.category === "閱讀" && <aside className="reading-reward-card"><div><span>▤ 閱讀獎勵</span><strong>每累計 60 分鐘 ＋100 點</strong></div><div className="reading-progress" role="progressbar" aria-label="閱讀獎勵進度" aria-valuemin={0} aria-valuemax={60} aria-valuenow={readingMinutes%60}><span style={{width:`${readingMinutes%60/60*100}%`}} /></div><small>已累計 {readingMinutes} 分鐘 · 距下次獎勵還差 {minutesUntilReadingReward} 分鐘{projectedReadingBonus>0?` · 現在結算可額外獲得 ${projectedReadingBonus} 點`:""}</small></aside>}</section>;
}

function RoomScreen({ size, zoom, inventory, placed, calibrations, selectedUid, onSelect, onPlace, onMove, onRotate, onStore, onExpand, onShop, onZoomChange }: { size:number; zoom:number; inventory:Inventory; placed:PlacedFurniture[]; calibrations:Partial<Record<FurnitureId,FurnitureCalibration>>; selectedUid:string|null; onSelect:(uid:string)=>void; onPlace:(id:FurnitureId)=>void; onMove:(uid:string,x:number,y:number)=>void; onRotate:(facing:"left"|"right")=>void; onStore:()=>void; onExpand:()=>void; onShop:()=>void; onZoomChange:(zoom:number)=>void }) {
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const selectedItem = placed.find((item) => item.uid === selectedUid);
  const selectedDefinition = furnitureCatalog.find((item) => item.id === selectedItem?.furnitureId);
  const backpackItems = furnitureCatalog.filter((item) => inventory[item.id] > 0);
  function pointerGrid(clientX: number, clientY: number, layer: HTMLElement) {
    const rect = layer.getBoundingClientRect();
    const difference = (clientX - (rect.left + rect.width / 2)) / (rect.width / (2 * size));
    const sum = (clientY - rect.top) / (rect.height / (2 * size)) - 1;
    return { x: (sum + difference) / 2, y: (sum - difference) / 2 };
  }
  function moveFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingUid) return;
    const layer = event.currentTarget.querySelector<HTMLElement>(".furniture-layer");
    const moving = placed.find((item) => item.uid === draggingUid);
    if (!layer || !moving) return;
    const point = pointerGrid(event.clientX, event.clientY, layer);
    const footprint = furnitureFootprint(moving.furnitureId, moving.rotation, calibrations);
    if (!dragOffset.current) {
      dragOffset.current = { x: point.x - (moving.gridX + (footprint.width - 1) / 2), y: point.y - (moving.gridY + (footprint.depth - 1) / 2) };
      return;
    }
    onMove(draggingUid, Math.round(point.x - dragOffset.current.x - (footprint.width - 1) / 2), Math.round(point.y - dragOffset.current.y - (footprint.depth - 1) / 2));
  }
  function nudgeSelected(offsetX: number, offsetY: number) {
    if (selectedItem) onMove(selectedItem.uid, selectedItem.gridX + offsetX, selectedItem.gridY + offsetY);
  }
  const selectedFootprint = selectedItem ? furnitureFootprint(selectedItem.furnitureId, selectedItem.rotation, calibrations) : null;
  const cells = Array.from({ length: size * size }, (_, index) => ({ x: index % size, y: Math.floor(index / size) }));
  const isSelectedCell = (x: number, y: number) => Boolean(selectedItem && selectedFootprint && x >= selectedItem.gridX && x < selectedItem.gridX + selectedFootprint.width && y >= selectedItem.gridY && y < selectedItem.gridY + selectedFootprint.depth);
  const stopDragging = () => { dragOffset.current = null; setDraggingUid(null); };
  const changeZoom = (nextZoom: number) => onZoomChange(Math.max(0.7, Math.min(1.35, Number(nextZoom.toFixed(2)))));

  return <section className="screen room-screen">
    <div className="room-toolbar"><div><strong>舒適小窩</strong><span>{size} × {size} 格 · 已擺放 {placed.length} 件</span></div><div className="room-zoom-controls" aria-label="房間縮放"><button type="button" aria-label="縮小房間" onClick={()=>changeZoom(zoom-0.1)}>−</button><input aria-label="房間縮放比例" type="range" min="0.7" max="1.35" step="0.05" value={zoom} onChange={(event)=>changeZoom(Number(event.target.value))}/><button type="button" aria-label="放大房間" onClick={()=>changeZoom(zoom+0.1)}>＋</button><output>{Math.round(zoom*100)}%</output></div><button className="expand-room-button" type="button" onClick={onExpand}>擴建 {size===6?"800":"2,000"} ◆</button></div>
    <div className={`isometric-room size-${size} ${draggingUid?"is-dragging":""}`} style={{"--room-zoom":zoom} as React.CSSProperties} onPointerMove={moveFromPointer} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <div className="room-backdrop" aria-hidden="true"/>
      <div className="diamond-floor" aria-hidden="true"/>
      <div className="room-grid" aria-hidden="true">{cells.map((cell) => <span key={`${cell.x}-${cell.y}`} className={`iso-cell ${isSelectedCell(cell.x,cell.y)?"is-occupied":""}`} style={{ left:`${50+(cell.x-cell.y)*50/size}%`, top:`${(cell.x+cell.y+1)*50/size}%`, width:`${100/size}%`, height:`${100/size}%` }}/>)}</div>
      <div className="furniture-layer">{placed.map((placedItem) => {
        const item = furnitureCatalog.find((entry) => entry.id === placedItem.furnitureId); if (!item) return null;
        const calibration = calibrations[placedItem.furnitureId];
        const footprint=furnitureFootprint(placedItem.furnitureId,placedItem.rotation,calibrations);
        const anchorX=placedItem.gridX+footprint.width; const anchorY=placedItem.gridY+footprint.depth;
        const positionStyle = { left:`${50+(anchorX-anchorY)*50/size}%`, top:`${(anchorX+anchorY)*50/size}%`, zIndex:3+anchorX+anchorY, "--furniture-facing": placedItem.rotation === 0 ? 1 : -1, ...(calibration ? { "--calibrated-width":`${calibration.width}px`, "--calibrated-mobile-width":`${calibration.mobileWidth}px`, "--calibrated-right-x":`${-calibration.anchorX}%`, "--calibrated-left-x":`${calibration.anchorX-100}%`, "--calibrated-y":`${-calibration.anchorY}%`, "--calibrated-origin-x":`${calibration.flipOriginX}%`, "--calibrated-origin-y":`${calibration.flipOriginY}%`, "--calibrated-angle":`${calibration.imageAngle ?? 0}deg` } : {}) } as React.CSSProperties;
        return <button type="button" aria-label={`${item.name}，第 ${placedItem.gridX+1} 欄第 ${placedItem.gridY+1} 列，占 ${footprint.width} × ${footprint.depth} 格`} key={placedItem.uid} onPointerDown={(event)=>{event.preventDefault();onSelect(placedItem.uid);setDraggingUid(placedItem.uid);dragOffset.current=null;event.currentTarget.setPointerCapture(event.pointerId);}} className={`furniture grid-positioned ${item.className} ${calibration?"has-calibration":""} ${placedItem.rotation===0?"is-facing-right":"is-facing-left"} ${selectedUid===placedItem.uid?"is-selected":""} ${draggingUid===placedItem.uid?"is-moving":""}`} style={positionStyle}><img src={item.src} alt="" draggable={false}/></button>;
      })}</div>
      <span className="drag-hint">按住家具拖曳，亮色格為實際占位</span>
    </div>
    <div className="edit-bar"><span>已選取：<strong>{selectedDefinition?.name ?? "尚未選取"}</strong>{selectedItem && selectedFootprint && <small>起點 {selectedItem.gridX+1}, {selectedItem.gridY+1} · 占 {selectedFootprint.width} × {selectedFootprint.depth} 格</small>}</span><div className="move-controls" aria-label="移動家具"><button type="button" onClick={()=>nudgeSelected(0,-1)}>↑</button><button type="button" onClick={()=>nudgeSelected(-1,0)}>←</button><button type="button" onClick={()=>nudgeSelected(1,0)}>→</button><button type="button" onClick={()=>nudgeSelected(0,1)}>↓</button></div><div><button type="button" onClick={()=>onRotate("left")}>← 朝左</button><button type="button" onClick={()=>onRotate("right")}>朝右 →</button><button type="button" onClick={onStore}>收納</button></div></div>
    <div className="section-heading"><h2>我的背包</h2><button type="button" onClick={onShop}>前往商店</button></div>{backpackItems.length ? <div className="inventory-grid">{backpackItems.map((item)=><button type="button" key={item.id} onClick={()=>onPlace(item.id)}><img src={item.src} alt="" /><small>{item.name} ×{inventory[item.id]}</small><b>點擊擺放</b></button>)}</div> : <div className="empty-state"><span>□</span><strong>背包是空的</strong><p>前往商店購買新的家具吧。</p></div>}
  </section>;
}

function ShopDialog({ coins, inventory, onBuy, onClose }: { coins:number; inventory:Inventory; onBuy:(id:FurnitureId)=>void; onClose:()=>void }) {
  return <div className="modal-backdrop shop-backdrop" role="presentation" onMouseDown={onClose}><section className="shop-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-title" onMouseDown={(event)=>event.stopPropagation()}><div className="dialog-heading"><div><span className="eyebrow">FURNITURE SHOP</span><h2 id="shop-title">森林家具店</h2></div><button type="button" onClick={onClose} aria-label="關閉商店">×</button></div><div className="shop-wallet"><span>目前金幣</span><strong>◆ {coins.toLocaleString("zh-TW")}</strong></div><div className="shop-grid">{furnitureCatalog.map((item)=><article key={item.id}><img src={item.src} alt=""/><div><strong>{item.name}</strong><small>背包已有 {inventory[item.id]}</small></div><button type="button" disabled={coins<item.price} onClick={()=>onBuy(item.id)}>◆ {item.price}</button></article>)}</div></section></div>;
}

function ProfileScreen({ tasks, coins, readingMinutes, roomSize, inventory, placed, focusHistory, onExport, onImport, onReset, onInstall }: { tasks:Task[]; coins:number; readingMinutes:number; roomSize:number; inventory:Inventory; placed:PlacedFurniture[]; focusHistory:FocusRecord[]; onExport:()=>void; onImport:(event:ChangeEvent<HTMLInputElement>)=>void; onReset:()=>void; onInstall:()=>void }) {
  const done=tasks.filter((task)=>task.done).length;
  const totalFocus=focusHistory.reduce((sum,record)=>sum+record.minutes,0);
  const readingRewards=Math.floor(readingMinutes/60)*100;
  const readingProgress=readingMinutes%60;
  const furnitureCount=placed.length+Object.values(inventory).reduce((sum,count)=>sum+count,0);
  const experience=done*30+totalFocus*2+furnitureCount*10+(roomSize-6)*100;
  const level=Math.floor(experience/250)+1;
  const levelProgress=experience%250;
  const focusLevel=Math.floor(totalFocus/60)+1;
  const executionLevel=Math.floor(done/3)+1;
  const activeDays=new Set(focusHistory.map((record)=>dateKey(new Date(record.completedAt))));
  let streak=0; const cursor=new Date();
  while(activeDays.has(dateKey(cursor))){streak+=1;cursor.setDate(cursor.getDate()-1);}
  const achievements=[
    {icon:"✦",name:"第一步",description:"完成第一項任務",value:done,target:1},
    {icon:"◷",name:"專注學徒",description:"累積專注 60 分鐘",value:totalFocus,target:60},
    {icon:"◆",name:"收藏新手",description:"擁有 5 件家具",value:furnitureCount,target:5},
    {icon:"◇",name:"空間設計師",description:"將房間擴建至 7 × 7",value:roomSize,target:7},
  ];
  return <section className="screen profile-screen"><div className="profile-card"><div className="avatar">森</div><div><span>角色等級 {level}</span><h2>{level>=5?"專注工匠":level>=3?"專注旅人":"森林新手"}</h2><div className="level-track"><span style={{width:`${levelProgress/250*100}%`}} /></div><small>{levelProgress} / 250 經驗 · 總經驗 {experience}</small></div></div><div className="stats-grid"><article><span>專注</span><strong>Lv. {focusLevel}</strong><small>累積 {totalFocus} 分鐘</small></article><article><span>執行</span><strong>Lv. {executionLevel}</strong><small>完成 {done} 項任務</small></article><article><span>穩定</span><strong>{streak} 天</strong><small>目前連續紀錄</small></article><article><span>創意</span><strong>{roomSize}×{roomSize}</strong><small>收藏 {furnitureCount} 件家具</small></article></div><div className="reading-summary"><div><span>▤ 閱讀獎勵</span><strong>已獲得 {readingRewards} 點</strong></div><div className="reading-progress" role="progressbar" aria-label="閱讀獎勵進度" aria-valuemin={0} aria-valuemax={60} aria-valuenow={readingProgress}><span style={{width:`${readingProgress/60*100}%`}} /></div><small>累計閱讀 {readingMinutes} 分鐘 · 下一個 100 點還差 {60-readingProgress} 分鐘</small></div><div className="section-heading"><h2>成就進度</h2><span>{achievements.filter((achievement)=>achievement.value>=achievement.target).length} / {achievements.length}</span></div><div className="achievement-list">{achievements.map((achievement)=><article key={achievement.name} className={achievement.value>=achievement.target?"is-unlocked":""}><span>{achievement.icon}</span><div><strong>{achievement.name}</strong><small>{achievement.description}</small></div><b>{achievement.value>=achievement.target?"已獲得":`${Math.min(achievement.value,achievement.target)} / ${achievement.target}`}</b></article>)}</div><div className="section-heading history-heading"><h2>最近專注</h2><span>共 {focusHistory.length} 次</span></div>{focusHistory.length?<div className="focus-history">{focusHistory.slice(0,5).map((record)=><article key={record.id}><div><strong>{record.taskTitle}</strong><small>{record.category?`${record.category} · `:""}{new Intl.DateTimeFormat("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(record.completedAt))}{record.readingBonus?` · 閱讀獎勵 +${record.readingBonus} 點`:""}</small></div><span>{record.minutes} 分鐘</span><b>＋{record.coins} ◆</b></article>)}</div>:<div className="empty-state compact"><span>◷</span><strong>還沒有專注紀錄</strong><p>完成至少一分鐘的專注後，紀錄會顯示在這裡。</p></div>}<div className="wallet-row"><span>目前資產</span><strong>{coins.toLocaleString("zh-TW")} 金幣</strong></div><div className="section-heading data-heading"><h2>資料管理</h2><span>僅儲存在這台裝置</span></div><div className="data-actions"><button type="button" onClick={onExport}>下載備份</button><label>匯入備份<input type="file" accept="application/json,.json" onChange={onImport}/></label><button className="reset-data" type="button" onClick={onReset}>清除全部資料</button></div><button className="install-button" type="button" onClick={onInstall}>安裝到 Android 主畫面</button><p className="install-help">使用 Android Chrome 開啟後，可像一般 App 一樣加入主畫面。</p></section>;
}
