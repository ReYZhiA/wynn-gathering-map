import type { GatheringNodesResponse } from "../types/gatheringNode";
import { API_BASE_URL, staticDataUrl, USE_STATIC_DATA } from "./config";

export async function fetchGatheringNodes(includeCluster = false): Promise<GatheringNodesResponse> {
  if (USE_STATIC_DATA) {
    const response = await fetch(staticDataUrl("gathering-nodes.json"));
    if (!response.ok) {
      throw new Error(`Failed to fetch static gathering nodes: ${response.status}`);
    }
    return response.json() as Promise<GatheringNodesResponse>;
  }

  const params = new URLSearchParams({
    includeTerritory: "true",
    includeCluster: String(includeCluster),
  });
  const response = await fetch(`${API_BASE_URL}/api/gathering-nodes?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch gathering nodes: ${response.status}`);
  }
  return response.json() as Promise<GatheringNodesResponse>;
}
