import type { ClusterSettings } from "../types/nodeCluster";
import type { ClusterAnalysis, ClusterScoreMode } from "../map/clusterAnalysis";

type ClusterResultsPanelProps = {
  analyses: ClusterAnalysis[];
  selectedClusterId: number | null;
  showClusters: boolean;
  showTerritories: boolean;
  scoreMode: ClusterScoreMode;
  isLoading: boolean;
  error: string | null;
  isStaticData: boolean;
  onShowClustersChange: (showClusters: boolean) => void;
  onShowTerritoriesChange: (showTerritories: boolean) => void;
  onScoreModeChange: (scoreMode: ClusterScoreMode) => void;
  onSelectCluster: (clusterId: number) => void;
  onOpenLiveControls: (() => void) | null;
};

export function ClusterResultsPanel({
  analyses,
  selectedClusterId,
  showClusters,
  showTerritories,
  scoreMode,
  isLoading,
  error,
  isStaticData,
  onShowClustersChange,
  onShowTerritoriesChange,
  onScoreModeChange,
  onSelectCluster,
  onOpenLiveControls,
}: ClusterResultsPanelProps) {
  const topAnalyses = analyses.slice(0, 12);

  return (
    <section className="cluster-panel">
      <div className="panel-header">
        <div>
          <h2>Cluster Areas</h2>
          <p>{analyses.length.toLocaleString()} ranked areas</p>
        </div>
        {onOpenLiveControls ? (
          <button type="button" onClick={onOpenLiveControls}>
            Tune
          </button>
        ) : null}
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={showClusters}
          onChange={(event) => onShowClustersChange(event.target.checked)}
        />
        Show cluster areas
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={showTerritories}
          onChange={(event) => onShowTerritoriesChange(event.target.checked)}
        />
        Show territories
      </label>

      <label>
        Score target
        <select
          value={scoreMode}
          onChange={(event) => onScoreModeChange(event.target.value as ClusterScoreMode)}
        >
          <option value="4tick">4 tick</option>
          <option value="3tick">3 tick</option>
        </select>
      </label>

      {isLoading ? <p className="panel-note">Loading cluster snapshot...</p> : null}
      {error ? <p className="panel-error">{error}</p> : null}
      {isStaticData ? (
        <p className="panel-note">Static snapshot. Generate new areas locally, then redeploy.</p>
      ) : null}

      <div className="cluster-result-list">
        {topAnalyses.map((analysis, index) => (
          <button
            type="button"
            className={
              analysis.cluster.id === selectedClusterId
                ? "cluster-result is-selected"
                : "cluster-result"
            }
            key={analysis.cluster.id}
            onClick={() => onSelectCluster(analysis.cluster.id)}
          >
            <span className="cluster-rank">#{index + 1}</span>
            <span className="cluster-main">
              <strong>{analysis.cluster.dominantResource}</strong>
              <span>
                {analysis.cluster.nodeCount} nodes · lvl {analysis.cluster.levelMin}-
                {analysis.cluster.levelMax}
              </span>
              {analysis.cluster.territory ? <span>{analysis.cluster.territory}</span> : null}
            </span>
            <span className="cluster-score">
              <strong>{analysis.score.toFixed(1)}%</strong>
              <span>{analysis.averageSpacing.toFixed(0)}m spacing</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function LiveClusterControls({
  draftSettings,
  appliedSettings,
  onDraftChange,
  onApply,
}: {
  draftSettings: ClusterSettings;
  appliedSettings: ClusterSettings;
  onDraftChange: (settings: ClusterSettings) => void;
  onApply: () => void;
}) {
  const hasPendingChanges =
    draftSettings.eps !== appliedSettings.eps ||
    draftSettings.minSamples !== appliedSettings.minSamples ||
    draftSettings.byResource !== appliedSettings.byResource ||
    draftSettings.byTerritory !== appliedSettings.byTerritory ||
    draftSettings.mode !== appliedSettings.mode;

  return (
    <section className="cluster-panel live-cluster-controls">
      <div className="panel-header">
        <div>
          <h2>Generate Areas</h2>
          <p>Local backend only</p>
        </div>
        <button type="button" onClick={onApply} disabled={!hasPendingChanges}>
          Apply
        </button>
      </div>

      <label>
        Mode
        <select
          value={draftSettings.mode}
          onChange={(event) =>
            onDraftChange({ ...draftSettings, mode: event.target.value as typeof draftSettings.mode })
          }
        >
          <option value="connected">Distance connected</option>
          <option value="dbscan">DBSCAN</option>
        </select>
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
        Cluster by gathering type + level
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
    </section>
  );
}
