import type { ClusterSettings, NodeClustersResponse } from "../types/nodeCluster";
import type { GatheringNodeFilters } from "../types/gatheringNode";
import { API_BASE_URL, staticDataUrl, USE_STATIC_DATA } from "./config";

export async function fetchNodeClusters(
  filters: GatheringNodeFilters,
  settings: ClusterSettings,
): Promise<NodeClustersResponse> {
  if (USE_STATIC_DATA) {
    const response = await fetch(staticDataUrl("node-clusters.json"));
    if (!response.ok) {
      throw new Error(`Failed to fetch static node clusters: ${response.status}`);
    }
    const snapshot = (await response.json()) as NodeClustersResponse;
    const filteredClusters = filterStaticClusters(snapshot.data, filters);
    return {
      data: filteredClusters,
      meta: {
        ...snapshot.meta,
        count: filteredClusters.length,
      },
    };
  }

  const params = new URLSearchParams();
  if (filters.resourceQuery.trim()) params.set("resource", filters.resourceQuery.trim());
  if (filters.territory) params.set("territory", filters.territory);
  if (filters.minLevel !== "") params.set("minLevel", String(filters.minLevel));
  if (filters.maxLevel !== "") params.set("maxLevel", String(filters.maxLevel));
  params.set("eps", String(settings.eps));
  params.set("minSamples", String(settings.minSamples));
  params.set("byResource", String(settings.byResource));
  params.set("byTerritory", String(settings.byTerritory));
  params.set("mode", settings.mode);

  const response = await fetch(`${API_BASE_URL}/api/node-clusters?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch node clusters: ${response.status}`);
  }
  return response.json() as Promise<NodeClustersResponse>;
}

function filterStaticClusters(
  clusters: NodeClustersResponse["data"],
  filters: GatheringNodeFilters,
): NodeClustersResponse["data"] {
  const resourceQuery = filters.resourceQuery.trim().toUpperCase();
  return clusters.filter((cluster) => {
    if (resourceQuery) {
      const resourceMatches =
        cluster.resource?.includes(resourceQuery) || cluster.dominantResource.includes(resourceQuery);
      if (!resourceMatches) return false;
    }
    if (filters.territory && cluster.territory !== filters.territory) return false;
    if (filters.onlyInTerritory && cluster.territory === null) return false;
    if (filters.minLevel !== "" && cluster.levelMax < filters.minLevel) return false;
    if (filters.maxLevel !== "" && cluster.levelMin > filters.maxLevel) return false;
    return true;
  });
}
