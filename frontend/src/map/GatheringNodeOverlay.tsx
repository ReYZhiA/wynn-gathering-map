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

function getNodeMarkerStyle(node: GatheringNode, isHighlighted: boolean) {
  if (node.devComparisonStatus === "new") {
    return {
      fill: "#22c55e",
      stroke: isHighlighted ? "#ffffff" : "#bbf7d0",
      lineWidth: isHighlighted ? 3 : 2,
      sizeOffset: 2,
    };
  }

  if (node.devComparisonStatus === "outdated") {
    return {
      fill: "#ef4444",
      stroke: isHighlighted ? "#ffffff" : "#fee2e2",
      lineWidth: isHighlighted ? 3 : 2,
      sizeOffset: 2,
    };
  }

  if (node.devComparisonStatus === "matched") {
    return {
      fill: node.devSource === "scan" ? "rgba(34, 211, 238, 0.26)" : getMarkerFill(node.resource),
      stroke: isHighlighted ? "#ffffff" : "#22d3ee",
      lineWidth: isHighlighted ? 3 : 2,
      sizeOffset: node.devSource === "scan" ? 4 : 0,
    };
  }

  return {
    fill: getMarkerFill(node.resource),
    stroke: isHighlighted ? "#ffffff" : "#111827",
    lineWidth: isHighlighted ? 3 : 1.5,
    sizeOffset: 0,
  };
}

function drawOutdatedSlash(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.moveTo(x - size * 0.75, y - size * 0.75);
  context.lineTo(x + size * 0.75, y + size * 0.75);
  context.moveTo(x + size * 0.75, y - size * 0.75);
  context.lineTo(x - size * 0.75, y + size * 0.75);
  context.stroke();
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
    const isHighlighted = highlightedNode === node;
    const style = getNodeMarkerStyle(node, isHighlighted);
    const size = (isHighlighted ? markerRadius + 3 : markerRadius) + style.sizeOffset;

    context.save();
    context.fillStyle = style.fill;
    context.strokeStyle = style.stroke;
    context.lineWidth = style.lineWidth;

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

    if (node.devComparisonStatus === "outdated") {
      context.strokeStyle = "#111827";
      context.lineWidth = Math.max(1.5, style.lineWidth - 0.5);
      drawOutdatedSlash(context, screenPoint.x, screenPoint.y, size);
    }

    context.restore();
  }
}
