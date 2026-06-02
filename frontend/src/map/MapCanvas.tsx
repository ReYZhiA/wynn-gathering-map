import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ClusterTooltip } from "../components/ClusterTooltip";
import { GatheringNodeTooltip } from "../components/GatheringNodeTooltip";
import { TerritoryTooltip } from "../components/TerritoryTooltip";
import type { GatheringNode } from "../types/gatheringNode";
import type { NodeCluster } from "../types/nodeCluster";
import type { Territory } from "../types/territory";
import {
  DEFAULT_MAP_CALIBRATION,
  imageToWorld,
  worldToImage,
  type MapCalibration,
  type ScreenPoint,
} from "./coordinates";
import { drawClusterOutlineOverlay } from "./ClusterOutlineOverlay";
import { drawGatheringNodeOverlay } from "./GatheringNodeOverlay";
import { drawTerritoryOverlay } from "./TerritoryOverlay";
import { useMapViewport } from "./useMapViewport";

type MapCanvasProps = {
  nodes: GatheringNode[];
  territories: Territory[];
  clusters: NodeCluster[];
  selectedNode: GatheringNode | null;
  selectedTerritory: Territory | null;
  selectedCluster: NodeCluster | null;
  showTerritories: boolean;
  showClusters: boolean;
  onSelectNode: (node: GatheringNode | null) => void;
  onSelectTerritory: (territory: Territory | null) => void;
  onSelectCluster: (cluster: NodeCluster | null) => void;
  debugEnabled: boolean;
  onDebugChange: (debug: DebugCoordinateState) => void;
};

export type DebugCoordinateState = {
  image: ScreenPoint | null;
  world: { x: number; z: number } | null;
  zoom: number;
  panX: number;
  panY: number;
};

const HIT_RADIUS = 10;
const NODE_DETAIL_ZOOM = 0.8;

type TouchGestureState = {
  center: ScreenPoint;
  distance: number;
};

export function MapCanvas({
  nodes,
  territories,
  clusters,
  selectedNode,
  selectedTerritory,
  selectedCluster,
  showTerritories,
  showClusters,
  onSelectNode,
  onSelectTerritory,
  onSelectCluster,
  debugEnabled,
  onDebugChange,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<ScreenPoint | null>(null);
  const didDragRef = useRef(false);
  const activePointersRef = useRef(new Map<number, ScreenPoint>());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [imageSize, setImageSize] = useState({
    width: DEFAULT_MAP_CALIBRATION.imageWidth,
    height: DEFAULT_MAP_CALIBRATION.imageHeight,
  });
  const [hoveredNode, setHoveredNode] = useState<GatheringNode | null>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<Territory | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<NodeCluster | null>(null);
  const [pointerScreen, setPointerScreen] = useState<ScreenPoint | null>(null);
  const { viewport, imageToScreen, screenToImage, panBy, zoomAt, zoomByFactorAt, reset } = useMapViewport();
  const activeNode = hoveredNode ?? selectedNode;
  const activeTerritory = hoveredTerritory ?? selectedTerritory;
  const activeCluster = hoveredCluster ?? selectedCluster;
  const calibration: MapCalibration = useMemo(
    () => ({
      ...DEFAULT_MAP_CALIBRATION,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
    }),
    [imageSize.height, imageSize.width],
  );

  const nodeCountsByTerritory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (node.territory) {
        counts.set(node.territory, (counts.get(node.territory) ?? 0) + 1);
      }
    }
    return counts;
  }, [nodes]);

  useEffect(() => {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}assets/wynn-map.png`;
    image.onload = () => {
      imageRef.current = image;
      setImageSize({
        width: image.naturalWidth || DEFAULT_MAP_CALIBRATION.imageWidth,
        height: image.naturalHeight || DEFAULT_MAP_CALIBRATION.imageHeight,
      });
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const findNodeAt = useCallback(
    (screenPoint: ScreenPoint): GatheringNode | null => {
      if (showClusters && clusters.length > 0 && viewport.zoom < NODE_DETAIL_ZOOM) return null;
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        const imagePoint = worldToImage({ x: node.x, z: node.z }, calibration);
        const markerScreenPoint = imageToScreen(imagePoint);
        const distance = Math.hypot(
          markerScreenPoint.x - screenPoint.x,
          markerScreenPoint.y - screenPoint.y,
        );
        if (distance <= HIT_RADIUS) {
          return node;
        }
      }
      return null;
    },
    [calibration, clusters.length, imageToScreen, nodes, showClusters, viewport.zoom],
  );

  const findTerritoryAt = useCallback(
    (screenPoint: ScreenPoint): Territory | null => {
      const worldPoint = imageToWorld(screenToImage(screenPoint), calibration);
      const matches = territories.filter(
        (territory) =>
          territory.bounds.minX <= worldPoint.x &&
          worldPoint.x <= territory.bounds.maxX &&
          territory.bounds.minZ <= worldPoint.z &&
          worldPoint.z <= territory.bounds.maxZ,
      );
      matches.sort(
        (a, b) =>
          (a.bounds.maxX - a.bounds.minX) * (a.bounds.maxZ - a.bounds.minZ) -
          (b.bounds.maxX - b.bounds.minX) * (b.bounds.maxZ - b.bounds.minZ),
      );
      return matches[0] ?? null;
    },
    [calibration, screenToImage, territories],
  );

  const findClusterAt = useCallback(
    (screenPoint: ScreenPoint): NodeCluster | null => {
      for (let index = clusters.length - 1; index >= 0; index -= 1) {
        const cluster = clusters[index];
        const points = cluster.outline.map((point) =>
          imageToScreen(worldToImage({ x: point.x, z: point.z }, calibration)),
        );
        if (points.length === 1 && distance(screenPoint, points[0]) <= HIT_RADIUS) {
          return cluster;
        }
        if (points.length > 2 && pointInPolygon(screenPoint, points)) {
          return cluster;
        }
        for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
          if (distanceToSegment(screenPoint, points[pointIndex], points[pointIndex + 1]) <= HIT_RADIUS) {
            return cluster;
          }
        }
        if (points.length > 2 && distanceToSegment(screenPoint, points[points.length - 1], points[0]) <= HIT_RADIUS) {
          return cluster;
        }
      }
      return null;
    },
    [calibration, clusters, imageToScreen],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const image = imageRef.current;
    if (!canvas || !context || !image) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * devicePixelRatio;
    canvas.height = canvasSize.height * devicePixelRatio;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    context.clearRect(0, 0, canvasSize.width, canvasSize.height);
    context.fillStyle = "#111827";
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    context.save();
    context.setTransform(
      devicePixelRatio * viewport.zoom,
      0,
      0,
      devicePixelRatio * viewport.zoom,
      devicePixelRatio * viewport.panX,
      devicePixelRatio * viewport.panY,
    );
    context.drawImage(image, 0, 0, calibration.imageWidth, calibration.imageHeight);
    context.restore();

    if (showTerritories) {
      drawTerritoryOverlay({
        context,
        territories,
        calibration,
        imageToScreen,
        zoom: viewport.zoom,
        selectedTerritory,
        hoveredTerritory,
        nodeCountsByTerritory,
      });
    }

    if (showClusters) {
      drawClusterOutlineOverlay({
        context,
        clusters,
        calibration,
        imageToScreen,
        highlightedCluster: activeCluster,
        zoom: viewport.zoom,
      });
    }

    if (!showClusters || clusters.length === 0 || viewport.zoom >= NODE_DETAIL_ZOOM) {
      drawGatheringNodeOverlay({
        context,
        nodes,
        calibration,
        imageToScreen,
        zoom: viewport.zoom,
        highlightedNode: activeNode,
      });
    }
  }, [
    activeCluster,
    activeNode,
    canvasSize.height,
    canvasSize.width,
    clusters,
    calibration,
    hoveredTerritory,
    imageToScreen,
    nodeCountsByTerritory,
    nodes,
    selectedTerritory,
    showClusters,
    showTerritories,
    territories,
    viewport,
  ]);

  useEffect(() => {
    const frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    if (!debugEnabled) {
      onDebugChange({ image: null, world: null, zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY });
      return;
    }
    const image = pointerScreen ? screenToImage(pointerScreen) : null;
    onDebugChange({
      image,
      world: image ? imageToWorld(image, calibration) : null,
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
    });
  }, [calibration, debugEnabled, onDebugChange, pointerScreen, screenToImage, viewport]);

  const tooltipPosition = useMemo(() => {
    if (!activeNode) return null;
    return imageToScreen(worldToImage({ x: activeNode.x, z: activeNode.z }, calibration));
  }, [activeNode, calibration, imageToScreen]);

  const territoryTooltipPosition = useMemo(() => {
    if (!activeTerritory) return null;
    const center = {
      x: (activeTerritory.bounds.minX + activeTerritory.bounds.maxX) / 2,
      z: (activeTerritory.bounds.minZ + activeTerritory.bounds.maxZ) / 2,
    };
    return imageToScreen(worldToImage(center, calibration));
  }, [activeTerritory, calibration, imageToScreen]);

  const clusterTooltipPosition = useMemo(() => {
    if (!activeCluster || activeCluster.outline.length === 0) return null;
    const center = activeCluster.outline.reduce(
      (total, point) => ({ x: total.x + point.x, z: total.z + point.z }),
      { x: 0, z: 0 },
    );
    return imageToScreen(
      worldToImage(
        {
          x: center.x / activeCluster.outline.length,
          z: center.z / activeCluster.outline.length,
        },
        calibration,
      ),
    );
  }, [activeCluster, calibration, imageToScreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt({ x: event.clientX - rect.left, y: event.clientY - rect.top }, event.deltaY);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [zoomAt]);

  function getRelativePointer(event: React.PointerEvent<HTMLCanvasElement>): ScreenPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function getTouchGesture(): TouchGestureState | null {
    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length < 2) return null;
    const [first, second] = pointers;
    return {
      center: {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      },
      distance: Math.max(1, distance(first, second)),
    };
  }

  function clearHoverState() {
    setHoveredNode(null);
    setHoveredCluster(null);
    setHoveredTerritory(null);
  }

  return (
    <div className="map-shell" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const screenPoint = getRelativePointer(event);
          activePointersRef.current.set(event.pointerId, screenPoint);
          if (activePointersRef.current.size >= 2) {
            touchGestureRef.current = getTouchGesture();
            dragStartRef.current = null;
            didDragRef.current = true;
            clearHoverState();
            return;
          }
          dragStartRef.current = screenPoint;
          didDragRef.current = false;
        }}
        onPointerMove={(event) => {
          const screenPoint = getRelativePointer(event);
          setPointerScreen(screenPoint);
          if (activePointersRef.current.has(event.pointerId)) {
            activePointersRef.current.set(event.pointerId, screenPoint);
          }
          if (activePointersRef.current.size >= 2) {
            const nextGesture = getTouchGesture();
            const previousGesture = touchGestureRef.current;
            if (nextGesture && previousGesture) {
              panBy(
                nextGesture.center.x - previousGesture.center.x,
                nextGesture.center.y - previousGesture.center.y,
              );
              zoomByFactorAt(nextGesture.center, nextGesture.distance / previousGesture.distance);
            }
            touchGestureRef.current = nextGesture;
            dragStartRef.current = null;
            didDragRef.current = true;
            clearHoverState();
            return;
          }
          if (dragStartRef.current) {
            panBy(screenPoint.x - dragStartRef.current.x, screenPoint.y - dragStartRef.current.y);
            dragStartRef.current = screenPoint;
            didDragRef.current = true;
            return;
          }
          const node = findNodeAt(screenPoint);
          setHoveredNode(node);
          if (node) {
            setHoveredCluster(null);
            setHoveredTerritory(null);
            return;
          }
          const cluster = showClusters ? findClusterAt(screenPoint) : null;
          setHoveredCluster(cluster);
          setHoveredTerritory(cluster || !showTerritories ? null : findTerritoryAt(screenPoint));
        }}
        onPointerUp={(event) => {
          activePointersRef.current.delete(event.pointerId);
          touchGestureRef.current = getTouchGesture();
          dragStartRef.current = null;
          if (didDragRef.current) return;
          const screenPoint = getRelativePointer(event);
          const node = findNodeAt(screenPoint);
          const cluster = node || !showClusters ? null : findClusterAt(screenPoint);
          const territory = node || cluster || !showTerritories ? null : findTerritoryAt(screenPoint);
          onSelectNode(node);
          onSelectCluster(cluster);
          onSelectTerritory(territory);
        }}
        onPointerCancel={(event) => {
          activePointersRef.current.delete(event.pointerId);
          touchGestureRef.current = getTouchGesture();
          dragStartRef.current = null;
          didDragRef.current = true;
          clearHoverState();
        }}
        onPointerLeave={() => {
          activePointersRef.current.clear();
          touchGestureRef.current = null;
          dragStartRef.current = null;
          clearHoverState();
          setPointerScreen(null);
        }}
      />
      <div className="map-actions">
        <button type="button" onClick={reset} title="Reset map view">
          Reset
        </button>
      </div>
      {activeNode && tooltipPosition ? (
        <GatheringNodeTooltip node={activeNode} position={tooltipPosition} />
      ) : null}
      {!activeNode && activeCluster && clusterTooltipPosition ? (
        <ClusterTooltip cluster={activeCluster} position={clusterTooltipPosition} />
      ) : null}
      {!activeNode && !activeCluster && activeTerritory && territoryTooltipPosition ? (
        <TerritoryTooltip
          territory={activeTerritory}
          visibleNodeCount={nodeCountsByTerritory.get(activeTerritory.name) ?? 0}
          position={territoryTooltipPosition}
        />
      ) : null}
    </div>
  );
}

function distance(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: ScreenPoint, start: ScreenPoint, end: ScreenPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return distance(point, start);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
  );
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

function pointInPolygon(point: ScreenPoint, polygon: ScreenPoint[]): boolean {
  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
