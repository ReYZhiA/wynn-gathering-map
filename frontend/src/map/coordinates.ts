export type WorldPoint = { x: number; z: number };
export type ScreenPoint = { x: number; y: number };

export type MapCalibration = {
  minWorldX: number;
  maxWorldX: number;
  minWorldZ: number;
  maxWorldZ: number;
  imageWidth: number;
  imageHeight: number;
};

// Calibrated world bounds for frontend/public/assets/wynn-map.png.
// Order from calibration source: [minX, minZ, maxX, maxZ].
export const DEFAULT_MAP_CALIBRATION: MapCalibration = {
  minWorldX: -2559.992015616445,
  maxWorldX: 2048.0018901611634,
  minWorldZ: -6634.997935164797,
  maxWorldZ: 8.989267839958302,
  imageWidth: 4608,
  imageHeight: 6644,
};

export function worldToImage(point: WorldPoint, calibration: MapCalibration): ScreenPoint {
  const xRatio =
    (point.x - calibration.minWorldX) / (calibration.maxWorldX - calibration.minWorldX);
  const zRatio =
    (point.z - calibration.minWorldZ) / (calibration.maxWorldZ - calibration.minWorldZ);

  return {
    x: xRatio * calibration.imageWidth,
    y: zRatio * calibration.imageHeight,
  };
}

export function imageToWorld(point: ScreenPoint, calibration: MapCalibration): WorldPoint {
  const xRatio = point.x / calibration.imageWidth;
  const zRatio = point.y / calibration.imageHeight;

  return {
    x: calibration.minWorldX + xRatio * (calibration.maxWorldX - calibration.minWorldX),
    z: calibration.minWorldZ + zRatio * (calibration.maxWorldZ - calibration.minWorldZ),
  };
}
