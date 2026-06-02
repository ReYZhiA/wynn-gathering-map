import json

from fastapi import APIRouter, HTTPException, Query

from app.api.routes.gathering_nodes import get_raw_gathering_nodes
from app.api.routes.territories import territory_service
from app.core.config import get_settings
from app.models.gathering_node import EnrichedGatheringNode, GatheringNodeType
from app.models.node_cluster import NodeClustersMeta, NodeClustersResponse
from app.services.cache import KeyedTtlCache
from app.services.node_clustering import (
    ClusteringOptions,
    NodeClusterFilters,
    build_node_clusters,
    enrich_nodes_with_territories,
)
from app.services.wynncraft_client import WynncraftApiError

router = APIRouter(tags=["node-clusters"])
settings = get_settings()
cluster_cache: KeyedTtlCache[NodeClustersResponse] = KeyedTtlCache(
    ttl_seconds=settings.node_cluster_cache_ttl_seconds
)


def clear_cluster_cache() -> None:
    cluster_cache.clear()


@router.get("/node-clusters", response_model=NodeClustersResponse)
async def get_node_clusters(
    resource: str | None = None,
    territory: str | None = None,
    minLevel: int | None = Query(default=None, ge=0),
    maxLevel: int | None = Query(default=None, ge=0),
    type: GatheringNodeType | None = None,
    eps: float | None = Query(default=None, gt=0),
    minSamples: int | None = Query(default=None, ge=1),
    byResource: bool | None = None,
    byTerritory: bool | None = None,
    mode: str | None = Query(default=None, pattern="^(connected|dbscan)$"),
) -> NodeClustersResponse:
    options = ClusteringOptions(
        eps=eps if eps is not None else settings.node_cluster_eps,
        min_samples=minSamples if minSamples is not None else settings.node_cluster_min_samples,
        by_resource=byResource if byResource is not None else settings.node_cluster_by_resource,
        by_territory=byTerritory if byTerritory is not None else settings.node_cluster_by_territory,
        mode=mode if mode is not None else settings.node_cluster_mode,
    )
    filters = NodeClusterFilters(
        resource=resource,
        territory=territory,
        min_level=minLevel,
        max_level=maxLevel,
        node_type=type,
    )
    cache_key = json.dumps(
        {
            "resource": resource,
            "territory": territory,
            "minLevel": minLevel,
            "maxLevel": maxLevel,
            "type": type.value if type else None,
            "eps": options.eps,
            "minSamples": options.min_samples,
            "byResource": options.by_resource,
            "byTerritory": options.by_territory,
            "mode": options.mode,
        },
        sort_keys=True,
    )
    cached = cluster_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        raw_nodes = await get_raw_gathering_nodes()
    except WynncraftApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    enriched_nodes = enrich_nodes_with_territories(
        [EnrichedGatheringNode.model_validate(node.model_dump()) for node in raw_nodes],
        territory_service,
    )
    clusters = build_node_clusters(enriched_nodes, options, filters)
    response = NodeClustersResponse(
        data=clusters,
        meta=NodeClustersMeta(
            count=len(clusters),
            eps=options.eps,
            minSamples=options.min_samples,
            byResource=options.by_resource,
            byTerritory=options.by_territory,
            mode=options.mode,
        ),
    )
    cluster_cache.set(cache_key, response)
    return response
