"use client";
import { useState } from "react";
import { floorCatalog, floorRectKeys, type FloorDecor, type FloorId, type FloorRect } from "./floor-decor";

export default function FloorEditor({ decor, size, onLay, onShop }: { decor: FloorDecor; size: number; onLay: (id: FloorId, rect: FloorRect) => void; onShop: () => void }) {
  const [id, setId] = useState<FloorId>("walnut");
  const [rect, setRect] = useState<FloorRect>({ x: 0, y: 0, width: 1, height: 1 });
  const keys = floorRectKeys(rect, size);
  const needed = keys.filter((key) => (decor.tiles[key] ?? "original") !== id).length;
  const enough = id === "original" || (decor.stock[id] ?? 0) >= needed;
  return <details className="floor-collection floor-editor" aria-labelledby="floor-collection-title">
    <summary className="floor-editor-toggle"><h2 id="floor-collection-title">局部鋪設地板</h2><span className="floor-expand-hint">展開 ＋</span><span className="floor-collapse-hint">收合 −</span></summary>
    <button className="floor-shop-link" type="button" onClick={onShop}>購買地板 →</button>
    <p className="floor-help">每片覆蓋 1 格。選擇幾乘幾，再點下方格子選擇左上起點。不同圖案可以混搭，家具照常放在上面。</p>
    <label>圖案<select value={id} onChange={(e)=>setId(e.target.value as FloorId)}>{floorCatalog.map((floor)=><option key={floor.id} value={floor.id}>{floor.name} · {floor.id === "original" ? "免費拆除" : `庫存 ${decor.stock[floor.id] ?? 0} 格`}</option>)}</select></label>
    <div className="floor-dimensions">{(["width", "height"] as const).map((key)=><label key={key}>{key==="width"?"寬（格）":"深（格）"}<input type="number" min="1" max={size} step="1" value={rect[key]} onChange={(e)=>setRect({...rect,[key]:Number(e.target.value)})}/></label>)}</div>
    <div className="floor-plan" style={{gridTemplateColumns:`repeat(${size},1fr)`}} aria-label="地板配置，上方為第 1 列，左方為第 1 欄">{Array.from({length:size*size},(_,i)=>{
      const x=i%size,y=Math.floor(i/size),key=`${x},${y}`,floor=decor.tiles[key]??"original";
      return <button type="button" key={key} className={`plan-${floor} ${keys.includes(key)?"is-preview":""}`} aria-pressed={keys.includes(key)} aria-label={`第 ${x+1} 欄第 ${y+1} 列，${floorCatalog.find((f)=>f.id===floor)?.name}`} onClick={()=>setRect({...rect,x,y})}>{x+1},{y+1}</button>;
    })}</div>
    <p className="floor-help" role="status">起點：第 {rect.x+1} 欄、第 {rect.y+1} 列 · {rect.width} × {rect.height} 格。{!keys.length?"範圍超出房間或尺寸無效，請調整。":id==="original"?`拆除 ${needed} 格，圖案退回庫存。`:`需用 ${needed} 格，庫存 ${decor.stock[id]??0} 格${enough?"。":"，請先購買。"}`}</p>
    <button className="floor-apply" type="button" disabled={!keys.length||!enough||needed===0} onClick={()=>onLay(id,rect)}>{id==="original"?"拆除選取範圍並收納":"鋪設選取範圍"}</button>
    <p className="floor-help">覆蓋時舊地板退回庫存，相同圖案不重複消耗。擴建的新格子維持原木地板。</p>
  </details>;
}
