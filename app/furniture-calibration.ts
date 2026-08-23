export const furnitureCalibrationStorageKey = "focus-room-furniture-calibration-v2";
export const furnitureCalibrationEvent = "focus-room-furniture-calibration-updated";

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
