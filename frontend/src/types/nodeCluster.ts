export type ClusterOutlinePoint = {
  x: number;
  z: number;
};

export type NodeCluster = {
  id: number;
  resource: string | null;
  territory: string | null;
  nodeCount: number;
  levelMin: number;
  levelMax: number;
  dominantResource: string;
  outline: ClusterOutlinePoint[];
  nodeIndices: number[];
};

export type NodeClustersResponse = {
  data: NodeCluster[];
  meta: {
    count: number;
    eps: number;
    minSamples: number;
    byResource: boolean;
    byTerritory: boolean;
    mode: ClusterMode;
  };
};

export type ClusterMode = "connected" | "dbscan";

export type ClusterSettings = {
  showTerritories: boolean;
  showClusters: boolean;
  eps: number;
  minSamples: number;
  byResource: boolean;
  byTerritory: boolean;
  mode: ClusterMode;
};
