import type { GatheringNode } from "../types/gatheringNode";
import type { ScannedNodeComparisonSummary, ScannedNodeSet } from "../types/scannedNode";

export type ScannedNodeComparison = {
  nodesForMap: GatheringNode[];
  newScannedNodes: GatheringNode[];
  outdatedApiNodeIds: string[];
  summary: ScannedNodeComparisonSummary;
};

type ResourceScanArea = {
  nodes: GatheringNode[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function buildApiNodeDevId(node: GatheringNode, index: number): string {
  return `api:${index}:${node.x}:${node.y}:${node.z}:${node.type}:${node.resource}:${node.level}`;
}

export function compareScannedNodes({
  apiNodes,
  scannedSets,
  deletedApiNodeIds,
  matchRadius,
  boundsPadding,
}: {
  apiNodes: GatheringNode[];
  scannedSets: ScannedNodeSet[];
  deletedApiNodeIds: Set<string>;
  matchRadius: number;
  boundsPadding: number;
}): ScannedNodeComparison {
  const scannedNodes = scannedSets.flatMap((set) =>
    set.nodes.map((node) => ({
      ...node,
      devScanSource: set.label,
    })),
  );

  const scanAreasByResource = buildScanAreasByResource(scannedNodes, boundsPadding);
  const apiNodesForMatching = apiNodes.map((node, index) => ({
    ...node,
    devId: node.devId ?? buildApiNodeDevId(node, index),
    devSource: "api" as const,
  }));

  const comparedApiNodes = apiNodesForMatching.map((node) => {
    const area = scanAreasByResource.get(node.resource);
    if (!area || !isInsideArea(node, area)) {
      return {
        ...node,
        devComparisonStatus: "base" as const,
        devMatchDistance: null,
      };
    }

    const closestDistance = getClosestDistance(node, area.nodes);
    const isMatched = closestDistance !== null && closestDistance <= matchRadius;
    return {
      ...node,
      devComparisonStatus: isMatched ? ("matched" as const) : ("outdated" as const),
      devMatchDistance: closestDistance,
    };
  });

  const comparedScannedNodes = scannedNodes.map((node) => {
    const matchingApiNodes = apiNodesForMatching.filter((apiNode) => apiNode.resource === node.resource);
    const closestDistance = getClosestDistance(node, matchingApiNodes);
    const isMatched = closestDistance !== null && closestDistance <= matchRadius;
    return {
      ...node,
      devComparisonStatus: isMatched ? ("matched" as const) : ("new" as const),
      devMatchDistance: closestDistance,
    };
  });

  const outdatedApiNodeIds = comparedApiNodes
    .filter((node) => node.devComparisonStatus === "outdated")
    .map((node) => node.devId)
    .filter((id): id is string => id !== undefined);

  const visibleApiNodes = comparedApiNodes.filter((node) => !node.devId || !deletedApiNodeIds.has(node.devId));
  const visibleScannedNodes = comparedScannedNodes.filter(
    (node) => !node.devId || !deletedApiNodeIds.has(node.devId),
  );
  const visibleNewScannedNodes = visibleScannedNodes.filter(
    (node) => node.devComparisonStatus === "new",
  );
  const deletedApiOutdatedCount = outdatedApiNodeIds.filter((id) => deletedApiNodeIds.has(id)).length;

  return {
    nodesForMap: [...visibleApiNodes, ...visibleScannedNodes],
    newScannedNodes: visibleNewScannedNodes,
    outdatedApiNodeIds,
    summary: {
      scannedCount: comparedScannedNodes.length,
      scannedNewCount: comparedScannedNodes.filter((node) => node.devComparisonStatus === "new").length,
      scannedMatchedCount: comparedScannedNodes.filter((node) => node.devComparisonStatus === "matched").length,
      apiMatchedCount: comparedApiNodes.filter((node) => node.devComparisonStatus === "matched").length,
      apiOutdatedCount: outdatedApiNodeIds.length,
      remainingApiOutdatedCount: Math.max(0, outdatedApiNodeIds.length - deletedApiOutdatedCount),
      deletedApiOutdatedCount,
    },
  };
}

function buildScanAreasByResource(nodes: GatheringNode[], padding: number): Map<string, ResourceScanArea> {
  const areas = new Map<string, ResourceScanArea>();
  for (const node of nodes) {
    const existing = areas.get(node.resource);
    if (!existing) {
      areas.set(node.resource, {
        nodes: [node],
        minX: node.x - padding,
        maxX: node.x + padding,
        minZ: node.z - padding,
        maxZ: node.z + padding,
      });
      continue;
    }

    existing.nodes.push(node);
    existing.minX = Math.min(existing.minX, node.x - padding);
    existing.maxX = Math.max(existing.maxX, node.x + padding);
    existing.minZ = Math.min(existing.minZ, node.z - padding);
    existing.maxZ = Math.max(existing.maxZ, node.z + padding);
  }
  return areas;
}

function isInsideArea(node: GatheringNode, area: ResourceScanArea): boolean {
  return area.minX <= node.x && node.x <= area.maxX && area.minZ <= node.z && node.z <= area.maxZ;
}

function getClosestDistance(node: GatheringNode, candidates: GatheringNode[]): number | null {
  if (candidates.length === 0) return null;
  let closest = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    closest = Math.min(closest, Math.hypot(node.x - candidate.x, node.z - candidate.z));
  }
  return Number.isFinite(closest) ? closest : null;
}
