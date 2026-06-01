import type { GatheringNode } from "../types/gatheringNode";
import type { NodeCluster } from "../types/nodeCluster";

export type ClusterAnalysis = {
  cluster: NodeCluster;
  score: number;
  area: number;
  density: number;
  averageSpacing: number;
};

export function analyzeClusters(
  clusters: NodeCluster[],
  nodes: GatheringNode[],
): ClusterAnalysis[] {
  return clusters
    .map((cluster) => {
      const memberNodes = cluster.nodeIndices
        .map((nodeIndex) => nodes[nodeIndex])
        .filter((node): node is GatheringNode => node !== undefined);
      const area = Math.max(1, polygonArea(cluster.outline));
      const density = cluster.nodeCount / area;
      const averageSpacing = averageNearestNeighborDistance(memberNodes);
      const spacingScore = averageSpacing > 0 ? cluster.nodeCount * 100 / averageSpacing : cluster.nodeCount * 100;
      const densityScore = density * 100_000;

      return {
        cluster,
        score: Math.round((spacingScore + densityScore) * 10) / 10,
        area,
        density,
        averageSpacing,
      };
    })
    .sort((a, b) => b.score - a.score || b.cluster.nodeCount - a.cluster.nodeCount);
}

function polygonArea(points: Array<{ x: number; z: number }>): number {
  if (points.length < 3) return 1;
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.z - next.x * current.z;
  }
  return Math.abs(sum) / 2;
}

function averageNearestNeighborDistance(nodes: GatheringNode[]): number {
  if (nodes.length < 2) return 0;
  const distances = nodes.map((node, index) => {
    let closest = Number.POSITIVE_INFINITY;
    for (let otherIndex = 0; otherIndex < nodes.length; otherIndex += 1) {
      if (otherIndex === index) continue;
      const other = nodes[otherIndex];
      closest = Math.min(closest, Math.hypot(node.x - other.x, node.z - other.z));
    }
    return closest;
  });
  return distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
}
