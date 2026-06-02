import type { GatheringNode } from "../types/gatheringNode";
import type { NodeCluster } from "../types/nodeCluster";

export type ClusterAnalysis = {
  cluster: NodeCluster;
  score: number;
  area: number;
  density: number;
  averageSpacing: number;
};

export type ClusterScoreMode = "4tick" | "3tick";

export function analyzeClusters(
  clusters: NodeCluster[],
  nodes: GatheringNode[],
  scoreMode: ClusterScoreMode,
): ClusterAnalysis[] {
  const analyses = clusters.map((cluster) => {
    const memberNodes = cluster.nodeIndices
      .map((nodeIndex) => nodes[nodeIndex])
      .filter((node): node is GatheringNode => node !== undefined);
    const area = Math.max(1, polygonArea(cluster.outline));
    const density = cluster.nodeCount / area;
    const averageSpacing = averageNearestNeighborDistance(memberNodes);

    return {
      cluster,
      score: 0,
      area,
      density,
      averageSpacing,
    };
  });
  const nodeScoreCap = scoreMode === "4tick" ? 16 : 20;
  const positiveSpacings = analyses
    .map((analysis) => analysis.averageSpacing)
    .filter((spacing) => spacing > 0);
  const bestSpacing = positiveSpacings.length > 0 ? Math.min(...positiveSpacings) : 0;

  return analyses
    .map((analysis) => {
      const nodeScore = (Math.min(analysis.cluster.nodeCount, nodeScoreCap) / nodeScoreCap) * 70;
      const distanceScore =
        analysis.averageSpacing > 0 && bestSpacing > 0
          ? (bestSpacing / analysis.averageSpacing) * 30
          : 30;
      return {
        ...analysis,
        score: Math.round(Math.min(100, nodeScore + distanceScore) * 10) / 10,
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
