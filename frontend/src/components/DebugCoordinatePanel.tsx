import type { DebugCoordinateState } from "../map/MapCanvas";

type DebugCoordinatePanelProps = {
  enabled: boolean;
  debug: DebugCoordinateState;
  onToggle: (enabled: boolean) => void;
};

function formatNumber(value: number | undefined): string {
  if (value === undefined) return "-";
  return value.toFixed(2);
}

export function DebugCoordinatePanel({ enabled, debug, onToggle }: DebugCoordinatePanelProps) {
  return (
    <section className="debug-panel">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        Debug coordinates
      </label>
      {enabled ? (
        <dl>
          <dt>Image</dt>
          <dd>
            {formatNumber(debug.image?.x)}, {formatNumber(debug.image?.y)}
          </dd>
          <dt>World</dt>
          <dd>
            {formatNumber(debug.world?.x)}, {formatNumber(debug.world?.z)}
          </dd>
          <dt>Zoom</dt>
          <dd>{debug.zoom.toFixed(3)}</dd>
          <dt>Pan</dt>
          <dd>
            {debug.panX.toFixed(1)}, {debug.panY.toFixed(1)}
          </dd>
        </dl>
      ) : null}
    </section>
  );
}
