import type { ChangeEvent } from "react";

import type { GatheringNode } from "../types/gatheringNode";
import type { ScannedNodeComparisonSummary, ScannedNodeSet } from "../types/scannedNode";

export type NodeBrushMode = "off" | "assign" | "remove";

type ScannedNodeDevPanelProps = {
  availableFiles: string[];
  editableResources: string[];
  loadedSets: ScannedNodeSet[];
  activeScanIds: Set<string>;
  selectedFileName: string;
  matchRadius: number;
  boundsPadding: number;
  brushMode: NodeBrushMode;
  brushResource: string;
  brushRadius: number;
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;
  exportMessage: string | null;
  exportError: string | null;
  summary: ScannedNodeComparisonSummary;
  deletedNodeCount: number;
  reassignedNodeCount: number;
  selectedNode: GatheringNode | null;
  onSelectedFileNameChange: (fileName: string) => void;
  onLoadSelectedFile: () => void;
  onLoadAllFiles: () => void;
  onToggleScan: (scanId: string) => void;
  onLoadLocalFiles: (files: FileList) => void;
  onMatchRadiusChange: (radius: number) => void;
  onBoundsPaddingChange: (padding: number) => void;
  onBrushModeChange: (mode: NodeBrushMode) => void;
  onBrushResourceChange: (resource: string) => void;
  onBrushRadiusChange: (radius: number) => void;
  onDeleteOutdated: () => void;
  onDeleteSelected: () => void;
  onRestoreDeleted: () => void;
  onClearReassignments: () => void;
  onExportEditedNodes: () => void;
  onClearScans: () => void;
};

export function ScannedNodeDevPanel({
  availableFiles,
  editableResources,
  loadedSets,
  activeScanIds,
  selectedFileName,
  matchRadius,
  boundsPadding,
  brushMode,
  brushResource,
  brushRadius,
  isLoading,
  isExporting,
  error,
  exportMessage,
  exportError,
  summary,
  deletedNodeCount,
  reassignedNodeCount,
  selectedNode,
  onSelectedFileNameChange,
  onLoadSelectedFile,
  onLoadAllFiles,
  onToggleScan,
  onLoadLocalFiles,
  onMatchRadiusChange,
  onBoundsPaddingChange,
  onBrushModeChange,
  onBrushResourceChange,
  onBrushRadiusChange,
  onDeleteOutdated,
  onDeleteSelected,
  onRestoreDeleted,
  onClearReassignments,
  onExportEditedNodes,
  onClearScans,
}: ScannedNodeDevPanelProps) {
  const canDeleteSelected = selectedNode?.devComparisonStatus === "outdated" && selectedNode.devSource === "api";
  const deletedDisplayCount = Math.max(summary.deletedApiOutdatedCount, deletedNodeCount);

  function handleLocalFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      onLoadLocalFiles(event.target.files);
      event.target.value = "";
    }
  }

  return (
    <aside className="scan-dev-panel">
      <div className="panel-header">
        <div>
          <h2>Scanned Nodes</h2>
          <p>{summary.scannedCount.toLocaleString()} loaded from scans</p>
        </div>
        <button type="button" onClick={onClearScans} disabled={loadedSets.length === 0}>
          Clear
        </button>
      </div>

      <div className="scan-dev-row">
        <label>
          Public scan file
          <select
            value={selectedFileName}
            onChange={(event) => onSelectedFileNameChange(event.target.value)}
          >
            {availableFiles.map((fileName) => (
              <option key={fileName} value={fileName}>
                {fileName}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onLoadSelectedFile} disabled={!selectedFileName || isLoading}>
          Load
        </button>
      </div>
      <button
        type="button"
        onClick={onLoadAllFiles}
        disabled={availableFiles.length === 0 || isLoading}
      >
        Load all scans
      </button>

      <label>
        Load local JSON
        <input type="file" accept="application/json,.json" multiple onChange={handleLocalFileChange} />
      </label>

      <div className="level-row">
        <label>
          Match radius
          <input
            min="1"
            step="1"
            type="number"
            value={matchRadius}
            onChange={(event) => onMatchRadiusChange(Number(event.target.value))}
          />
        </label>
        <label>
          Scan padding
          <input
            min="0"
            step="5"
            type="number"
            value={boundsPadding}
            onChange={(event) => onBoundsPaddingChange(Number(event.target.value))}
          />
        </label>
      </div>

      {error ? <p className="panel-error">{error}</p> : null}
      {exportError ? <p className="panel-error">{exportError}</p> : null}
      {exportMessage ? <p className="panel-note">{exportMessage}</p> : null}

      {loadedSets.length > 0 ? (
        <div className="scan-loaded-list">
          {loadedSets.map((set) => (
            <button
              key={set.id}
              type="button"
              className={`scan-toggle${activeScanIds.has(set.id) ? " is-active" : ""}`}
              onClick={() => onToggleScan(set.id)}
            >
              <span>{set.label}</span>
              <span>{set.nodes.length.toLocaleString()}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="panel-note">Load a scan file to compare it against the current map nodes.</p>
      )}

      <dl className="scan-summary">
        <dt>New scan nodes</dt>
        <dd>{summary.scannedNewCount.toLocaleString()}</dd>
        <dt>Matched scan nodes</dt>
        <dd>{summary.scannedMatchedCount.toLocaleString()}</dd>
        <dt>Matched API nodes</dt>
        <dd>{summary.apiMatchedCount.toLocaleString()}</dd>
        <dt>Outdated API nodes</dt>
        <dd>{summary.remainingApiOutdatedCount.toLocaleString()}</dd>
        <dt>Deleted from map</dt>
        <dd>{deletedDisplayCount.toLocaleString()}</dd>
      </dl>

      <div className="scan-legend" aria-label="Scanned node comparison legend">
        <span><b className="legend-dot legend-new" /> New scan</span>
        <span><b className="legend-dot legend-matched" /> Matched</span>
        <span><b className="legend-dot legend-outdated" /> Outdated API</span>
      </div>

      <fieldset className="brush-controls">
        <legend>Drag edit</legend>
        <div className="segmented-control">
          <button
            type="button"
            className={brushMode === "off" ? "is-active" : ""}
            onClick={() => onBrushModeChange("off")}
          >
            Off
          </button>
          <button
            type="button"
            className={brushMode === "assign" ? "is-active" : ""}
            onClick={() => onBrushModeChange("assign")}
          >
            Assign
          </button>
          <button
            type="button"
            className={brushMode === "remove" ? "is-active" : ""}
            onClick={() => onBrushModeChange("remove")}
          >
            Remove
          </button>
        </div>

        <label>
          Assign resource
          <input
            list="brush-resource-options"
            value={brushResource}
            disabled={brushMode !== "assign"}
            onChange={(event) => onBrushResourceChange(event.target.value.toUpperCase())}
          />
        </label>
        <datalist id="brush-resource-options">
          {editableResources.map((resource) => (
            <option key={resource} value={resource} />
          ))}
        </datalist>

        <label>
          Brush radius
          <input
            min="4"
            max="64"
            step="1"
            type="number"
            value={brushRadius}
            disabled={brushMode === "off"}
            onChange={(event) => onBrushRadiusChange(Number(event.target.value))}
          />
        </label>

        <p className="panel-note">
          Reassigned: {reassignedNodeCount.toLocaleString()} · Removed:{" "}
          {deletedNodeCount.toLocaleString()}
        </p>
      </fieldset>

      <div className="scan-actions">
        <button
          type="button"
          onClick={onDeleteOutdated}
          disabled={summary.remainingApiOutdatedCount === 0}
        >
          Delete outdated
        </button>
        <button type="button" onClick={onDeleteSelected} disabled={!canDeleteSelected}>
          Delete selected
        </button>
        <button type="button" onClick={onRestoreDeleted} disabled={deletedNodeCount === 0}>
          Restore deleted
        </button>
        <button type="button" onClick={onClearReassignments} disabled={reassignedNodeCount === 0}>
          Clear reassignments
        </button>
        <button type="button" onClick={onExportEditedNodes} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export edited"}
        </button>
      </div>
    </aside>
  );
}
