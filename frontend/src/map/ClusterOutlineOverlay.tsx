import type { NodeCluster } from "../types/nodeCluster";
import { worldToImage, type MapCalibration, type ScreenPoint } from "./coordinates";
import { getMarkerFill } from "./resourceStyles";

export type DrawClusterOutlineOverlayOptions = {
  context: CanvasRenderingContext2D;
  clusters: NodeCluster[];
  calibration: MapCalibration;
  imageToScreen: (point: ScreenPoint) => ScreenPoint;
  highlightedCluster: NodeCluster | null;
  zoom: number;
};

export function drawClusterOutlineOverlay({
  context,
  clusters,
  calibration,
  imageToScreen,
  highlightedCluster,
  zoom,
}: DrawClusterOutlineOverlayOptions) {
  const isAreaOverview = zoom < 0.8;
  for (const cluster of clusters) {
    if (cluster.outline.length === 0) continue;
    const points = cluster.outline.map((point) =>
      imageToScreen(worldToImage({ x: point.x, z: point.z }, calibration)),
    );
    const highlighted = highlightedCluster?.id === cluster.id;
    const color = getMarkerFill(cluster.dominantResource);
    const center = points.reduce(
      (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
      { x: 0, y: 0 },
    );
    center.x /= points.length;
    center.y /= points.length;

    context.save();
    context.strokeStyle = color;
    context.globalAlpha = highlighted ? 1 : isAreaOverview ? 0.9 : 0.72;
    context.fillStyle = highlighted
      ? "rgba(248, 250, 252, 0.18)"
      : isAreaOverview
        ? "rgba(248, 250, 252, 0.14)"
        : "rgba(248, 250, 252, 0.055)";
    context.lineWidth = highlighted ? 4 : isAreaOverview ? 2.5 : 1.5;
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      context.lineTo(point.x, point.y);
    }
    if (points.length > 2) {
      context.closePath();
      context.fill();
    }
    context.stroke();

    if (isAreaOverview || highlighted) {
      context.beginPath();
      context.arc(center.x, center.y, highlighted ? 10 : 7, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.fillStyle = "#f8fafc";
      context.font = highlighted ? "700 13px Inter, sans-serif" : "700 11px Inter, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(cluster.nodeCount), center.x, center.y);
    }

    if (highlighted) {
      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
      }
    }

    context.restore();
  }
}
