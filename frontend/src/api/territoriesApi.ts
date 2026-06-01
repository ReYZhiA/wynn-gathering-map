import type { TerritoriesResponse } from "../types/territory";
import { API_BASE_URL, staticDataUrl, USE_STATIC_DATA } from "./config";

export async function fetchTerritories(): Promise<TerritoriesResponse> {
  if (USE_STATIC_DATA) {
    const response = await fetch(staticDataUrl("territories.json"));
    if (!response.ok) {
      throw new Error(`Failed to fetch static territories: ${response.status}`);
    }
    return response.json() as Promise<TerritoriesResponse>;
  }

  const response = await fetch(`${API_BASE_URL}/api/territories`);
  if (!response.ok) {
    throw new Error(`Failed to fetch territories: ${response.status}`);
  }
  return response.json() as Promise<TerritoriesResponse>;
}
