import type { ScreenPoint } from "../map/coordinates";
import type { Territory } from "../types/territory";

type TerritoryTooltipProps = {
  territory: Territory;
  visibleNodeCount: number;
  position: ScreenPoint;
};

export function TerritoryTooltip({ territory, visibleNodeCount, position }: TerritoryTooltipProps) {
  return (
    <div
      className="map-tooltip territory-tooltip"
      style={{ transform: `translate(${position.x + 14}px, ${position.y + 14}px)` }}
    >
      <strong>{territory.name}</strong>
      <dl>
        <dt>Nodes</dt>
        <dd>{visibleNodeCount}</dd>
      </dl>
    </div>
  );
}
