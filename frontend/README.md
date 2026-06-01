# Wynncraft Gathering Map Frontend

React + Vite + TypeScript frontend for displaying Wynncraft gathering nodes over a map canvas.

## Run

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and calls the backend at `http://localhost:8000` by default.

Override the backend URL with:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Map Image

Place the map image at:

```text
frontend/public/assets/wynn-map.png
```

This repo includes a placeholder image so the canvas can start. Replace it with the real Wynncraft map image before calibration.

## Coordinate Calibration

Tune the map coordinate transform in:

```text
frontend/src/map/coordinates.ts
```

`DEFAULT_MAP_CALIBRATION` contains approximate world bounds. Enable `Debug coordinates` in the UI to compare mouse image coordinates with estimated Minecraft `x` and `z` coordinates.

## Territories and Clusters

The frontend fetches territories from `GET /api/territories` and renders them as semi-transparent rectangles using the shared coordinate transform. Territory names appear when zoomed in or when hovered/selected.

Cluster outlines are fetched from `GET /api/node-clusters` with the active node filters and cluster controls. The returned outline is drawn as a polygon or polyline through exterior node coordinates; the frontend does not draw bounding boxes for clusters.

For GitHub Pages/static builds, set:

```text
VITE_STATIC_DATA=true
```

Then the frontend reads `public/data/*.json` instead of calling the backend. Generate those files from the repo root with:

```bash
npm run export:static
```

Controls:

- Toggle territory overlay.
- Toggle cluster outlines.
- Tune clustering radius (`eps`).
- Tune minimum samples.
- Cluster by resource.
- Cluster by territory.
