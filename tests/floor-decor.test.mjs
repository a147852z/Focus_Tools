import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/floor-decor.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { floorCatalog, initialFloorDecor, normalizeFloorDecor, purchaseFloor, equipFloor } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("older backups and cleared data have no paid floors", () => {
  for (const value of [undefined, null, {}, [], { owned: "sage", active: "sage" }]) {
    assert.deepEqual(normalizeFloorDecor(value), initialFloorDecor);
  }
});

test("floor purchase charges once, equips immediately, and does not mutate prior state", () => {
  for (const floor of floorCatalog.filter((item) => item.price > 0)) {
    const original = { owned: [], active: "original" };
    const result = purchaseFloor(floor.price, original, floor.id);
    assert.equal(result.ok, true);
    assert.equal(result.coins, 0);
    assert.deepEqual(result.decor, { owned: [floor.id], active: floor.id });
    assert.deepEqual(original, initialFloorDecor);
    assert.equal(purchaseFloor(1000, result.decor, floor.id).reason, "owned");
    assert.equal(purchaseFloor(floor.price - 1, original, floor.id).reason, "funds");
    assert.equal(purchaseFloor(NaN, original, floor.id).reason, "funds");
  }
});

test("owned floors switch without spending, unowned floors cannot be equipped", () => {
  const decor = { owned: ["sage", "cream"], active: "sage" };
  assert.equal(equipFloor(decor, "cream").active, "cream");
  assert.equal(equipFloor(decor, "original").active, "original");
  assert.equal(equipFloor(decor, "walnut"), decor);
  assert.deepEqual(decor, { owned: ["sage", "cream"], active: "sage" });
});

test("backup round trip preserves collection; unknown and duplicated ids are sanitized", () => {
  const decor = { owned: ["cream", "sage"], active: "sage" };
  assert.deepEqual(normalizeFloorDecor(JSON.parse(JSON.stringify(decor))), decor);
  assert.deepEqual(normalizeFloorDecor({ owned: ["sage", "sage", "unknown", "original"], active: "walnut" }), { owned: ["sage"], active: "original" });
});
