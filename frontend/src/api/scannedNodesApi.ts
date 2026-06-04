import type { GatheringNode } from "../types/gatheringNode";
import type { ScannedNodeSet } from "../types/scannedNode";
import { getGatheringProfession } from "../map/resourceStyles";
import { API_BASE_URL, staticDataUrl } from "./config";

const FALLBACK_SCANNED_NODE_FILES = [
  "eastern_fruma.json",
  "heather_gitephe.json",
  "new_cinnabar.json",
  "soosu.json",
];

type ScannedNodeIndex = {
  files?: string[];
};

export async function fetchScannedNodeFileNames(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dev/scanned-nodes`);
    if (response.ok) {
      const payload = await readJsonResponse<ScannedNodeIndex>(
        response,
        "Backend scanned-node file list",
      );
      const files = normalizeScannedNodeFileNames(payload.files);
      if (files.length > 0) return files;
    }
  } catch {
    // Static deployments cannot list public directories; fall back to the checked-in manifest.
  }

  try {
    const response = await fetch(staticDataUrl("scanned_nodes/index.json"));
    if (!response.ok) return FALLBACK_SCANNED_NODE_FILES;
    const payload = await readJsonResponse<ScannedNodeIndex>(
      response,
      "Static scanned-node manifest",
    );
    const files = normalizeScannedNodeFileNames(payload.files);
    return files.length > 0 ? files : FALLBACK_SCANNED_NODE_FILES;
  } catch {
    return FALLBACK_SCANNED_NODE_FILES;
  }
}

export async function fetchScannedNodeSet(fileName: string): Promise<ScannedNodeSet> {
  const response = await fetch(staticDataUrl(`scanned_nodes/${fileName}`));
  if (!response.ok) {
    throw new Error(`Failed to fetch scanned nodes from ${fileName}: ${response.status}`);
  }
  const payload = await readJsonResponse<unknown>(response, fileName);
  return {
    id: fileName,
    label: fileName,
    nodes: normalizeScannedNodes(payload, fileName),
  };
}

export async function fetchScannedNodeSets(fileNames: string[]): Promise<ScannedNodeSet[]> {
  return Promise.all(fileNames.map(fetchScannedNodeSet));
}

export async function readScannedNodeSetFromFile(file: File): Promise<ScannedNodeSet> {
  const payload = JSON.parse(await file.text());
  return {
    id: `local:${file.name}:${file.lastModified}`,
    label: file.name,
    nodes: normalizeScannedNodes(payload, file.name),
  };
}

function normalizeScannedNodes(payload: unknown, sourceLabel: string): GatheringNode[] {
  if (!Array.isArray(payload)) {
    throw new Error(`${sourceLabel} must contain a JSON array of scanned nodes`);
  }

  return payload.flatMap((rawNode, index) => {
    if (!isRawScannedNode(rawNode)) {
      throw new Error(`${sourceLabel} has an invalid node at index ${index}`);
    }

    const resource = normalizeResource(rawNode.resource);
    if (getGatheringProfession(resource) === "WOODCUTTING") return [];

    return [
      {
        x: rawNode.x,
        y: rawNode.y,
        z: rawNode.z,
        angle: rawNode.angle,
        type: rawNode.type,
        resource,
        level: rawNode.level,
        territory: null,
        cluster_id: null,
        devId: `scan:${sourceLabel}:${index}:${rawNode.x}:${rawNode.y}:${rawNode.z}:${resource}`,
        devSource: "scan",
        devScanSource: sourceLabel,
        devComparisonStatus: "new",
        devMatchDistance: null,
      },
    ];
  });
}

function normalizeResource(resource: string): string {
  return resource.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeScannedNodeFileNames(files: string[] | undefined): string[] {
  return Array.from(
    new Set((files ?? []).filter((file) => file.endsWith(".json") && file !== "index.json")),
  ).sort();
}

async function readJsonResponse<T>(response: Response, label: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    throw new Error(`${label} did not return JSON. Check that the scan file exists and the backend/dev server was restarted.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

function isRawScannedNode(value: unknown): value is Omit<GatheringNode, "territory" | "cluster_id"> {
  if (!value || typeof value !== "object") return false;
  const node = value as Partial<GatheringNode>;
  return (
    typeof node.x === "number" &&
    typeof node.y === "number" &&
    typeof node.z === "number" &&
    typeof node.angle === "number" &&
    typeof node.resource === "string" &&
    typeof node.level === "number" &&
    (node.type === "NODE" || node.type === "WALL" || node.type === "CORNER")
  );
}
