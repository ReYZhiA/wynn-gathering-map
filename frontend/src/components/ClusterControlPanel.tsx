import type { ClusterSettings } from "../types/nodeCluster";

type ClusterControlPanelProps = {
  draftSettings: ClusterSettings;
  appliedSettings: ClusterSettings;
  clusterCount: number;
  isLoading: boolean;
  error: string | null;
  isStaticData: boolean;
  onDraftChange: (settings: ClusterSettings) => void;
  onApply: () => void;
};

export function ClusterControlPanel({
  draftSettings,
  appliedSettings,
  clusterCount,
  isLoading,
  error,
  isStaticData,
  onDraftChange,
  onApply,
}: ClusterControlPanelProps) {
  const hasPendingChanges =
    draftSettings.eps !== appliedSettings.eps ||
    draftSettings.minSamples !== appliedSettings.minSamples ||
    draftSettings.byResource !== appliedSettings.byResource ||
    draftSettings.byTerritory !== appliedSettings.byTerritory;

  return (
    <section className="cluster-panel">
      <div className="panel-header">
        <div>
          <h2>Overlays</h2>
          <p>{clusterCount.toLocaleString()} clusters</p>
        </div>
        <button type="button" onClick={onApply} disabled={!hasPendingChanges}>
          Apply
        </button>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draftSettings.showTerritories}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, showTerritories: event.target.checked })
          }
        />
        Show territories
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draftSettings.showClusters}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, showClusters: event.target.checked })
          }
        />
        Show cluster outlines
      </label>

      <label>
        Clustering radius
        <input
          min="10"
          step="5"
          type="number"
          value={draftSettings.eps}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, eps: Number(event.target.value) })
          }
        />
      </label>

      <label>
        Min samples
        <input
          min="1"
          type="number"
          value={draftSettings.minSamples}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, minSamples: Number(event.target.value) })
          }
        />
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draftSettings.byResource}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, byResource: event.target.checked })
          }
        />
        Cluster by resource
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draftSettings.byTerritory}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, byTerritory: event.target.checked })
          }
        />
        Cluster by territory
      </label>

      {isLoading ? <p className="panel-note">Computing clusters...</p> : null}
      {isStaticData ? (
        <p className="panel-note">Static snapshot: rebuild to change clustering parameters.</p>
      ) : null}
      {error ? <p className="panel-error">{error}</p> : null}
    </section>
  );
}
