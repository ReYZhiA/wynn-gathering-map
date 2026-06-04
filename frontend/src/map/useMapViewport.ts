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

  const zoomByFactorAt = useCallback((screenPoint: ScreenPoint, zoomFactor: number) => {
    setViewport((current) => {
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

  const fitImageBounds = useCallback(
    (
      bounds: { minX: number; minY: number; maxX: number; maxY: number },
      size: { width: number; height: number },
      padding = 48,
    ) => {
      const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
      const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
      const availableWidth = Math.max(1, size.width - padding * 2);
      const availableHeight = Math.max(1, size.height - padding * 2);
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)),
      );
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      setViewport({
        zoom: nextZoom,
        panX: size.width / 2 - centerX * nextZoom,
        panY: size.height / 2 - centerY * nextZoom,
      });
    },
    [],
  );

  const reset = useCallback(() => setViewport(initial), [initial]);

  return {
    viewport,
    imageToScreen,
    screenToImage,
    panBy,
    zoomAt,
    zoomByFactorAt,
    fitImageBounds,
    reset,
  };
}
