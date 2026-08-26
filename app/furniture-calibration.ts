export const furnitureCalibrationStorageKey = "focus-room-furniture-calibration-v2";
export const furnitureCalibrationEvent = "focus-room-furniture-calibration-updated";

export type FurnitureId = "bed" | "desk" | "chair" | "lamp" | "plant" | "rug" | "bookshelf" | "cabinet" | "sofa" | "coffeeTable" | "wardrobe" | "daybed" | "diningTable" | "stool" | "floorLamp" | "lowBookcase" | "wallPanel";

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
  bed: { width: 139, mobileWidth: 119, anchorX: 58.9, anchorY: 92.18, flipOriginX: 50.34, flipOriginY: 47.96, imageAngle: 0, footprintX: 3, footprintY: 2 },
  desk: { width: 153, mobileWidth: 71, anchorX: 68.51, anchorY: 104.35, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 3, footprintY: 1 },
  chair: { width: 92, mobileWidth: 48, anchorX: 52.17, anchorY: 88.79, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  lamp: { width: 78, mobileWidth: 39, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  plant: { width: 101, mobileWidth: 46, anchorX: 50.99, anchorY: 95.05, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  rug: { width: 110, mobileWidth: 93, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 2 },
  bookshelf: { width: 147, mobileWidth: 71, anchorX: 57.48, anchorY: 97.96, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  cabinet: { width: 121, mobileWidth: 71, anchorX: 59.09, anchorY: 102.48, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  sofa: { width: 120, mobileWidth: 104, anchorX: 63.33, anchorY: 110.25, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 3, footprintY: 2 },
  coffeeTable: { width: 125, mobileWidth: 106, anchorX: 68.4, anchorY: 120, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 4, footprintY: 2 },
  wardrobe: { width: 65, mobileWidth: 76, anchorX: 71.76, anchorY: 106.75, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 1 },
  daybed: { width: 135, mobileWidth: 115, anchorX: 64.07, anchorY: 113.04, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 4, footprintY: 3 },
  diningTable: { width: 57, mobileWidth: 94, anchorX: 48.24, anchorY: 120, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 2, footprintY: 2 },
  stool: { width: 42, mobileWidth: 48, anchorX: 50, anchorY: 100, flipOriginX: 50, flipOriginY: 100, imageAngle: 0, footprintX: 1, footprintY: 1 },
  floorLamp: { width: 49, mobileWidth: 47, anchorX: 39.05, anchorY: 107.18, flipOriginX: 45.93, flipOriginY: 85.01, imageAngle: 0, footprintX: 1, footprintY: 1 },
  lowBookcase: { width: 108, mobileWidth: 102, anchorX: 66.91, anchorY: 120, flipOriginX: 48.15, flipOriginY: 100, imageAngle: 0, footprintX: 4, footprintY: 3 },
  wallPanel: { width: 53, mobileWidth: 70, anchorX: 50.33, anchorY: 106.81, flipOriginX: 50.88, flipOriginY: 97.27, imageAngle: 0, footprintX: 1, footprintY: 1 },
};

export function mergeFurnitureCalibrations(overrides?: Partial<Record<FurnitureId, Partial<FurnitureCalibration>>>): FurnitureCalibrationMap {
  return Object.fromEntries(
    (Object.keys(defaultFurnitureCalibrations) as FurnitureId[]).map((id) => [id, { ...defaultFurnitureCalibrations[id], ...overrides?.[id] }]),
  ) as FurnitureCalibrationMap;
}
