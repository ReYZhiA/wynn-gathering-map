import type { ScreenPoint } from "../map/coordinates";
import type { NodeCluster } from "../types/nodeCluster";

type ClusterTooltipProps = {
  cluster: NodeCluster;
  position: ScreenPoint;
};

export function ClusterTooltip({ cluster, position }: ClusterTooltipProps) {
  return (
    <div
      className="map-tooltip cluster-tooltip"
      style={{ transform: `translate(${position.x + 14}px, ${position.y + 14}px)` }}
    >
      <strong>Cluster {cluster.id}</strong>
      <dl>
        <dt>Nodes</dt>
        <dd>{cluster.nodeCount}</dd>
        <dt>Resource</dt>
        <dd>{cluster.dominantResource}</dd>
        <dt>Levels</dt>
        <dd>
          {cluster.levelMin}-{cluster.levelMax}
        </dd>
        {cluster.territory ? (
          <>
            <dt>Territory</dt>
            <dd>{cluster.territory}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
