"use client";

/* Native images are intentional here: the calibration tool must expose natural pixel dimensions and unoptimized sprite rendering. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { defaultFurnitureCalibrations, furnitureCalibrationEvent, furnitureCalibrationStorageKey, mergeFurnitureCalibrations, type FurnitureCalibration, type FurnitureId } from "../furniture-calibration";

type Calibration = FurnitureCalibration;

type FurnitureAsset = Omit<Calibration, "imageAngle"> & {
  id: FurnitureId;
  name: string;
  src: string;
};

type DragGesture = {
  mode: "move" | "resize" | "rotate" | "pivot";
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  startAnchorX: number;
  startAnchorY: number;
  startFlipOriginX: number;
  startFlipOriginY: number;
  startAngle: number;
  pointerAngle: number;
  rotationCenterX: number;
  rotationCenterY: number;
};

const assets: FurnitureAsset[] = [
  { id: "bed", name: "橡木床", src: "/assets/furniture/bed-grid-v6.png", width: 188, mobileWidth: 160, anchorX: 57.78, anchorY: 85.73, flipOriginX: 57.78, flipOriginY: 85.73, footprintX: 2, footprintY: 3 },
  { id: "desk", name: "書桌", src: "/assets/furniture/desk-grid-v3.png", width: 84, mobileWidth: 71, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 1 },
  { id: "chair", name: "椅子", src: "/assets/furniture/chair-grid-v3.png", width: 56, mobileWidth: 48, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 1, footprintY: 1 },
  { id: "lamp", name: "立燈", src: "/assets/furniture/lamp-grid-v3.png", width: 46, mobileWidth: 39, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 1, footprintY: 1 },
  { id: "plant", name: "盆栽", src: "/assets/furniture/plant-grid-v3.png", width: 54, mobileWidth: 46, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 1, footprintY: 1 },
  { id: "rug", name: "地毯", src: "/assets/furniture/rug-grid-v3.png", width: 110, mobileWidth: 93, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 2 },
  { id: "bookshelf", name: "書櫃", src: "/assets/furniture/bookshelf-grid-v3.png", width: 84, mobileWidth: 71, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 1 },
  { id: "cabinet", name: "矮櫃", src: "/assets/furniture/cabinet-grid-v3.png", width: 84, mobileWidth: 71, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 1 },
  { id: "sofa", name: "青綠雙人沙發", src: "/assets/furniture/sofa-game.png", width: 120, mobileWidth: 104, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 2 },
  { id: "coffeeTable", name: "花茶矮桌", src: "/assets/furniture/coffee-table-game.png", width: 125, mobileWidth: 106, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 1 },
  { id: "wardrobe", name: "青綠橡木衣櫃", src: "/assets/furniture/wardrobe-game.png", width: 90, mobileWidth: 76, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 1 },
  { id: "daybed", name: "森林單人床", src: "/assets/furniture/daybed-game.png", width: 135, mobileWidth: 115, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 3 },
  { id: "diningTable", name: "圓形餐桌", src: "/assets/furniture/dining-table-game.png", width: 110, mobileWidth: 94, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 2 },
  { id: "stool", name: "青綠軟凳", src: "/assets/furniture/stool-game.png", width: 56, mobileWidth: 48, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 1, footprintY: 1 },
  { id: "floorLamp", name: "青綠落地燈", src: "/assets/furniture/floor-lamp-game.png", width: 55, mobileWidth: 47, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 1, footprintY: 1 },
  { id: "lowBookcase", name: "矮書架", src: "/assets/furniture/low-bookcase-game.png", width: 120, mobileWidth: 102, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, footprintX: 2, footprintY: 1 },
  { id: "wallPanel", name: "森林木牆", src: "/assets/furniture/wall-panel-game.png", width: 82, mobileWidth: 70, anchorX: 50.88, anchorY: 97.27, flipOriginX: 50.88, flipOriginY: 97.27, footprintX: 1, footprintY: 1 },
];

function NumericControl({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
  };
  return <label className="dev-control">
    <span>{label}<output>{value}{unit}</output></span>
    <div><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => commit(event.target.value)} /><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => commit(event.target.value)} /></div>
  </label>;
}

export default function DeveloperPage() {
  const [selectedId, setSelectedId] = useState<FurnitureId>("bed");
  const [calibrations, setCalibrations] = useState<Record<FurnitureId, Calibration>>(defaultFurnitureCalibrations);
  const [gridSize, setGridSize] = useState(6);
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(3);
  const [rotation, setRotation] = useState<0 | 90>(0);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [checkerboard, setCheckerboard] = useState(true);
  const [showShadow, setShowShadow] = useState(true);
  const [showGlow, setShowGlow] = useState(false);
  const [toast, setToast] = useState("");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const dragGesture = useRef<DragGesture | null>(null);

  const asset = assets.find((entry) => entry.id === selectedId)!;
  const calibration = calibrations[selectedId];
  const isRotated = rotation === 90;
  const footprint = isRotated ? { width: calibration.footprintY, depth: calibration.footprintX } : { width: calibration.footprintX, depth: calibration.footprintY };
  const renderedWidth = mobilePreview ? calibration.mobileWidth : calibration.width;
  const usedAnchorX = isRotated ? 100 - calibration.anchorX : calibration.anchorX;
  const maxGridX = Math.max(0, gridSize - footprint.width);
  const maxGridY = Math.max(0, gridSize - footprint.depth);
  const safeGridX = Math.min(gridX, maxGridX);
  const safeGridY = Math.min(gridY, maxGridY);
  const anchorGridX = safeGridX + footprint.width;
  const anchorGridY = safeGridY + footprint.depth;
  const anchorLeft = 50 + (anchorGridX - anchorGridY) * 50 / gridSize;
  const anchorTop = (anchorGridX + anchorGridY) * 50 / gridSize;
  const cells = useMemo(() => Array.from({ length: gridSize * gridSize }, (_, index) => ({ x: index % gridSize, y: Math.floor(index / gridSize) })), [gridSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(furnitureCalibrationStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<Record<FurnitureId, Partial<Calibration>>>;
          setCalibrations(mergeFurnitureCalibrations(parsed));
        }
      } catch { /* Ignore invalid local developer data. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateCalibration(key: keyof Calibration, value: number) {
    setCalibrations((current) => ({ ...current, [selectedId]: { ...current[selectedId], [key]: value } }));
  }

  function startDrag(event: React.PointerEvent<HTMLElement>, mode: DragGesture["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stage = event.currentTarget.closest(".dev-stage");
    const centerSelector = mode === "rotate" ? ".dev-pivot-handle" : ".dev-anchor-marker";
    const marker = stage?.querySelector<HTMLElement>(centerSelector)?.getBoundingClientRect();
    const centerX = marker ? marker.left + marker.width / 2 : event.clientX;
    const centerY = marker ? marker.top + marker.height / 2 : event.clientY;
    dragGesture.current = {
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: renderedWidth,
      startHeight: naturalSize.width ? renderedWidth * naturalSize.height / naturalSize.width : renderedWidth,
      startAnchorX: calibration.anchorX,
      startAnchorY: calibration.anchorY,
      startFlipOriginX: calibration.flipOriginX,
      startFlipOriginY: calibration.flipOriginY,
      startAngle: calibration.imageAngle,
      pointerAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI,
      rotationCenterX: centerX,
      rotationCenterY: centerY,
    };
  }

  function continueDrag(event: React.PointerEvent<HTMLElement>) {
    const gesture = dragGesture.current;
    if (!gesture) return;
    const deltaX = event.clientX - gesture.startClientX;
    const deltaY = event.clientY - gesture.startClientY;
    if (gesture.mode === "move") {
      const startingUsedX = isRotated ? 100 - gesture.startAnchorX : gesture.startAnchorX;
      const nextUsedX = Math.max(0, Math.min(100, startingUsedX - deltaX / gesture.startWidth * 100));
      const nextAnchorX = isRotated ? 100 - nextUsedX : nextUsedX;
      const nextAnchorY = Math.max(0, Math.min(120, gesture.startAnchorY - deltaY / gesture.startHeight * 100));
      setCalibrations((current) => ({ ...current, [selectedId]: { ...current[selectedId], anchorX: Number(nextAnchorX.toFixed(2)), anchorY: Number(nextAnchorY.toFixed(2)) } }));
      return;
    }
    if (gesture.mode === "resize") {
      const signedDelta = isRotated ? -deltaX : deltaX;
      const limit = mobilePreview ? 260 : 320;
      const nextWidth = Math.round(Math.max(20, Math.min(limit, gesture.startWidth + signedDelta)));
      updateCalibration(mobilePreview ? "mobileWidth" : "width", nextWidth);
      return;
    }
    if (gesture.mode === "pivot") {
      const radians = calibration.imageAngle * Math.PI / 180;
      const localX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
      const localY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
      const mirroredX = isRotated ? -localX : localX;
      const nextX = Math.max(-50, Math.min(150, gesture.startFlipOriginX + mirroredX / gesture.startWidth * 100));
      const nextY = Math.max(-50, Math.min(150, gesture.startFlipOriginY + localY / gesture.startHeight * 100));
      setCalibrations((current) => ({ ...current, [selectedId]: { ...current[selectedId], flipOriginX: Number(nextX.toFixed(2)), flipOriginY: Number(nextY.toFixed(2)) } }));
      return;
    }
    const pointerAngle = Math.atan2(event.clientY - gesture.rotationCenterY, event.clientX - gesture.rotationCenterX) * 180 / Math.PI;
    let nextAngle = gesture.startAngle + pointerAngle - gesture.pointerAngle;
    nextAngle = ((nextAngle + 540) % 360) - 180;
    const increment = event.shiftKey ? 15 : 1;
    updateCalibration("imageAngle", Math.round(nextAngle / increment) * increment);
  }

  function finishDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragGesture.current = null;
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function savePreset() {
    window.localStorage.setItem(furnitureCalibrationStorageKey, JSON.stringify(calibrations));
    window.dispatchEvent(new Event(furnitureCalibrationEvent));
    notify("校準設定已儲存並套用到正式房間");
  }

  function resetSelected() {
    setCalibrations((current) => ({ ...current, [selectedId]: { ...defaultFurnitureCalibrations[selectedId] } }));
    notify(`${asset.name}已恢復程式預設值`);
  }

  const cssSnippet = `.furniture.grid-positioned.${selectedId}{width:${calibration.width}px;\n  transform-origin:${calibration.flipOriginX}% ${calibration.flipOriginY}%;\n  transform:translate(-${calibration.anchorX}%,-${calibration.anchorY}%) rotate(${calibration.imageAngle}deg) scaleX(1)}\n.furniture.grid-positioned.${selectedId}.is-facing-left{transform:translate(-${(100 - calibration.anchorX).toFixed(2)}%,-${calibration.anchorY}%) rotate(${calibration.imageAngle}deg) scaleX(-1)}\n@media(max-width:520px){.furniture.grid-positioned.${selectedId}{width:${calibration.mobileWidth}px}}`;

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(success);
    } catch { notify("無法存取剪貼簿，請手動選取下方內容"); }
  }

  const previewStyle = {
    left: `${anchorLeft}%`,
    top: `${anchorTop}%`,
    width: `${renderedWidth}px`,
    transform: `translate(-${usedAnchorX}%,-${calibration.anchorY}%) rotate(${calibration.imageAngle}deg) scaleX(${isRotated ? -1 : 1})`,
    transformOrigin: `${calibration.flipOriginX}% ${calibration.flipOriginY}%`,
    filter: `${showShadow ? "drop-shadow(0 7px 4px rgba(35,20,10,.42))" : ""} ${showGlow ? "drop-shadow(0 0 4px #ffd86a) drop-shadow(0 0 2px #ffd86a)" : ""}`.trim() || "none",
  };

  return <main className="dev-page">
    <header className="dev-header">
      <div><span className="dev-kicker">FOCUS ROOM · DEVELOPER TOOL</span><h1>家具圖片校準台</h1><p>調整圖片顯示尺寸與落地錨點，讓家具精準貼齊等角格線。</p></div>
      <nav><Link href="/?screen=room">返回房間</Link><button type="button" onClick={savePreset}>儲存並套用</button></nav>
    </header>

    <section className="dev-workspace">
      <aside className="dev-panel dev-assets-panel">
        <div className="dev-panel-title"><span>01</span><div><strong>選擇家具</strong><small>{assets.length} 個可校準資產</small></div></div>
        <div className="dev-asset-list">{assets.map((entry) => <button type="button" key={entry.id} className={selectedId === entry.id ? "is-active" : ""} onClick={() => setSelectedId(entry.id)}><span className="dev-thumb"><img src={entry.src} alt="" /></span><span><strong>{entry.name}</strong><small>{entry.id} · {calibrations[entry.id].width}px</small></span></button>)}</div>
      </aside>

      <section className="dev-stage-column">
        <div className="dev-stage-toolbar">
          <div className="dev-segmented"><button type="button" className={!mobilePreview ? "is-active" : ""} onClick={() => setMobilePreview(false)}>桌面</button><button type="button" className={mobilePreview ? "is-active" : ""} onClick={() => setMobilePreview(true)}>手機</button></div>
          <label className="dev-grid-size">房間<select value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))}><option value={6}>6 × 6</option><option value={7}>7 × 7</option><option value={8}>8 × 8</option></select></label>
          <label><input type="checkbox" checked={checkerboard} onChange={(event) => setCheckerboard(event.target.checked)} />透明格</label>
          <label><input type="checkbox" checked={showShadow} onChange={(event) => setShowShadow(event.target.checked)} />陰影</label>
          <label><input type="checkbox" checked={showGlow} onChange={(event) => setShowGlow(event.target.checked)} />選取光暈</label>
        </div>
        <div className={`dev-stage size-${gridSize} ${checkerboard ? "show-checkerboard" : ""} ${mobilePreview ? "is-mobile" : ""}`}>
          <div className="dev-room-floor" />
          <div className="dev-room-grid">{cells.map((cell) => {
            const occupied = cell.x >= safeGridX && cell.x < safeGridX + footprint.width && cell.y >= safeGridY && cell.y < safeGridY + footprint.depth;
            return <span key={`${cell.x}-${cell.y}`} className={occupied ? "is-occupied" : ""} style={{ left: `${50 + (cell.x - cell.y) * 50 / gridSize}%`, top: `${(cell.x + cell.y + 1) * 50 / gridSize}%`, width: `${100 / gridSize}%`, height: `${100 / gridSize}%` }}><i>{cell.x + 1},{cell.y + 1}</i></span>;
          })}</div>
          <div className="dev-furniture-layer">
            <div className="dev-image-box" style={previewStyle} onPointerDown={(event) => startDrag(event, "move")} onPointerMove={continueDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
              <img src={asset.src} alt={asset.name} draggable={false} onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
              <button type="button" className="dev-rotate-handle" aria-label="拖曳旋轉圖片" title="拖曳旋轉；按住 Shift 吸附 15°" onPointerDown={(event) => startDrag(event, "rotate")} />
              <button type="button" className="dev-resize-handle" aria-label="拖曳調整圖片大小" title="拖曳調整圖片大小" onPointerDown={(event) => startDrag(event, "resize")} />
              <button type="button" className="dev-pivot-handle" style={{ left: `${calibration.flipOriginX}%`, top: `${calibration.flipOriginY}%` }} aria-label="拖曳設定翻轉重心" title="拖曳設定翻轉重心" onPointerDown={(event) => startDrag(event, "pivot")} />
            </div>
            <span className="dev-anchor-marker" style={{ left: `${anchorLeft}%`, top: `${anchorTop}%` }}><i /></span>
          </div>
          <div className="dev-stage-readout"><b>{renderedWidth}px</b><span>朝向 {rotation}°</span><span>圖片角度 {calibration.imageAngle}°</span><span>錨點 {usedAnchorX.toFixed(2)}%, {calibration.anchorY.toFixed(2)}%</span><span>翻轉重心 {calibration.flipOriginX.toFixed(2)}%, {calibration.flipOriginY.toFixed(2)}%</span><span>占地 {footprint.width} × {footprint.depth}</span></div>
        </div>
        <div className="dev-position-strip">
          <span>格線位置</span>
          <button type="button" onClick={() => setGridY(Math.max(0, safeGridY - 1))}>↑</button><button type="button" onClick={() => setGridX(Math.max(0, safeGridX - 1))}>←</button><button type="button" onClick={() => setGridX(Math.min(maxGridX, safeGridX + 1))}>→</button><button type="button" onClick={() => setGridY(Math.min(maxGridY, safeGridY + 1))}>↓</button>
          <b>X {safeGridX + 1} · Y {safeGridY + 1}</b>
          <span className="dev-rotation-label">等角朝向</span>
          <button type="button" aria-label="逆時針旋轉 90 度" onClick={() => setRotation((value) => value === 0 ? 90 : 0)}>↶ 90°</button>
          <b className="dev-rotation-value">{rotation}° · {rotation === 0 ? "朝右" : "朝左"}</b>
          <button type="button" aria-label="順時針旋轉 90 度" onClick={() => setRotation((value) => value === 0 ? 90 : 0)}>↷ 90°</button>
        </div>
      </section>

      <aside className="dev-panel dev-controls-panel">
        <div className="dev-panel-title"><span>02</span><div><strong>尺寸與錨點</strong><small>即時套用到中央預覽</small></div></div>
        <div className="dev-control-group"><h2>顯示尺寸</h2><NumericControl label="桌面寬度" value={calibration.width} min={20} max={320} unit="px" onChange={(value) => updateCalibration("width", value)} /><NumericControl label="手機寬度" value={calibration.mobileWidth} min={20} max={260} unit="px" onChange={(value) => updateCalibration("mobileWidth", value)} /></div>
        <div className="dev-control-group"><h2>落地錨點</h2><NumericControl label="水平位置" value={calibration.anchorX} min={0} max={100} step={0.01} unit="%" onChange={(value) => updateCalibration("anchorX", value)} /><NumericControl label="垂直位置" value={calibration.anchorY} min={0} max={120} step={0.01} unit="%" onChange={(value) => updateCalibration("anchorY", value)} /><p>紅色十字是格線落點。調整到家具最前方的落地角即可。</p></div>
        <div className="dev-control-group"><h2>翻轉重心</h2><NumericControl label="重心水平位置" value={calibration.flipOriginX} min={-50} max={150} step={0.01} unit="%" onChange={(value) => updateCalibration("flipOriginX", value)} /><NumericControl label="重心垂直位置" value={calibration.flipOriginY} min={-50} max={150} step={0.01} unit="%" onChange={(value) => updateCalibration("flipOriginY", value)} /><p>紫色菱形是翻轉與自由旋轉的中心，可直接在圖片上拖曳。</p></div>
        <div className="dev-control-group"><h2>占地尺寸</h2><NumericControl label="床頭／床尾寬" value={calibration.footprintX} min={1} max={6} onChange={(value) => updateCalibration("footprintX", value)} /><NumericControl label="側身長度" value={calibration.footprintY} min={1} max={6} onChange={(value) => updateCalibration("footprintY", value)} /></div>
        <div className="dev-meta"><span>原圖尺寸<b>{naturalSize.width || "—"} × {naturalSize.height || "—"}</b></span><span>比例<b>{naturalSize.width ? (naturalSize.width / naturalSize.height).toFixed(3) : "—"}</b></span><span>檔案<b>{asset.src.split("/").pop()}</b></span></div>
        <div className="dev-panel-actions"><button type="button" onClick={resetSelected}>恢復預設</button><button type="button" className="primary" onClick={() => copyText(cssSnippet, "CSS 已複製")}>複製 CSS</button></div>
      </aside>
    </section>

    <section className="dev-output">
      <div><span className="dev-kicker">GENERATED OUTPUT</span><h2>可直接套用的 CSS</h2><p>數值會依目前選取的家具即時更新；確認後複製到 globals.css。</p></div>
      <pre><code>{cssSnippet}</code></pre>
      <div className="dev-output-actions">
        <button type="button" onClick={() => copyText(JSON.stringify({ id: selectedId, src: asset.src, rotation, ...calibration }, null, 2), "目前家具 JSON 已複製")}>複製目前家具</button>
        <button type="button" onClick={() => copyText(JSON.stringify(calibrations, null, 2), "全部校準 JSON 已複製")}>複製全部校準</button>
      </div>
    </section>
    {toast && <div className="dev-toast" role="status">{toast}</div>}
  </main>;
}
