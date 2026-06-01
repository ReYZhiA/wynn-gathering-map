import type { GatheringNode } from "../types/gatheringNode";
import { worldToImage, type MapCalibration, type ScreenPoint } from "./coordinates";
import { getMarkerFill } from "./resourceStyles";

export type DrawOverlayOptions = {
  context: CanvasRenderingContext2D;
  nodes: GatheringNode[];
  calibration: MapCalibration;
  imageToScreen: (point: ScreenPoint) => ScreenPoint;
  zoom: number;
  highlightedNode: GatheringNode | null;
};

function drawDiamond(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.moveTo(x, y - size);
  context.lineTo(x + size, y);
  context.lineTo(x, y + size);
  context.lineTo(x - size, y);
  context.closePath();
}

export function drawGatheringNodeOverlay({
  context,
  nodes,
  calibration,
  imageToScreen,
  zoom,
  highlightedNode,
}: DrawOverlayOptions) {
  const markerRadius = Math.max(3, Math.min(9, 4 * Math.sqrt(zoom)));

  for (const node of nodes) {
    const imagePoint = worldToImage({ x: node.x, z: node.z }, calibration);
    const screenPoint = imageToScreen(imagePoint);
    const fill = getMarkerFill(node.resource);
    const isHighlighted = highlightedNode === node;
    const size = isHighlighted ? markerRadius + 3 : markerRadius;

    context.save();
    context.fillStyle = fill;
    context.strokeStyle = isHighlighted ? "#ffffff" : "#111827";
    context.lineWidth = isHighlighted ? 3 : 1.5;

    if (node.type === "NODE") {
      context.beginPath();
      context.arc(screenPoint.x, screenPoint.y, size, 0, Math.PI * 2);
    } else if (node.type === "WALL") {
      context.beginPath();
      context.rect(screenPoint.x - size, screenPoint.y - size, size * 2, size * 2);
    } else {
      drawDiamond(context, screenPoint.x, screenPoint.y, size);
    }

    context.fill();
    context.stroke();
    context.restore();
  }
}
