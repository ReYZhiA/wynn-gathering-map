import type { Territory } from "../types/territory";
import { worldToImage, type MapCalibration, type ScreenPoint } from "./coordinates";

export type DrawTerritoryOverlayOptions = {
  context: CanvasRenderingContext2D;
  territories: Territory[];
  calibration: MapCalibration;
  imageToScreen: (point: ScreenPoint) => ScreenPoint;
  zoom: number;
  selectedTerritory: Territory | null;
  hoveredTerritory: Territory | null;
  nodeCountsByTerritory: Map<string, number>;
};

export function drawTerritoryOverlay({
  context,
  territories,
  calibration,
  imageToScreen,
  zoom,
  selectedTerritory,
  hoveredTerritory,
  nodeCountsByTerritory,
}: DrawTerritoryOverlayOptions) {
  for (const territory of territories) {
    const topLeft = imageToScreen(
      worldToImage({ x: territory.bounds.minX, z: territory.bounds.minZ }, calibration),
    );
    const bottomRight = imageToScreen(
      worldToImage({ x: territory.bounds.maxX, z: territory.bounds.maxZ }, calibration),
    );
    const x = Math.min(topLeft.x, bottomRight.x);
    const y = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);
    const highlighted = selectedTerritory?.name === territory.name || hoveredTerritory?.name === territory.name;

    context.save();
    context.fillStyle = highlighted ? "rgba(251, 191, 36, 0.18)" : "rgba(14, 165, 233, 0.08)";
    context.strokeStyle = highlighted ? "rgba(251, 191, 36, 0.9)" : "rgba(125, 211, 252, 0.35)";
    context.lineWidth = highlighted ? 2 : 1;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);

    if (highlighted || zoom > 1.1) {
      const count = nodeCountsByTerritory.get(territory.name) ?? 0;
      context.fillStyle = "rgba(15, 23, 42, 0.86)";
      context.strokeStyle = "rgba(148, 163, 184, 0.55)";
      context.font = "12px Inter, sans-serif";
      const label = `${territory.name}${count > 0 ? ` (${count})` : ""}`;
      const textWidth = context.measureText(label).width;
      const labelX = x + 6;
      const labelY = y + 18;
      context.fillRect(labelX - 4, labelY - 13, textWidth + 8, 18);
      context.strokeRect(labelX - 4, labelY - 13, textWidth + 8, 18);
      context.fillStyle = "#f8fafc";
      context.fillText(label, labelX, labelY);
    }

    context.restore();
  }
}
