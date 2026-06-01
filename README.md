# Wynn Gathering Map

Interactive Wynncraft gathering map with territory overlays and precomputed cluster areas.

The backend fetches Wynncraft map data and exports snapshots for the static site. The frontend renders the map, filters nodes, and shows ranked gathering areas.

## Commands

```bash
npm install
npm --prefix frontend install
cd backend && pip install -e ".[dev]"
```

```bash
npm run dev
npm run build:static
npm run test
```

Use `PYTHON_BIN=/path/to/python` before the npm command if the backend dependencies are in a specific environment.

Map calibration lives in `frontend/src/map/coordinates.ts`.
