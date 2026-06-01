import type { GatheringNode } from "../types/gatheringNode";
import type { ScreenPoint } from "../map/coordinates";

type GatheringNodeTooltipProps = {
  node: GatheringNode;
  position: ScreenPoint;
};

export function GatheringNodeTooltip({ node, position }: GatheringNodeTooltipProps) {
  return (
    <div
      className="node-tooltip"
      style={{
        transform: `translate(${position.x + 14}px, ${position.y + 14}px)`,
      }}
    >
      <strong>{node.resource}</strong>
      <dl>
        <dt>Level</dt>
        <dd>{node.level}</dd>
        <dt>Type</dt>
        <dd>{node.type}</dd>
        <dt>Territory</dt>
        <dd>{node.territory ?? "None"}</dd>
        <dt>Cluster</dt>
        <dd>{node.cluster_id ?? "None"}</dd>
        <dt>Position</dt>
        <dd>
          {node.x}, {node.y}, {node.z}
        </dd>
        <dt>Angle</dt>
        <dd>{node.angle}</dd>
      </dl>
    </div>
  );
}
