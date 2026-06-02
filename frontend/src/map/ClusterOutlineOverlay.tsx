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

const MIN_HULL_PADDING_PX = 4;
const MAX_HULL_PADDING_PX = 12;
const SMOOTHING_PASSES = 2;

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
    const displayPoints = buildClusterDisplayOutline(points, zoom);
    const highlighted = highlightedCluster?.id === cluster.id;
    const color = getMarkerFill(cluster.dominantResource);
    const center = displayPoints.reduce(
      (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
      { x: 0, y: 0 },
    );
    center.x /= displayPoints.length;
    center.y /= displayPoints.length;

    context.save();
    context.strokeStyle = color;
    context.globalAlpha = highlighted ? 1 : isAreaOverview ? 0.9 : 0.72;
    context.fillStyle = highlighted
      ? "rgba(248, 250, 252, 0.18)"
      : isAreaOverview
        ? "rgba(248, 250, 252, 0.14)"
        : "rgba(248, 250, 252, 0.055)";
    context.lineWidth = highlighted ? 4 : isAreaOverview ? 2.5 : 1.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(displayPoints[0].x, displayPoints[0].y);
    for (const point of displayPoints.slice(1)) {
      context.lineTo(point.x, point.y);
    }
    if (displayPoints.length > 2) {
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

export function buildClusterDisplayOutline(points: ScreenPoint[], zoom: number): ScreenPoint[] {
  if (points.length < 3) return points;
  let displayPoints = expandFromCentroid(points, hullPaddingForZoom(zoom));
  for (let pass = 0; pass < SMOOTHING_PASSES; pass += 1) {
    displayPoints = chaikinClosedPass(displayPoints);
  }
  return displayPoints;
}

function hullPaddingForZoom(zoom: number): number {
  const t = Math.max(0, Math.min(1, (zoom - 0.3) / 0.9));
  return MIN_HULL_PADDING_PX + (MAX_HULL_PADDING_PX - MIN_HULL_PADDING_PX) * t;
}

function expandFromCentroid(points: ScreenPoint[], padding: number): ScreenPoint[] {
  const center = points.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
    { x: 0, y: 0 },
  );
  center.x /= points.length;
  center.y /= points.length;
  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return point;
    const scale = (length + padding) / length;
    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  });
}

function chaikinClosedPass(points: ScreenPoint[]): ScreenPoint[] {
  return points.flatMap((point, index) => {
    const next = points[(index + 1) % points.length];
    return [
      {
        x: point.x * 0.75 + next.x * 0.25,
        y: point.y * 0.75 + next.y * 0.25,
      },
      {
        x: point.x * 0.25 + next.x * 0.75,
        y: point.y * 0.25 + next.y * 0.75,
      },
    ];
  });
}
