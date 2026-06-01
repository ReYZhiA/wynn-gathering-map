export type TerritoryBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type Territory = {
  name: string;
  resources: Record<string, number>;
  tradingRoutes: string[];
  bounds: TerritoryBounds;
  guild?: {
    uuid: string;
    name: string;
    prefix: string;
  } | null;
  acquired?: string | null;
};

export type TerritoriesResponse = {
  data: Territory[];
  meta: {
    count: number;
  };
};
