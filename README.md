# Wynncraft Gathering Map

Standalone interactive map for Wynncraft gathering nodes.

It contains:

- `backend/`: FastAPI service for Wynncraft data, territory normalization, and node clustering.
- `frontend/`: React, Vite, and TypeScript canvas map UI.

This repo is separated from the player data app so it can be hosted and developed independently.

## Data Sources

The backend calls the normal Wynncraft API:

```text
GET https://api.wynncraft.com/v3/map/gathering-nodes
GET https://api.wynncraft.com/v3/guild/list/territory
```

In local live mode, the frontend calls only the local backend:

```text
GET http://localhost:8000/api/gathering-nodes
GET http://localhost:8000/api/territories
GET http://localhost:8000/api/node-clusters
```

Gathering nodes are cached in memory for 3600 seconds. If Wynncraft fails after data was cached, the backend returns stale cached data with a warning. No API key is required by default.

In static GitHub Pages mode, a build step exports those API responses into:

```text
frontend/public/data/gathering-nodes.json
frontend/public/data/territories.json
frontend/public/data/node-clusters.json
```

The frontend then reads those JSON files instead of calling a backend.

## Local Setup

Backend dependencies:

```bash
cd backend
micromamba create -y -n wynn-map python=3.11
micromamba activate wynn-map
pip install -e ".[dev]"
```

Frontend/root dependencies:

```bash
npm install
npm --prefix frontend install
```

Run both apps from the repo root:

```bash
npm run dev
```

If your backend dependencies are in a micromamba environment that is not active in the current shell, pass the Python binary explicitly:

```bash
PYTHON_BIN=/home/baptiste/micromamba/envs/wynn-eco/bin/python3 npm run dev
```

Local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

Run them separately:

```bash
npm run backend
npm run frontend
```

## Map Image And Calibration

The map image belongs here:

```text
frontend/public/assets/wynn-map.png
```

Tune map coordinate bounds in:

```text
frontend/src/map/coordinates.ts
```

The app uses Minecraft `x,z` for 2D placement. `y` is kept for tooltips but ignored for marker placement.

## Territories

Territory data is fetched from Wynncraft unless a local file is provided. To use a local file, place `territories.json` at `backend/territories.json` or set:

```text
TERRITORIES_JSON_PATH=/path/to/territories.json
```

Expected local shape:

```json
{
  "Territory Name": {
    "resources": { "ore": "3600" },
    "Trading Routes": ["Other Territory"],
    "Location": {
      "start": [0, -100],
      "end": [100, -200]
    }
  }
}
```

Bounds are normalized because start/end order is not guaranteed. A node is inside a territory when its `x,z` point is inside that rectangle. If multiple territories match, the smallest area wins.

Known limitation: territory bounds are rectangular until better polygon data is added.

## Clustering

`GET /api/node-clusters` clusters gathering nodes in world `x,z` space.

Defaults:

```text
NODE_CLUSTER_EPS=90
NODE_CLUSTER_MIN_SAMPLES=3
NODE_CLUSTER_BY_RESOURCE=true
NODE_CLUSTER_BY_TERRITORY=false
```

`eps` is the clustering radius in world coordinates. `min_samples` is the minimum number of nearby nodes needed to form a cluster. Nodes that do not belong to a cluster are treated as noise and do not get an outline.

Cluster outlines are generated from exterior node geometry. They are not axis-aligned bounding boxes. For larger clusters the backend attempts an alpha-shape-like outline and falls back to a convex hull if needed.

## Build And Test

```bash
npm run build
npm run test
```

## Static GitHub Pages

Static mode is the GitHub Pages path. It precomputes a snapshot of nodes, territories, and cluster outlines at build time.

Manual static build:

```bash
npm run build:static
```

With an explicit micromamba Python:

```bash
PYTHON_BIN=/home/baptiste/micromamba/envs/wynn-eco/bin/python3 npm run build:static
```

Deploy:

```text
frontend/dist
```

For a GitHub project page, set the Vite base path to the repo name:

```bash
VITE_BASE_PATH=/wynn-gathering-map/ npm run build:static
```

The included workflow at `.github/workflows/deploy-pages.yml` does this automatically on pushes to `main`.

Setup in GitHub:

1. Push this repo to GitHub.
2. Go to `Settings -> Pages`.
3. Set source to `GitHub Actions`.
4. Push to `main` or run the workflow manually.

Static mode remains interactive for pan, zoom, hover/click tooltips, filters, territory toggles, and viewing the exported cluster outlines. It cannot fetch fresh Wynncraft data or recompute clusters in the browser. To refresh data or change clustering parameters, rerun `npm run build:static` and redeploy.

To tune the exported cluster snapshot:

```bash
cd backend
python3 -m app.static_export --output ../frontend/public/data --eps 90 --min-samples 3 --by-resource true --by-territory false
```

## Future Work

- Add loot pools.
- Add map markers.
- Add route overlays.
- Add profession-specific heatmaps.
- Replace rectangular territory bounds with polygon geometry when available.
