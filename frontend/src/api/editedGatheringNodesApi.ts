import type { GatheringNode } from "../types/gatheringNode";
import { API_BASE_URL } from "./config";

export type EditedGatheringNodesExportResponse = {
  path: string;
  count: number;
  writtenAt: string;
};

export async function exportEditedGatheringNodes(
  nodes: GatheringNode[],
): Promise<EditedGatheringNodesExportResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/dev/gathering-nodes/export-edited`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: nodes.map(stripDevFields),
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach backend export endpoint at ${API_BASE_URL}. Restart npm run dev and check that the backend process is running. ${
        error instanceof Error ? error.message : ""
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to export edited gathering nodes: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    throw new Error("Export endpoint did not return JSON. Restart the backend so the dev export route is available.");
  }

  return JSON.parse(text) as EditedGatheringNodesExportResponse;
}

function stripDevFields(node: GatheringNode): GatheringNode {
  return {
    x: node.x,
    y: node.y,
    z: node.z,
    angle: node.angle,
    type: node.type,
    resource: node.resource,
    level: node.level,
    territory: node.territory,
    cluster_id: node.cluster_id,
  };
}
