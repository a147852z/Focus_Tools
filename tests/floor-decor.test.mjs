import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/floor-decor.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { initialFloorDecor, normalizeFloorDecor, purchaseFloor, layFloor } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const rect = { x: 1, y: 2, width: 2, height: 3 };

test("purchase charges for every tile, adds stock, and does not change the floor", () => {
  const result = purchaseFloor(100, initialFloorDecor, "walnut", 2, 3);
  assert.equal(result.coins, 70);
  assert.equal(result.decor.stock.walnut, 6);
  assert.deepEqual(result.decor.tiles, {});
  assert.equal(purchaseFloor(29, initialFloorDecor, "walnut", 2, 3).reason, "funds");
  assert.equal(purchaseFloor(100, initialFloorDecor, "walnut", 1.5, 2).ok, false);
  assert.equal(purchaseFloor(100, initialFloorDecor, "walnut", 0, 2).ok, false);
  assert.equal(purchaseFloor(100, result.decor, "walnut", 1, 1).decor.stock.walnut, 7);
});
test("2 by 3 placement only affects the six selected cells", () => {
  const bought = purchaseFloor(100, initialFloorDecor, "walnut", 2, 3).decor;
  const laid = layFloor(bought, "walnut", rect, 6);
  assert.equal(laid.ok, true);
  assert.deepEqual(Object.keys(laid.decor.tiles), ["1,2","2,2","1,3","2,3","1,4","2,4"]);
  assert.equal(laid.decor.stock.walnut, 0);
  assert.deepEqual(bought.tiles, {});
  const again = layFloor(laid.decor, "walnut", rect, 6);
  assert.equal(again.used, 0);
  assert.deepEqual(again.decor, laid.decor);
});
test("overwriting and removing return old tiles to stock", () => {
  let decor = purchaseFloor(100, initialFloorDecor, "walnut", 2, 3).decor;
  decor = layFloor(decor, "walnut", rect, 6).decor;
  decor = purchaseFloor(100, decor, "cream", 1, 1).decor;
  decor = layFloor(decor, "cream", {...rect,width:1,height:1}, 6).decor;
  assert.equal(decor.stock.walnut, 1);
  assert.equal(decor.tiles["1,2"], "cream");
  decor = layFloor(decor, "original", rect, 6).decor;
  assert.deepEqual(decor.tiles, {});
  assert.equal(decor.stock.walnut, 6);
  assert.equal(decor.stock.cream, 1);
});
test("bounds and insufficient stock reject the entire operation", () => {
  assert.equal(layFloor(initialFloorDecor,"sage",rect,6).reason,"stock");
  assert.equal(layFloor(initialFloorDecor,"original",{...rect,x:5},6).reason,"bounds");
  assert.equal(layFloor(initialFloorDecor,"original",{...rect,height:NaN},6).reason,"bounds");
  assert.deepEqual(initialFloorDecor,{version:2,stock:{},tiles:{}});
});
test("old full-room skins migrate once, retaining layout and unused purchases", () => {
  const migrated = normalizeFloorDecor({owned:["walnut","sage"],active:"walnut"},7);
  assert.equal(Object.keys(migrated.tiles).length,49);
  assert.equal(migrated.stock.sage,49);
  assert.deepEqual(normalizeFloorDecor(migrated,7),migrated);
  const expanded=normalizeFloorDecor(migrated,8);
  assert.equal(Object.keys(expanded.tiles).length,49);
  assert.equal(expanded.tiles["7,7"],undefined);
});
test("backups preserve mixed layouts, malformed data and empty resets stay safe", () => {
  const decor={version:2,stock:{walnut:2,cream:0},tiles:{"1,2":"walnut","3,3":"cream"}};
  const normalized=normalizeFloorDecor(JSON.parse(JSON.stringify(decor)),6);
  assert.deepEqual(normalized.tiles,decor.tiles);
  assert.equal(normalized.stock.walnut,2);
  for (const value of [undefined,null,{},[]]) assert.deepEqual(normalizeFloorDecor(value),initialFloorDecor);
  assert.deepEqual(normalizeFloorDecor({version:2,stock:{sage:-1},tiles:{"99,0":"sage","0,0":"unknown"}}),initialFloorDecor);
});
