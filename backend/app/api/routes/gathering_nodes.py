from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.models.gathering_node import EnrichedGatheringNode, GatheringNode, GatheringNodesMeta, GatheringNodesResponse
from app.services.cache import TtlCache
from app.services.node_clustering import (
    ClusteringOptions,
    assign_cluster_ids,
    build_node_clusters,
    enrich_nodes_with_territories,
)
from app.services.wynncraft_client import WynncraftApiError, WynncraftClient

router = APIRouter(tags=["gathering-nodes"])
settings = get_settings()
wynncraft_client = WynncraftClient(settings)
gathering_nodes_cache: TtlCache[dict[str, Any]] = TtlCache(
    ttl_seconds=settings.gathering_nodes_cache_ttl_seconds
)


async def get_raw_gathering_nodes() -> list[GatheringNode]:
    cached_payload = gathering_nodes_cache.get()
    if cached_payload is not None:
        return cached_payload["data"]

    try:
        nodes = await wynncraft_client.fetch_gathering_nodes()
    except WynncraftApiError:
        stale_payload = gathering_nodes_cache.get_stale()
        if stale_payload is not None:
            return stale_payload["data"]
        raise

    payload = {
        "data": nodes,
        "fetched_at": datetime.now(UTC),
    }
    gathering_nodes_cache.set(payload)
    try:
        from app.api.routes.node_clusters import clear_cluster_cache

        clear_cluster_cache()
    except ImportError:
        pass
    return nodes


def _response_from_nodes(
    nodes: list[EnrichedGatheringNode],
    *,
    cached: bool,
    fetched_at: datetime,
    warning: str | None = None,
) -> GatheringNodesResponse:
    return GatheringNodesResponse(
        data=nodes,
        meta=GatheringNodesMeta(
            source="wynncraft",
            cached=cached,
            count=len(nodes),
            cacheTtlSeconds=settings.gathering_nodes_cache_ttl_seconds,
            fetchedAt=fetched_at,
            warning=warning,
        ),
    )


@router.get("/gathering-nodes", response_model=GatheringNodesResponse)
async def get_gathering_nodes(
    includeTerritory: bool = Query(default=True),
    includeCluster: bool = Query(default=False),
) -> GatheringNodesResponse:
    cached_payload = gathering_nodes_cache.get()
    warning: str | None = None
    if cached_payload is not None:
        raw_nodes = cached_payload["data"]
        fetched_at = cached_payload["fetched_at"]
        cached = True
    else:
        try:
            raw_nodes = await wynncraft_client.fetch_gathering_nodes()
        except WynncraftApiError as exc:
            stale_payload = gathering_nodes_cache.get_stale()
            if stale_payload is None:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            raw_nodes = stale_payload["data"]
            fetched_at = stale_payload["fetched_at"]
            cached = True
            warning = "Wynncraft API request failed; returned stale cached data."
        else:
            fetched_at = datetime.now(UTC)
            gathering_nodes_cache.set({"data": raw_nodes, "fetched_at": fetched_at})
            cached = False
            try:
                from app.api.routes.node_clusters import clear_cluster_cache

                clear_cluster_cache()
            except ImportError:
                pass

    enriched_nodes = [EnrichedGatheringNode.model_validate(node.model_dump()) for node in raw_nodes]
    if includeTerritory:
        from app.api.routes.territories import territory_service

        enriched_nodes = enrich_nodes_with_territories(enriched_nodes, territory_service)
    if includeCluster:
        clusters = build_node_clusters(
            enriched_nodes,
            ClusteringOptions(
                eps=settings.node_cluster_eps,
                min_samples=settings.node_cluster_min_samples,
                by_resource=settings.node_cluster_by_resource,
                by_territory=settings.node_cluster_by_territory,
                mode=settings.node_cluster_mode,
            ),
        )
        enriched_nodes = assign_cluster_ids(enriched_nodes, clusters)

    return _response_from_nodes(enriched_nodes, cached=cached, fetched_at=fetched_at, warning=warning)
