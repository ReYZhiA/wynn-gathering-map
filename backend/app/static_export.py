import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from app.api.routes.gathering_nodes import get_gathering_nodes
from app.api.routes.node_clusters import get_node_clusters
from app.api.routes.territories import get_territories
from app.core.config import get_settings


def _dump_response(response: Any, path: Path) -> None:
    path.write_text(
        json.dumps(response.model_dump(mode="json", by_alias=True), indent=2),
        encoding="utf-8",
    )


async def export_static_data(
    output_dir: Path,
    *,
    eps: float | None,
    min_samples: int | None,
    by_resource: bool | None,
    by_territory: bool | None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    gathering_nodes = await get_gathering_nodes(includeTerritory=True, includeCluster=True)
    territories = await get_territories()
    node_clusters = await get_node_clusters(
        resource=None,
        territory=None,
        minLevel=None,
        maxLevel=None,
        type=None,
        eps=eps,
        minSamples=min_samples,
        byResource=by_resource,
        byTerritory=by_territory,
    )

    _dump_response(gathering_nodes, output_dir / "gathering-nodes.json")
    _dump_response(territories, output_dir / "territories.json")
    _dump_response(node_clusters, output_dir / "node-clusters.json")


def _optional_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise argparse.ArgumentTypeError(f"expected a boolean value, got {value!r}")


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Export static JSON data for GitHub Pages builds.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("../frontend/public/data"),
        help="Directory to write static JSON files into.",
    )
    parser.add_argument("--eps", type=float, default=settings.node_cluster_eps)
    parser.add_argument("--min-samples", type=int, default=settings.node_cluster_min_samples)
    parser.add_argument("--by-resource", type=_optional_bool, default=settings.node_cluster_by_resource)
    parser.add_argument("--by-territory", type=_optional_bool, default=settings.node_cluster_by_territory)
    args = parser.parse_args()

    asyncio.run(
        export_static_data(
            args.output,
            eps=args.eps,
            min_samples=args.min_samples,
            by_resource=args.by_resource,
            by_territory=args.by_territory,
        )
    )
    print(f"Exported static data to {args.output.resolve()}")


if __name__ == "__main__":
    main()
