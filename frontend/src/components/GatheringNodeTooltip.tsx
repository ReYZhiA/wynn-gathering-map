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
        {node.devComparisonStatus ? (
          <>
            <dt>Dev status</dt>
            <dd>{formatDevStatus(node)}</dd>
          </>
        ) : null}
        {node.devEdited && node.devOriginalResource ? (
          <>
            <dt>Original</dt>
            <dd>{node.devOriginalResource}</dd>
          </>
        ) : null}
        {node.devScanSource ? (
          <>
            <dt>Scan</dt>
            <dd>{node.devScanSource}</dd>
          </>
        ) : null}
        {node.devMatchDistance !== undefined && node.devMatchDistance !== null ? (
          <>
            <dt>Match distance</dt>
            <dd>{Math.round(node.devMatchDistance * 10) / 10}</dd>
          </>
        ) : null}
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

function formatDevStatus(node: GatheringNode): string {
  if (node.devSource === "scan" && node.devComparisonStatus === "new") return "New scanned node";
  if (node.devSource === "scan" && node.devComparisonStatus === "matched") return "Scanned match";
  if (node.devComparisonStatus === "outdated") return "Outdated API node";
  if (node.devComparisonStatus === "matched") return "API match";
  return "Unchanged";
}
