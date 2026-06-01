# Wynncraft Gathering Map Backend

FastAPI service that fetches gathering nodes from `GET https://api.wynncraft.com/v3/map/gathering-nodes`, validates them with Pydantic, and exposes them to the local frontend through `/api/gathering-nodes`.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

If you prefer micromamba:

```bash
micromamba create -y -n wynn-map python=3.11
micromamba activate wynn-map
pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` by default.

Run the command from the `backend/` directory. If `uvicorn app.main:app --reload`
returns `uvicorn: command not found`, the backend environment is not active or the
dependencies have not been installed; use `python -m uvicorn app.main:app --reload`
after activating the environment.

## Endpoints

- `GET /api/health`
- `GET /api/gathering-nodes`

The gathering nodes route keeps successful responses in memory for 3600 seconds. If Wynncraft is unavailable after the cache expires, the backend returns stale cached data with a warning. If no cache exists, it returns `502`.

Configure the Wynncraft origin with:

```text
WYNNCRAFT_API_BASE_URL=https://api.wynncraft.com
```

For local development while the live endpoint is unavailable, you can opt into mock nodes with:

```text
GATHERING_NODES_MOCK_PATH=backend/mock_gathering_nodes.json
```

By default this is unset, so the backend calls the live Wynncraft API.

## Territories

Territory data is fetched from `GET https://api.wynncraft.com/v3/guild/list/territory`
when no local file exists. To override with a local file, place `territories.json`
at the repository root or set:

```text
TERRITORIES_JSON_PATH=/path/to/territories.json
```

Expected entries are keyed by territory name and include `Location.start` and `Location.end` as world `x,z` coordinate pairs. The backend normalizes start/end order into `minX/maxX/minZ/maxZ` and treats each territory as a rectangle for this first version.

The live Wynncraft API uses lowercase fields (`location`, `guild`, `links`) and
resource arrays; the backend normalizes that shape too.

Nodes are assigned to territories with:

```text
min_x <= node.x <= max_x
min_z <= node.z <= max_z
```

If multiple territories contain a point, the smallest-area territory wins.

## Clustering

`GET /api/node-clusters` clusters gathering nodes in world `x,z` space. Clustering defaults:

```text
NODE_CLUSTER_EPS=90
NODE_CLUSTER_MIN_SAMPLES=3
NODE_CLUSTER_BY_RESOURCE=true
NODE_CLUSTER_BY_TERRITORY=false
NODE_CLUSTER_CACHE_TTL_SECONDS=300
```

The implementation uses DBSCAN semantics. `eps` is the maximum world-coordinate distance for neighboring nodes, and `min_samples` is the minimum number of nearby nodes required to form a cluster. Noise points receive no cluster id.

Cluster outlines are generated from exterior node geometry, not axis-aligned bounding boxes. For 4+ points the backend attempts an alpha-shape-like exterior using SciPy Delaunay triangulation and falls back to a convex hull if that cannot be computed. Convex hulls wrap the outside of the node set; concave/alpha outlines can follow indentations more closely when the points support it.

Known limitation: territory geometry is rectangular until better polygon territory data is added.

## Tests

```bash
pytest
```
