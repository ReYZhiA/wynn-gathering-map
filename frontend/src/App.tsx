import { useEffect, useMemo, useState } from "react";

import { exportEditedGatheringNodes } from "./api/editedGatheringNodesApi";
import { fetchGatheringNodes } from "./api/gatheringNodesApi";
import { fetchNodeClusters } from "./api/nodeClustersApi";
import {
  fetchScannedNodeFileNames,
  fetchScannedNodeSet,
  fetchScannedNodeSets,
  readScannedNodeSetFromFile,
} from "./api/scannedNodesApi";
import { fetchTerritories } from "./api/territoriesApi";
import { USE_STATIC_DATA } from "./api/config";
import { ClusterResultsPanel, LiveClusterControls } from "./components/ClusterResultsPanel";
import { DebugCoordinatePanel } from "./components/DebugCoordinatePanel";
import {
  DEFAULT_FILTERS,
  filterGatheringNodes,
  GatheringNodeFilterPanel,
} from "./components/GatheringNodeFilterPanel";
import { type NodeBrushMode, ScannedNodeDevPanel } from "./components/ScannedNodeDevPanel";
import { MapCanvas, type DebugCoordinateState } from "./map/MapCanvas";
import { analyzeClusters, type ClusterScoreMode } from "./map/clusterAnalysis";
import { getGatheringProfession } from "./map/resourceStyles";
import { buildApiNodeDevId, compareScannedNodes } from "./map/scannedNodeComparison";
import type { GatheringNode, GatheringNodeFilters, GatheringNodesResponse } from "./types/gatheringNode";
import type { ClusterSettings, NodeCluster } from "./types/nodeCluster";
import type { ScannedNodeComparisonSummary, ScannedNodeSet } from "./types/scannedNode";
import type { Territory } from "./types/territory";

const EMPTY_DEBUG: DebugCoordinateState = {
  image: null,
  world: null,
  zoom: 0.25,
  panX: 0,
  panY: 0,
};

const DEFAULT_CLUSTER_SETTINGS: ClusterSettings = {
  showTerritories: true,
  showClusters: USE_STATIC_DATA,
  eps: 90,
  minSamples: 3,
  byResource: true,
  byTerritory: false,
  mode: "connected",
};

const DELETED_NODE_STORAGE_KEY = "wynn-gathering-map.deleted-api-node-ids";
const RESOURCE_OVERRIDES_STORAGE_KEY = "wynn-gathering-map.node-resource-overrides";
const SPECIAL_EDIT_RESOURCES = [
  "MOLTEN_EEL",
  "DERNIC_TREE",
  "DERNIC_FISH",
  "DERNIC_CROPS",
  "DERNIC_ORE",
];
const EMPTY_SCAN_SUMMARY: ScannedNodeComparisonSummary = {
  scannedCount: 0,
  scannedNewCount: 0,
  scannedMatchedCount: 0,
  apiMatchedCount: 0,
  apiOutdatedCount: 0,
  remainingApiOutdatedCount: 0,
  deletedApiOutdatedCount: 0,
};

export function App() {
  const [nodes, setNodes] = useState<GatheringNode[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [clusters, setClusters] = useState<NodeCluster[]>([]);
  const [meta, setMeta] = useState<GatheringNodesResponse["meta"] | null>(null);
  const [filters, setFilters] = useState<GatheringNodeFilters>(DEFAULT_FILTERS);
  const [selectedNode, setSelectedNode] = useState<GatheringNode | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<NodeCluster | null>(null);
  const [clusterScoreMode, setClusterScoreMode] = useState<ClusterScoreMode>("4tick");
  const [draftClusterSettings, setDraftClusterSettings] =
    useState<ClusterSettings>(DEFAULT_CLUSTER_SETTINGS);
  const [appliedClusterSettings, setAppliedClusterSettings] =
    useState<ClusterSettings>(DEFAULT_CLUSTER_SETTINGS);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debug, setDebug] = useState<DebugCoordinateState>(EMPTY_DEBUG);
  const [showLiveClusterControls, setShowLiveClusterControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClusterLoading, setIsClusterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusterError, setClusterError] = useState<string | null>(null);
  const [availableScannedFiles, setAvailableScannedFiles] = useState<string[]>([]);
  const [selectedScannedFile, setSelectedScannedFile] = useState("");
  const [scannedSets, setScannedSets] = useState<ScannedNodeSet[]>([]);
  const [activeScanIds, setActiveScanIds] = useState<Set<string>>(new Set());
  const [scanMatchRadius, setScanMatchRadius] = useState(8);
  const [scanBoundsPadding, setScanBoundsPadding] = useState(80);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [brushMode, setBrushMode] = useState<NodeBrushMode>("off");
  const [brushResource, setBrushResource] = useState("MOLTEN_EEL");
  const [brushRadius, setBrushRadius] = useState(18);
  const [deletedApiNodeIds, setDeletedApiNodeIds] = useState<Set<string>>(() => {
    try {
      const rawValue = window.localStorage.getItem(DELETED_NODE_STORAGE_KEY);
      const parsed = rawValue ? JSON.parse(rawValue) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
    } catch {
      return new Set();
    }
  });
  const [resourceOverrides, setResourceOverrides] = useState<Map<string, string>>(() => {
    try {
      const rawValue = window.localStorage.getItem(RESOURCE_OVERRIDES_STORAGE_KEY);
      const parsed = rawValue ? JSON.parse(rawValue) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Map();
      return new Map(
        Object.entries(parsed)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([nodeId, resource]) => [nodeId, normalizeResource(resource)]),
      );
    } catch {
      return new Map();
    }
  });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchGatheringNodes()
      .then((response) => {
        if (cancelled) return;
        setNodes(response.data);
        setMeta(response.meta);
        setError(null);
      })
      .catch((unknownError: unknown) => {
        if (cancelled) return;
        setError(unknownError instanceof Error ? unknownError.message : "Failed to load nodes");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTerritories()
      .then((response) => {
        if (!cancelled) setTerritories(response.data);
      })
      .catch(() => {
        if (!cancelled) setTerritories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchScannedNodeFileNames()
      .then((fileNames) => {
        if (cancelled) return;
        setAvailableScannedFiles(fileNames);
        setSelectedScannedFile((current) => current || fileNames[0] || "");
      })
      .catch(() => {
        if (!cancelled) setAvailableScannedFiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      DELETED_NODE_STORAGE_KEY,
      JSON.stringify(Array.from(deletedApiNodeIds)),
    );
  }, [deletedApiNodeIds]);

  useEffect(() => {
    window.localStorage.setItem(
      RESOURCE_OVERRIDES_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(resourceOverrides)),
    );
  }, [resourceOverrides]);

  useEffect(() => {
    if (!draftClusterSettings.showClusters) {
      setClusters([]);
      return;
    }

    let cancelled = false;
    setIsClusterLoading(true);
    fetchNodeClusters(filters, appliedClusterSettings)
      .then((response) => {
        if (cancelled) return;
        setClusters(response.data);
        setClusterError(null);
      })
      .catch((unknownError: unknown) => {
        if (cancelled) return;
        setClusters([]);
        setClusterError(
          unknownError instanceof Error ? unknownError.message : "Failed to compute clusters",
        );
      })
      .finally(() => {
        if (!cancelled) setIsClusterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appliedClusterSettings, draftClusterSettings.showClusters, filters]);

  async function loadSelectedScannedFile() {
    if (!selectedScannedFile) return;
    setIsScanLoading(true);
    try {
      const set = await fetchScannedNodeSet(selectedScannedFile);
      setScannedSets((current) => [...current.filter((existing) => existing.id !== set.id), set]);
      setActiveScanIds((current) => new Set(current).add(set.id));
      setScanError(null);
    } catch (unknownError) {
      setScanError(
        unknownError instanceof Error ? unknownError.message : "Failed to load scanned nodes",
      );
    } finally {
      setIsScanLoading(false);
    }
  }

  async function loadAllScannedFiles() {
    if (availableScannedFiles.length === 0) return;
    setIsScanLoading(true);
    try {
      const sets = await fetchScannedNodeSets(availableScannedFiles);
      setScannedSets((current) => {
        const loadedIds = new Set(sets.map((set) => set.id));
        return [...current.filter((existing) => !loadedIds.has(existing.id)), ...sets];
      });
      setActiveScanIds((current) => {
        const next = new Set(current);
        for (const set of sets) next.add(set.id);
        return next;
      });
      setScanError(null);
    } catch (unknownError) {
      setScanError(
        unknownError instanceof Error ? unknownError.message : "Failed to load scanned nodes",
      );
    } finally {
      setIsScanLoading(false);
    }
  }

  async function loadLocalScannedFiles(files: FileList) {
    setIsScanLoading(true);
    try {
      const sets = await Promise.all(Array.from(files).map(readScannedNodeSetFromFile));
      setScannedSets((current) => {
        const next = current.filter((existing) => !sets.some((set) => set.id === existing.id));
        return [...next, ...sets];
      });
      setActiveScanIds((current) => {
        const next = new Set(current);
        for (const set of sets) next.add(set.id);
        return next;
      });
      setScanError(null);
    } catch (unknownError) {
      setScanError(
        unknownError instanceof Error ? unknownError.message : "Failed to read local scan file",
      );
    } finally {
      setIsScanLoading(false);
    }
  }

  const resources = useMemo(
    () => Array.from(new Set(nodes.map((node) => node.resource))).sort(),
    [nodes],
  );

  const territoryNames = useMemo(() => territories.map((territory) => territory.name).sort(), [territories]);

  const nodesWithCurrentClusterIds = useMemo(() => {
    const clusterIdsByNodeIndex = new Map<number, number>();
    for (const cluster of clusters) {
      for (const nodeIndex of cluster.nodeIndices) {
        clusterIdsByNodeIndex.set(nodeIndex, cluster.id);
      }
    }
    return nodes.map((node, index) => ({
      ...applyResourceOverride(node, buildApiNodeDevId(node, index), resourceOverrides),
      devSource: "api" as const,
      cluster_id: clusterIdsByNodeIndex.get(index) ?? null,
    }));
  }, [clusters, nodes, resourceOverrides]);

  const editedScannedSets = useMemo(
    () =>
      scannedSets
        .filter((set) => activeScanIds.has(set.id))
        .map((set) => ({
          ...set,
          nodes: set.nodes.map((node) =>
            applyResourceOverride(node, node.devId ?? "", resourceOverrides),
          ),
        })),
    [activeScanIds, resourceOverrides, scannedSets],
  );

  const scanComparison = useMemo(
    () =>
      editedScannedSets.length > 0
        ? compareScannedNodes({
            apiNodes: nodesWithCurrentClusterIds,
            scannedSets: editedScannedSets,
            deletedApiNodeIds,
            matchRadius: scanMatchRadius,
            boundsPadding: scanBoundsPadding,
          })
        : null,
    [
      deletedApiNodeIds,
      nodesWithCurrentClusterIds,
      scanBoundsPadding,
      scanMatchRadius,
      editedScannedSets,
    ],
  );

  const nodesForMap = useMemo(() => {
    if (scanComparison) return scanComparison.nodesForMap;
    return nodesWithCurrentClusterIds.filter(
      (node) => !node.devId || !deletedApiNodeIds.has(node.devId),
    );
  }, [deletedApiNodeIds, nodesWithCurrentClusterIds, scanComparison]);

  const scanSummary = scanComparison?.summary ?? EMPTY_SCAN_SUMMARY;
  const isScanComparisonActive = editedScannedSets.length > 0;

  const displayResources = useMemo(
    () => Array.from(new Set(nodesForMap.map((node) => node.resource))).sort(),
    [nodesForMap],
  );

  const editableResources = useMemo(
    () =>
      Array.from(
        new Set([...SPECIAL_EDIT_RESOURCES, ...resources, ...displayResources].map(normalizeResource)),
      ).sort(),
    [displayResources, resources],
  );

  const scannedFocusNodes = useMemo(
    () => editedScannedSets.flatMap((set) => set.nodes),
    [editedScannedSets],
  );
  const scannedFocusKey = useMemo(
    () => editedScannedSets.map((set) => `${set.id}:${set.nodes.length}`).join("|"),
    [editedScannedSets],
  );

  const visibleNodes = useMemo(
    () => filterGatheringNodes(nodesForMap, filters),
    [filters, nodesForMap],
  );

  const visibleClusters = useMemo(
    () =>
      clusters.filter((cluster) => {
        const profession = getGatheringProfession(cluster.dominantResource);
        return profession !== "UNKNOWN" && filters.professions[profession];
      }),
    [clusters, filters.professions],
  );

  const clusterAnalyses = useMemo(
    () => analyzeClusters(visibleClusters, nodesWithCurrentClusterIds, clusterScoreMode),
    [clusterScoreMode, nodesWithCurrentClusterIds, visibleClusters],
  );

  const selectedTerritoryFromFilter = useMemo(
    () => territories.find((territory) => territory.name === filters.territory) ?? selectedTerritory,
    [filters.territory, selectedTerritory, territories],
  );

  useEffect(() => {
    if (!selectedNode?.devId || !deletedApiNodeIds.has(selectedNode.devId)) return;
    setSelectedNode(null);
  }, [deletedApiNodeIds, selectedNode]);

  function deleteOutdatedApiNodes() {
    if (!scanComparison) return;
    setDeletedApiNodeIds((current) => {
      const next = new Set(current);
      for (const nodeId of scanComparison.outdatedApiNodeIds) {
        next.add(nodeId);
      }
      return next;
    });
    setSelectedNode(null);
  }

  function deleteSelectedNode() {
    if (
      !selectedNode?.devId ||
      selectedNode.devSource !== "api" ||
      selectedNode.devComparisonStatus !== "outdated"
    ) {
      return;
    }
    const nodeId = selectedNode.devId;
    setDeletedApiNodeIds((current) => new Set(current).add(nodeId));
    setSelectedNode(null);
  }

  function handleBrushNodes(brushedNodes: GatheringNode[]) {
    const nodeIds = brushedNodes.map((node) => node.devId).filter((id): id is string => Boolean(id));
    if (nodeIds.length === 0) return;

    if (brushMode === "remove") {
      setDeletedApiNodeIds((current) => {
        const next = new Set(current);
        for (const nodeId of nodeIds) next.add(nodeId);
        return next;
      });
      setSelectedNode(null);
      return;
    }

    if (brushMode === "assign") {
      const nextResource = normalizeResource(brushResource);
      if (!nextResource) return;
      setResourceOverrides((current) => {
        const next = new Map(current);
        for (const nodeId of nodeIds) next.set(nodeId, nextResource);
        return next;
      });
      setSelectedNode(null);
    }
  }

  function toggleScan(scanId: string) {
    setActiveScanIds((current) => {
      const next = new Set(current);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
    setSelectedNode(null);
  }

  async function exportEditedNodes() {
    setIsExporting(true);
    try {
      const response = await exportEditedGatheringNodes(buildEditedExportNodes());
      setExportMessage(
        `Exported ${response.count.toLocaleString()} nodes to ${response.path}`,
      );
      setExportError(null);
    } catch (unknownError) {
      setExportMessage(null);
      setExportError(
        unknownError instanceof Error ? unknownError.message : "Failed to export edited nodes",
      );
    } finally {
      setIsExporting(false);
    }
  }

  function buildEditedExportNodes(): GatheringNode[] {
    const apiNodes = nodesWithCurrentClusterIds.filter(
      (node) => !node.devId || !deletedApiNodeIds.has(node.devId),
    );
    const scannedNodes = scanComparison?.newScannedNodes ?? [];
    return dedupeNodes([...apiNodes, ...scannedNodes]);
  }

  return (
    <main className="app-layout">
      <section className="map-panel">
        <MapCanvas
          nodes={visibleNodes}
          territories={territories}
          clusters={visibleClusters}
          selectedNode={selectedNode}
          selectedTerritory={selectedTerritoryFromFilter}
          selectedCluster={selectedCluster}
          showTerritories={draftClusterSettings.showTerritories}
          showClusters={draftClusterSettings.showClusters && !isScanComparisonActive}
          focusNodes={scannedFocusNodes}
          focusKey={scannedFocusKey}
          editBrush={{
            mode: brushMode,
            radius: brushRadius,
            resource: normalizeResource(brushResource),
          }}
          onSelectNode={setSelectedNode}
          onSelectTerritory={setSelectedTerritory}
          onSelectCluster={setSelectedCluster}
          onBrushNodes={handleBrushNodes}
          debugEnabled={debugEnabled}
          onDebugChange={setDebug}
        />
        <div className="status-strip">
          {isLoading ? <span>Loading nodes...</span> : null}
          {error ? <span className="status-error">{error}</span> : null}
          {meta ? (
            <span>
              Source: {meta.source} · {meta.cached ? "cached" : "fresh"} · fetched{" "}
              {new Date(meta.fetchedAt).toLocaleString()}
              {meta.warning ? ` · ${meta.warning}` : ""}
            </span>
          ) : null}
        </div>
      </section>

      <section className="side-panel">
        <GatheringNodeFilterPanel
          filters={filters}
          resources={isScanComparisonActive ? displayResources : resources}
          territories={territoryNames}
          visibleCount={visibleNodes.length}
          totalCount={nodesForMap.length}
          onChange={(nextFilters) => {
            setFilters(nextFilters);
            setSelectedNode(null);
            setSelectedCluster(null);
            setSelectedTerritory(null);
          }}
        />
        <ScannedNodeDevPanel
          availableFiles={availableScannedFiles}
          editableResources={editableResources}
          loadedSets={scannedSets}
          activeScanIds={activeScanIds}
          selectedFileName={selectedScannedFile}
          matchRadius={scanMatchRadius}
          boundsPadding={scanBoundsPadding}
          brushMode={brushMode}
          brushResource={brushResource}
          brushRadius={brushRadius}
          isLoading={isScanLoading}
          isExporting={isExporting}
          error={scanError}
          exportMessage={exportMessage}
          exportError={exportError}
          summary={scanSummary}
          deletedNodeCount={deletedApiNodeIds.size}
          reassignedNodeCount={resourceOverrides.size}
          selectedNode={selectedNode}
          onSelectedFileNameChange={setSelectedScannedFile}
          onLoadSelectedFile={loadSelectedScannedFile}
          onLoadAllFiles={loadAllScannedFiles}
          onToggleScan={toggleScan}
          onLoadLocalFiles={loadLocalScannedFiles}
          onMatchRadiusChange={(radius) => setScanMatchRadius(Math.max(1, radius || 1))}
          onBoundsPaddingChange={(padding) => setScanBoundsPadding(Math.max(0, padding || 0))}
          onBrushModeChange={setBrushMode}
          onBrushResourceChange={(resource) => setBrushResource(normalizeResource(resource))}
          onBrushRadiusChange={(radius) => setBrushRadius(Math.max(4, Math.min(64, radius || 4)))}
          onDeleteOutdated={deleteOutdatedApiNodes}
          onDeleteSelected={deleteSelectedNode}
          onRestoreDeleted={() => setDeletedApiNodeIds(new Set())}
          onClearReassignments={() => setResourceOverrides(new Map())}
          onExportEditedNodes={exportEditedNodes}
          onClearScans={() => {
            setScannedSets([]);
            setActiveScanIds(new Set());
            setSelectedNode(null);
          }}
        />
        <ClusterResultsPanel
          analyses={clusterAnalyses}
          selectedClusterId={selectedCluster?.id ?? null}
          showClusters={draftClusterSettings.showClusters}
          showTerritories={draftClusterSettings.showTerritories}
          scoreMode={clusterScoreMode}
          isLoading={isClusterLoading}
          error={clusterError}
          isStaticData={USE_STATIC_DATA}
          onShowClustersChange={(showClusters) =>
            setDraftClusterSettings((current) => ({ ...current, showClusters }))
          }
          onShowTerritoriesChange={(showTerritories) =>
            setDraftClusterSettings((current) => ({ ...current, showTerritories }))
          }
          onScoreModeChange={setClusterScoreMode}
          onSelectCluster={(clusterId) => {
            setSelectedCluster(visibleClusters.find((cluster) => cluster.id === clusterId) ?? null);
            setSelectedNode(null);
            setSelectedTerritory(null);
          }}
          onOpenLiveControls={USE_STATIC_DATA ? null : () => setShowLiveClusterControls((show) => !show)}
        />
        {!USE_STATIC_DATA && showLiveClusterControls ? (
          <LiveClusterControls
            draftSettings={draftClusterSettings}
            appliedSettings={appliedClusterSettings}
            onDraftChange={setDraftClusterSettings}
            onApply={() => setAppliedClusterSettings(draftClusterSettings)}
          />
        ) : null}
        <DebugCoordinatePanel
          enabled={debugEnabled}
          debug={debug}
          onToggle={setDebugEnabled}
        />
      </section>
    </main>
  );
}

function normalizeResource(resource: string): string {
  return resource.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function applyResourceOverride(
  node: GatheringNode,
  nodeId: string,
  resourceOverrides: Map<string, string>,
): GatheringNode {
  const resourceOverride = resourceOverrides.get(nodeId);
  if (!resourceOverride) {
    return {
      ...node,
      devId: nodeId || node.devId,
    };
  }

  return {
    ...node,
    devId: nodeId || node.devId,
    devOriginalResource: node.devOriginalResource ?? node.resource,
    devEdited: true,
    resource: resourceOverride,
  };
}

function dedupeNodes(nodes: GatheringNode[]): GatheringNode[] {
  const nodesByKey = new Map<string, GatheringNode>();
  for (const node of nodes) {
    nodesByKey.set(
      `${node.x}:${node.y}:${node.z}:${node.angle}:${node.type}:${node.resource}:${node.level}`,
      node,
    );
  }
  return Array.from(nodesByKey.values());
}
