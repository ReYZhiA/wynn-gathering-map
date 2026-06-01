import { useEffect, useMemo, useState } from "react";

import { fetchGatheringNodes } from "./api/gatheringNodesApi";
import { fetchNodeClusters } from "./api/nodeClustersApi";
import { fetchTerritories } from "./api/territoriesApi";
import { USE_STATIC_DATA } from "./api/config";
import { ClusterResultsPanel, LiveClusterControls } from "./components/ClusterResultsPanel";
import { DebugCoordinatePanel } from "./components/DebugCoordinatePanel";
import {
  DEFAULT_FILTERS,
  filterGatheringNodes,
  GatheringNodeFilterPanel,
} from "./components/GatheringNodeFilterPanel";
import { MapCanvas, type DebugCoordinateState } from "./map/MapCanvas";
import { analyzeClusters } from "./map/clusterAnalysis";
import { getGatheringProfession } from "./map/resourceStyles";
import type { GatheringNode, GatheringNodeFilters, GatheringNodesResponse } from "./types/gatheringNode";
import type { ClusterSettings, NodeCluster } from "./types/nodeCluster";
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
      ...node,
      cluster_id: clusterIdsByNodeIndex.get(index) ?? null,
    }));
  }, [clusters, nodes]);

  const visibleNodes = useMemo(
    () => filterGatheringNodes(nodesWithCurrentClusterIds, filters),
    [filters, nodesWithCurrentClusterIds],
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
    () => analyzeClusters(visibleClusters, nodesWithCurrentClusterIds),
    [nodesWithCurrentClusterIds, visibleClusters],
  );

  const selectedTerritoryFromFilter = useMemo(
    () => territories.find((territory) => territory.name === filters.territory) ?? selectedTerritory,
    [filters.territory, selectedTerritory, territories],
  );

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
          showClusters={draftClusterSettings.showClusters}
          onSelectNode={setSelectedNode}
          onSelectTerritory={setSelectedTerritory}
          onSelectCluster={setSelectedCluster}
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
          resources={resources}
          territories={territoryNames}
          visibleCount={visibleNodes.length}
          totalCount={nodes.length}
          onChange={(nextFilters) => {
            setFilters(nextFilters);
            setSelectedNode(null);
            setSelectedCluster(null);
            setSelectedTerritory(null);
          }}
        />
        <ClusterResultsPanel
          analyses={clusterAnalyses}
          selectedClusterId={selectedCluster?.id ?? null}
          showClusters={draftClusterSettings.showClusters}
          showTerritories={draftClusterSettings.showTerritories}
          isLoading={isClusterLoading}
          error={clusterError}
          isStaticData={USE_STATIC_DATA}
          onShowClustersChange={(showClusters) =>
            setDraftClusterSettings((current) => ({ ...current, showClusters }))
          }
          onShowTerritoriesChange={(showTerritories) =>
            setDraftClusterSettings((current) => ({ ...current, showTerritories }))
          }
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
