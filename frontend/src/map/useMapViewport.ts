import { useCallback, useState } from "react";

import type { ScreenPoint } from "./coordinates";

export type MapViewport = {
  panX: number;
  panY: number;
  zoom: number;
};

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 8;

export function useMapViewport(initial: MapViewport = { panX: 0, panY: 0, zoom: 0.25 }) {
  const [viewport, setViewport] = useState<MapViewport>(initial);

  const imageToScreen = useCallback(
    (point: ScreenPoint): ScreenPoint => ({
      x: point.x * viewport.zoom + viewport.panX,
      y: point.y * viewport.zoom + viewport.panY,
    }),
    [viewport],
  );

  const screenToImage = useCallback(
    (point: ScreenPoint): ScreenPoint => ({
      x: (point.x - viewport.panX) / viewport.zoom,
      y: (point.y - viewport.panY) / viewport.zoom,
    }),
    [viewport],
  );

  const panBy = useCallback((deltaX: number, deltaY: number) => {
    setViewport((current) => ({
      ...current,
      panX: current.panX + deltaX,
      panY: current.panY + deltaY,
    }));
  }, []);

  const zoomAt = useCallback((screenPoint: ScreenPoint, deltaY: number) => {
    setViewport((current) => {
      const zoomFactor = deltaY < 0 ? 1.14 : 0.88;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * zoomFactor));
      const imageX = (screenPoint.x - current.panX) / current.zoom;
      const imageY = (screenPoint.y - current.panY) / current.zoom;

      return {
        zoom: nextZoom,
        panX: screenPoint.x - imageX * nextZoom,
        panY: screenPoint.y - imageY * nextZoom,
      };
    });
  }, []);

  const reset = useCallback(() => setViewport(initial), [initial]);

  return {
    viewport,
    imageToScreen,
    screenToImage,
    panBy,
    zoomAt,
    reset,
  };
}
