import type { NodeCluster } from "../types/nodeCluster";
import { worldToImage, type MapCalibration, type ScreenPoint } from "./coordinates";
import { getMarkerFill } from "./resourceStyles";

export type DrawClusterOutlineOverlayOptions = {
  context: CanvasRenderingContext2D;
  clusters: NodeCluster[];
  calibration: MapCalibration;
  imageToScreen: (point: ScreenPoint) => ScreenPoint;
  highlightedCluster: NodeCluster | null;
};

export function drawClusterOutlineOverlay({
  context,
  clusters,
  calibration,
  imageToScreen,
  highlightedCluster,
}: DrawClusterOutlineOverlayOptions) {
  for (const cluster of clusters) {
    if (cluster.outline.length === 0) continue;
    const points = cluster.outline.map((point) =>
      imageToScreen(worldToImage({ x: point.x, z: point.z }, calibration)),
    );
    const highlighted = highlightedCluster?.id === cluster.id;
    const color = getMarkerFill(cluster.dominantResource);

    context.save();
    context.strokeStyle = color;
    context.fillStyle = highlighted ? "rgba(248, 250, 252, 0.12)" : "rgba(248, 250, 252, 0.04)";
    context.lineWidth = highlighted ? 4 : 2;
    context.setLineDash(highlighted ? [] : [7, 5]);
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

    for (const point of points) {
      context.beginPath();
      context.arc(point.x, point.y, highlighted ? 4 : 2.5, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    }

    context.restore();
  }
}
