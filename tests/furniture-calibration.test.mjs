import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/furniture-calibration.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { mergeFurnitureCalibrations, defaultFurnitureCalibrations } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("new desk sprite resets obsolete offsets without changing other furniture", () => {
  const result = mergeFurnitureCalibrations({ desk: { width: 153, anchorY: 104.35 }, bed: { width: 177 } });
  assert.deepEqual(result.desk, defaultFurnitureCalibrations.desk);
  assert.equal(result.bed.width, 177);
  assert.equal(result.desk.footprintX, 3);
  assert.equal(result.desk.footprintY, 1);
});

test("current desk calibration can still be customized", () => {
  const result = mergeFurnitureCalibrations({ desk: { assetVersion: 4, width: 190, anchorY: 91 } });
  assert.equal(result.desk.width, 190);
  assert.equal(result.desk.anchorY, 91);
  assert.equal(result.desk.mobileWidth, defaultFurnitureCalibrations.desk.mobileWidth);
});
