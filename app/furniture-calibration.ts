export const furnitureCalibrationStorageKey = "focus-room-furniture-calibration-v2";
export const furnitureCalibrationEvent = "focus-room-furniture-calibration-updated";

export type FurnitureId = "bed" | "desk" | "chair" | "lamp" | "plant" | "rug" | "bookshelf" | "cabinet" | "sofa" | "coffeeTable" | "wardrobe" | "daybed" | "diningTable" | "stool" | "floorLamp" | "lowBookcase";

export type FurnitureCalibration = {
  width: number;
  mobileWidth: number;
  anchorX: number;
  anchorY: number;
  flipOriginX: number;
  flipOriginY: number;
  imageAngle: number;
  footprintX: number;
  footprintY: number;
};

export type FurnitureCalibrationMap = Record<FurnitureId, FurnitureCalibration>;

// These values are the system defaults used on every device. The developer
// page may still save browser-local overrides while a new preset is tested.
export const defaultFurnitureCalibrations: FurnitureCalibrationMap = {
  bed: { width: 139, mobileWidth: 119, anchorX: 53.86, anchorY: 95.77, flipOriginX: 50.34, flipOriginY: 47.96, imageAngle: 0, footprintX: 3, footprintY: 3 },
  desk: { width: 98, mobileWidth: 71, anchorX: 62.59, anchorY: 106.64, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  chair: { width: 56, mobileWidth: 48, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  lamp: { width: 46, mobileWidth: 39, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  plant: { width: 101, mobileWidth: 46, anchorX: 50.99, anchorY: 95.05, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  rug: { width: 110, mobileWidth: 93, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 2 },
  bookshelf: { width: 84, mobileWidth: 71, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  cabinet: { width: 84, mobileWidth: 71, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  sofa: { width: 120, mobileWidth: 104, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 2 },
  coffeeTable: { width: 125, mobileWidth: 106, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  wardrobe: { width: 90, mobileWidth: 76, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  daybed: { width: 135, mobileWidth: 115, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 3 },
  diningTable: { width: 110, mobileWidth: 94, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 2 },
  stool: { width: 56, mobileWidth: 48, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  floorLamp: { width: 55, mobileWidth: 47, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  lowBookcase: { width: 120, mobileWidth: 102, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
};

export function mergeFurnitureCalibrations(overrides?: Partial<Record<FurnitureId, Partial<FurnitureCalibration>>>): FurnitureCalibrationMap {
  return Object.fromEntries(
    (Object.keys(defaultFurnitureCalibrations) as FurnitureId[]).map((id) => [id, { ...defaultFurnitureCalibrations[id], ...overrides?.[id] }]),
  ) as FurnitureCalibrationMap;
}
