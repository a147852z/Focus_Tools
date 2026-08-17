"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Screen = "today" | "calendar" | "focus" | "room" | "me";
type Task = { id: number; title: string; date: string; minutes: number; category: string; done: boolean };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const todayKey = "2026-08-17";
const starterTasks: Task[] = [
  { id: 1, title: "整理今日課堂筆記", date: todayKey, minutes: 25, category: "學習", done: true },
  { id: 2, title: "完成英文作業", date: todayKey, minutes: 45, category: "學習", done: false },
  { id: 3, title: "閱讀第三章", date: todayKey, minutes: 25, category: "閱讀", done: false },
  { id: 4, title: "整理書桌", date: todayKey, minutes: 15, category: "生活", done: false },
  { id: 5, title: "複習單字", date: "2026-08-19", minutes: 20, category: "學習", done: false },
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState(25);
  const [focusTask, setFocusTask] = useState<Task>(starterTasks[1]);
  const [secondsLeft, setSecondsLeft] = useState(starterTasks[1].minutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [roomSize, setRoomSize] = useState(6);
  const [selectedFurniture, setSelectedFurniture] = useState("床");
  const [rotation, setRotation] = useState(0);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("focus-room-state");
    if (saved) {
      try {
        const data = JSON.parse(saved) as { tasks?: Task[]; coins?: number; roomSize?: number };
        if (data.tasks) setTasks(data.tasks);
        if (typeof data.coins === "number") setCoins(data.coins);
        if (typeof data.roomSize === "number") setRoomSize(data.roomSize);
      } catch { /* keep starter state */ }
    }
    hydrated.current = true;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  useEffect(() => {
    if (hydrated.current) localStorage.setItem("focus-room-state", JSON.stringify({ tasks, coins, roomSize }));
  }, [tasks, coins, roomSize]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => {
      if (value <= 1) { window.clearInterval(timer); setTimerRunning(false); notify("專注完成！可以領取本次獎勵"); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

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
      setCoins((value) => value + (task.done ? -10 : 10));
      notify(task.done ? "已取消完成" : "任務完成，獲得 10 金幣");
      return { ...task, done: !task.done };
    }));
  }

  function startFocus(task: Task) {
    setFocusTask(task); setSecondsLeft(task.minutes * 60); setTimerRunning(false); setScreen("focus");
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    setTasks((current) => [...current, { id: Date.now(), title: newTitle.trim(), date: selectedDate, minutes: newMinutes, category: "一般", done: false }]);
    setNewTitle(""); setNewMinutes(25); setDialogOpen(false); notify("任務已加入日曆");
  }

  function settleFocus() {
    const earned = Math.max(2, focusTask.minutes - Math.ceil(secondsLeft / 60));
    setCoins((value) => value + earned); setTimerRunning(false); notify(`專注已結算，獲得 ${earned} 金幣`);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">FOCUS ROOM</span><h1>{screenNames[screen]}</h1></div>
        <div className="coins" aria-label={`${coins} 金幣`}><span>◆</span>{coins.toLocaleString("zh-TW")}</div>
      </header>

      {screen === "today" && <TodayScreen tasks={todayTasks} completed={completed} progress={progress} onToggle={toggleTask} onStart={startFocus} onAdd={() => { setSelectedDate(todayKey); setDialogOpen(true); }} />}
      {screen === "calendar" && <CalendarScreen tasks={tasks} selectedDate={selectedDate} onSelect={setSelectedDate} onAdd={() => setDialogOpen(true)} onStart={startFocus} />}
      {screen === "focus" && <FocusScreen task={focusTask} seconds={secondsLeft} running={timerRunning} onToggle={() => setTimerRunning((value) => !value)} onReset={() => { setTimerRunning(false); setSecondsLeft(focusTask.minutes * 60); }} onFinish={settleFocus} />}
      {screen === "room" && <RoomScreen size={roomSize} selected={selectedFurniture} rotation={rotation} onSelect={setSelectedFurniture} onRotate={() => setRotation((value) => (value + 90) % 360)} onStore={() => notify(`${selectedFurniture}已收回背包`)} onExpand={expandRoom} onShop={() => notify("商店試用版：家具將在下一階段加入購買流程")} />}
      {screen === "me" && <ProfileScreen tasks={tasks} coins={coins} roomSize={roomSize} onInstall={installApp} />}

      <nav className="bottom-nav" aria-label="主要導覽">
        {navItems.map((item) => <button type="button" key={item.id} className={screen === item.id ? "is-active" : ""} onClick={() => setScreen(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>

      {dialogOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}><form className="task-dialog" onSubmit={addTask} onMouseDown={(event) => event.stopPropagation()}><div className="dialog-heading"><div><span className="eyebrow">NEW TASK</span><h2>新增任務</h2></div><button type="button" onClick={() => setDialogOpen(false)} aria-label="關閉">×</button></div><label>任務名稱<input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="例如：完成報告第一章" /></label><label>日期<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label>預計專注時間<select value={newMinutes} onChange={(event) => setNewMinutes(Number(event.target.value))}><option value={15}>15 分鐘</option><option value={25}>25 分鐘</option><option value={45}>45 分鐘</option><option value={60}>60 分鐘</option></select></label><button className="primary-action" type="submit">儲存任務</button></form></div>}
      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}

function TodayScreen({ tasks, completed, progress, onToggle, onStart, onAdd }: { tasks: Task[]; completed: number; progress: number; onToggle: (id: number) => void; onStart: (task: Task) => void; onAdd: () => void }) {
  return <section className="screen today-screen"><div className="date-row"><div><strong>8 月 17 日</strong><span>星期一</span></div><button type="button" onClick={onAdd} aria-label="新增任務">＋</button></div><div className="progress-copy"><span><strong>{completed} / {tasks.length}</strong> 今日完成</span><span>{progress}%</span></div><div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><div className="section-heading"><h2>接下來</h2><button type="button" onClick={onAdd}>新增任務</button></div><div className="task-list">{tasks.map((task) => <article className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}><button className="task-check" type="button" onClick={() => onToggle(task.id)} aria-label={`${task.done ? "取消完成" : "完成"}${task.title}`}>{task.done ? "✓" : ""}</button><div><strong>{task.title}</strong><span>{task.category} · {task.minutes} 分鐘</span></div>{task.done ? <span className="reward">完成</span> : <button className="start-button" type="button" onClick={() => onStart(task)}>開始</button>}</article>)}</div><aside className="room-hint"><span className="room-mark">◇</span><div><strong>再完成 2 項即可解鎖新地板</strong><p>完成任務，把進度變成房間裡看得見的收藏。</p></div></aside></section>;
}

function CalendarScreen({ tasks, selectedDate, onSelect, onAdd, onStart }: { tasks: Task[]; selectedDate: string; onSelect: (date: string) => void; onAdd: () => void; onStart: (task: Task) => void }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  const selectedTasks = tasks.filter((task) => task.date === selectedDate);
  return <section className="screen"><div className="month-row"><button type="button" aria-label="上個月">‹</button><strong>2026 年 8 月</strong><button type="button" aria-label="下個月">›</button></div><div className="weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div className="calendar-grid">{[27,28,29,30,31].map((day) => <span className="muted-day" key={`prev-${day}`}>{day}</span>)}{days.map((day) => { const key=`2026-08-${String(day).padStart(2,"0")}`; const hasTask=tasks.some((task)=>task.date===key); return <button type="button" key={key} className={`${selectedDate===key?"is-selected":""} ${hasTask?"has-task":""}`} onClick={()=>onSelect(key)}>{day}</button>; })}</div><div className="agenda-heading"><div><span>已選日期</span><h2>{Number(selectedDate.slice(-2))} 日的任務</h2></div><button type="button" onClick={onAdd}>＋ 這天新增</button></div><div className="agenda-list">{selectedTasks.length ? selectedTasks.map((task)=><article key={task.id}><span>{task.minutes} 分</span><div><strong>{task.title}</strong><small>{task.category}</small></div><button type="button" onClick={()=>onStart(task)}>開始</button></article>) : <div className="empty-state"><span>○</span><strong>這天沒有任務</strong><p>安排一件想完成的事吧。</p></div>}</div></section>;
}

function FocusScreen({ task, seconds, running, onToggle, onReset, onFinish }: { task: Task; seconds: number; running: boolean; onToggle: () => void; onReset: () => void; onFinish: () => void }) {
  const total=task.minutes*60; const ratio=Math.max(0,Math.min(1,seconds/total)); const value=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  return <section className="screen focus-screen"><div className="focus-task"><span>目前任務</span><strong>{task.title}</strong></div><div className="mode-switch"><button className="is-selected" type="button">倒數專注</button><button type="button">正向計時</button></div><div className="timer-dial" style={{"--timer-progress":`${ratio*360}deg`} as React.CSSProperties}><div><strong>{value}</strong><span>{running?"專注中":seconds===0?"本次完成":"準備開始"}</span></div></div><div className="timer-actions"><button type="button" onClick={onReset}>重設</button><button className="primary-action" type="button" onClick={onToggle}>{running?"暫停":"開始專注"}</button><button type="button" onClick={onFinish}>結算</button></div><aside className="focus-tip"><span>✦</span>完成本次可獲得約 <strong>{task.minutes} 金幣</strong>與專注經驗。</aside></section>;
}

function RoomScreen({ size, selected, rotation, onSelect, onRotate, onStore, onExpand, onShop }: { size:number; selected:string; rotation:number; onSelect:(item:string)=>void; onRotate:()=>void; onStore:()=>void; onExpand:()=>void; onShop:()=>void }) {
  const items=[{name:"床",symbol:"▰",className:"bed"},{name:"書桌",symbol:"▱",className:"desk"},{name:"盆栽",symbol:"♣",className:"plant"},{name:"地毯",symbol:"◇",className:"rug"}];
  return <section className="screen room-screen"><div className="room-toolbar"><div><strong>舒適小窩</strong><span>{size} × {size} 格 · Lv. 3</span></div><button type="button" onClick={onExpand}>擴建 {size===6?"800":"2,000"} ◆</button></div><div className={`isometric-room size-${size}`}><div className="wall left-wall"/><div className="wall right-wall"/><div className="diamond-floor"/>{items.map((item)=><button type="button" aria-label={item.name} key={item.name} onClick={()=>onSelect(item.name)} className={`furniture ${item.className} ${selected===item.name?"is-selected":""}`} style={selected===item.name?{rotate:`${rotation}deg`}:undefined}><span>{item.symbol}</span></button>)}</div><div className="edit-bar"><span>已選取：<strong>{selected}</strong></span><div><button type="button" onClick={onRotate}>↻ 旋轉</button><button type="button" onClick={onStore}>收納</button></div></div><div className="section-heading"><h2>快速背包</h2><button type="button" onClick={onShop}>前往商店</button></div><div className="inventory-grid"><button type="button" onClick={()=>onSelect("椅子")}><span>♙</span><small>椅子 ×2</small></button><button type="button" onClick={()=>onSelect("檯燈")}><span>♧</span><small>檯燈 ×1</small></button><button type="button" onClick={()=>onSelect("書櫃")}><span>▥</span><small>書櫃 ×1</small></button><button className="locked" type="button"><span>?</span><small>Lv. 5 解鎖</small></button></div></section>;
}

function ProfileScreen({ tasks, coins, roomSize, onInstall }: { tasks:Task[]; coins:number; roomSize:number; onInstall:()=>void }) {
  const done=tasks.filter((task)=>task.done).length;
  return <section className="screen profile-screen"><div className="profile-card"><div className="avatar">森</div><div><span>角色等級 3</span><h2>專注旅人</h2><div className="level-track"><span style={{width:"64%"}} /></div><small>320 / 500 經驗</small></div></div><div className="stats-grid"><article><span>專注</span><strong>Lv. 4</strong><small>本週 165 分鐘</small></article><article><span>執行</span><strong>Lv. 3</strong><small>完成 {done} 項任務</small></article><article><span>穩定</span><strong>7 天</strong><small>最佳連續紀錄</small></article><article><span>創意</span><strong>{roomSize}×{roomSize}</strong><small>目前房間</small></article></div><div className="section-heading"><h2>最近成就</h2><button type="button">查看全部</button></div><div className="achievement-list"><article><span>✦</span><div><strong>第一步</strong><small>完成第一項任務</small></div><b>已獲得</b></article><article><span>◆</span><div><strong>收藏新手</strong><small>擁有 5 件家具</small></div><b>4 / 5</b></article></div><div className="wallet-row"><span>目前資產</span><strong>{coins.toLocaleString("zh-TW")} 金幣</strong></div><button className="install-button" type="button" onClick={onInstall}>安裝到 Android 主畫面</button><p className="install-help">使用 Android Chrome 開啟後，可像一般 App 一樣加入主畫面。</p></section>;
}
