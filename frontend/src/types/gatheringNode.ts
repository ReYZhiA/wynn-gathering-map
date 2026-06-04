export type GatheringNodeType = "NODE" | "WALL" | "CORNER";
export type GatheringProfession = "FARMING" | "FISHING" | "MINING" | "WOODCUTTING" | "UNKNOWN";

export type GatheringNode = {
  x: number;
  y: number;
  z: number;
  angle: number;
  type: GatheringNodeType;
  resource: string;
  level: number;
  territory: string | null;
  cluster_id: number | null;
  devId?: string;
  devSource?: "api" | "scan";
  devScanSource?: string;
  devComparisonStatus?: "base" | "matched" | "new" | "outdated";
  devMatchDistance?: number | null;
  devOriginalResource?: string;
  devEdited?: boolean;
};

export type GatheringNodesResponse = {
  data: GatheringNode[];
  meta: {
    source: "wynncraft" | "edited";
    cached: boolean;
    count: number;
    cacheTtlSeconds: number;
    fetchedAt: string;
    warning?: string | null;
  };
};

export type GatheringNodeFilters = {
  resourceQuery: string;
  minLevel: number | "";
  maxLevel: number | "";
  territory: string;
  onlyInTerritory: boolean;
  professions: Record<Exclude<GatheringProfession, "UNKNOWN">, boolean>;
};
