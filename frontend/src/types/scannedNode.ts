import type { GatheringNode } from "./gatheringNode";

export type ScannedNodeSet = {
  id: string;
  label: string;
  nodes: GatheringNode[];
};

export type ScannedNodeComparisonSummary = {
  scannedCount: number;
  scannedNewCount: number;
  scannedMatchedCount: number;
  apiMatchedCount: number;
  apiOutdatedCount: number;
  remainingApiOutdatedCount: number;
  deletedApiOutdatedCount: number;
};
